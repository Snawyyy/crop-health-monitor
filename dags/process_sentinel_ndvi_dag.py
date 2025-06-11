# /dags/process_sentinel_ndvi_dag.py

from __future__ import annotations
import pendulum
from airflow.models.dag import DAG
from airflow.operators.bash import BashOperator

# These paths are inside the Airflow containers, as defined by the
# volume mounts in your docker-compose.yml file.
PROCESSING_DIR = "/opt/airflow/processing_output"
SCRIPTS_DIR = "/opt/airflow/dags/pipeline_tasks"

with DAG(
    dag_id="sentinel_ndvi_processing_pipeline",
    description="A pipeline to find Sentinel-2 data, calculate NDVI on GPU, and create a COG.",
    start_date=pendulum.datetime(2025, 6, 7, tz="Asia/Jerusalem"),
    schedule=None,      # This DAG is manually triggered, not on a schedule.
    catchup=False,      # Prevents back-filling DAG runs for past dates.
    tags=["geospatial", "ndvi", "sentinel", "gpu"],
) as dag:
    
    # Task 0: A utility task to ensure the output directory exists.
    # This makes the pipeline self-contained and idempotent.
    make_processing_dir = BashOperator(
        task_id="make_processing_directory",
        bash_command=f"mkdir -p {PROCESSING_DIR}"
    )

    # Task 1: Run the first script to find the latest Sentinel-2 data.
    # It will save a JSON file with band HREFs inside PROCESSING_DIR
    # and print its filename to stdout, which Airflow captures in XComs.
    find_latest_data = BashOperator(
        task_id="find_latest_sentinel_data",
        bash_command=(
            # We change into the processing directory first, so all files are created there.
            f"cd {PROCESSING_DIR} && "
            f"python3 {SCRIPTS_DIR}/get_latest_sentinel_data.py"
        )
    )

    # Task 2: Run the second script to calculate NDVI.
    # It takes the JSON filename from the previous task as a command-line argument.
    calculate_ndvi = BashOperator(
        task_id='calculate_ndvi_from_bands',
        bash_command=(
            f"cd {PROCESSING_DIR} && "
            f"python3 {SCRIPTS_DIR}/calculate_ndvi_from_bands.py "
            # This Jinja template pulls the return value (the JSON filename) from the upstream task.
            "{{ ti.xcom_pull(task_ids='find_latest_sentinel_data') }}"
        ),
    )

    # Task 3: Run the third script to convert the GeoTIFF to a COG.
    # It takes the GeoTIFF filename from the 'calculate_ndvi' task as input.
    create_cog = BashOperator(
        task_id="convert_geotiff_to_cog",
        bash_command=(
            f"cd {PROCESSING_DIR} && "
            f"python3 {SCRIPTS_DIR}/create_cog.py "
            # This pulls the GeoTIFF filename from the previous task's XCom.
            "{{ ti.xcom_pull(task_ids='calculate_ndvi_from_bands') }}"
        )
    )
 
    # Define the dependency chain for the tasks.
    # This tells Airflow to run them in this specific order.
    make_processing_dir >> find_latest_data >> calculate_ndvi >> create_cog