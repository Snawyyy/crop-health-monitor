#!/bin/bash

# ==============================================================================
# SCRIPT CONFIGURATION
# This script assumes it is located in your project's root directory.
# ==============================================================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

FASTAPI_BACKEND_DIR="${SCRIPT_DIR}/backend"
REACT_FRONTEND_DIR="${SCRIPT_DIR}/frontend"
TITILER_COG_DATA_DIR="${SCRIPT_DIR}/data"
# ==============================================================================

TITILER_CONTAINER_NAME="titiler_server"
TERMINAL_APP="xfce4-terminal" # Your specified terminal

# --- Function to start Titiler ---
start_titiler() {
    echo "INFO: Checking Titiler container: $TITILER_CONTAINER_NAME..."
    if [ "$(docker ps -q -f name=$TITILER_CONTAINER_NAME)" ]; then
        echo "INFO: Titiler container '$TITILER_CONTAINER_NAME' is already running."
    elif [ "$(docker ps -aq -f status=exited -f name=$TITILER_CONTAINER_NAME)" ]; then
        echo "INFO: Restarting exited Titiler container '$TITILER_CONTAINER_NAME'..."
        docker start $TITILER_CONTAINER_NAME
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to restart Titiler container. Please check Docker."
            return 1 # Indicate failure
        fi
    else
        echo "INFO: Starting new Titiler container '$TITILER_CONTAINER_NAME'..."
        echo "INFO: Using COG data directory: $TITILER_COG_DATA_DIR"
        if [ ! -d "$TITILER_COG_DATA_DIR" ]; then
            echo "ERROR: Titiler COG data directory not found: $TITILER_COG_DATA_DIR"
            echo "ERROR: Cannot start new Titiler container."
            return 1 # Indicate failure
        fi
        # Docker requires absolute paths for volume mounts, which SCRIPT_DIR provides.
        docker run -d --name $TITILER_CONTAINER_NAME -p 8001:80 \
                   -v "$TITILER_COG_DATA_DIR":/data \
                   ghcr.io/developmentseed/titiler:latest
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to start new Titiler container. Please check Docker."
            return 1 # Indicate failure
        fi
    fi
    echo "INFO: Allowing a few seconds for Titiler to initialize..."
    sleep 5 # Give Titiler a moment to start up
    return 0 # Indicate success
}

# --- Function to start FastAPI Backend ---
start_fastapi_backend() {
    echo "INFO: Starting FastAPI backend in a new terminal tab..."
    if [ ! -d "$FASTAPI_BACKEND_DIR" ]; then
        echo "ERROR: FastAPI backend directory not found: $FASTAPI_BACKEND_DIR"
        return 1
    fi
    if [ ! -f "$FASTAPI_BACKEND_DIR/.venv/bin/activate" ]; then
        echo "ERROR: Virtual environment not found in $FASTAPI_BACKEND_DIR/.venv/"
        return 1
    fi

    "$TERMINAL_APP" --tab --title="FastAPI Backend" \
                   --working-directory="$FASTAPI_BACKEND_DIR" \
                   --command="bash -c \"echo '--- FastAPI Backend Terminal (Port 8000) ---'; \
                                     echo 'Activating virtual environment...'; \
                                     source .venv/bin/activate; \
                                     echo 'Starting Uvicorn...'; \
                                     uvicorn main:app --reload --port 8000; \
                                     echo 'Uvicorn exited. Press Ctrl+D or type exit to close.'; \
                                     exec bash\"" &
    return 0
}

# --- Function to start React Frontend ---
start_react_frontend() {
    echo "INFO: Starting React frontend in a new terminal tab..."
    if [ ! -d "$REACT_FRONTEND_DIR" ]; then
        echo "ERROR: React frontend directory not found: $REACT_FRONTEND_DIR"
        return 1
    fi

    "$TERMINAL_APP" --tab --title="React Frontend" \
                   --working-directory="$REACT_FRONTEND_DIR" \
                   --command="bash -c \"echo '--- React Frontend Terminal (Port 5173 or similar) ---'; \
                                         echo 'Running yarn dev...'; \
                                         yarn dev; \
                                         echo 'React Dev Server exited. Press Ctrl+D or type exit to close.'; \
                                         exec bash\"" &
    return 0
}

# --- Main Script Execution ---
echo "INFO: Launching GIS Dashboard services..."
echo "----------------------------------------"

if ! start_titiler; then
    echo "CRITICAL: Titiler service failed to start. Aborting."
    exit 1
fi
echo "INFO: Titiler check/start complete."
echo "----------------------------------------"
sleep 2 # Small delay before launching next terminal

if ! start_fastapi_backend; then
    echo "CRITICAL: FastAPI backend failed to launch. Check errors above."
    # Decide if you want to exit or continue with React
fi
echo "INFO: FastAPI backend launch command issued."
echo "----------------------------------------"
sleep 2 # Small delay

if ! start_react_frontend; then
    echo "CRITICAL: React frontend failed to launch. Check errors above."
fi
echo "INFO: React frontend launch command issued."
echo "----------------------------------------"
echo ""
echo "INFO: Startup script finished. Check the new terminal tabs for service logs."
echo "INFO: To stop services, you will need to close each terminal tab or stop the processes (e.g., Ctrl+C) within them."

exit 0