# create_cog.py
import rasterio
from rasterio.enums import Resampling
import os
import argparse

def convert_to_cog(input_geotiff_path, output_cog_path, 
                   blocksize=512, compress_method='ZSTD', 
                   overview_levels=None, 
                   overview_resampling_method=Resampling.average):
    """
    Converts a standard GeoTIFF to a Cloud Optimized GeoTIFF (COG).
    Returns the output path on success, None on failure.
    """
    if not os.path.exists(input_geotiff_path):
        print(f"ERROR: Input file not found: {input_geotiff_path}")
        return None

    if overview_levels is None:
        overview_levels = [2, 4, 8, 16, 32]

    print(f"Starting COG conversion for: {input_geotiff_path}")
    print(f"  Output COG will be: {output_cog_path}")
    print(f"  Options: blocksize={blocksize}, compression={compress_method}, overview_levels={overview_levels}")

    try:
        output_dir = os.path.dirname(output_cog_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            
        with rasterio.open(input_geotiff_path, 'r') as src:
            profile = src.profile.copy()
            profile.update({
                'driver': 'GTiff',
                'tiled': True,
                'blockxsize': blocksize,
                'blockysize': blocksize,
                'compress': compress_method,
                'copy_src_overviews': False 
            })
            
            print(f"  Writing initial COG structure...")
            with rasterio.open(output_cog_path, 'w', **profile) as dst:
                for i in range(1, src.count + 1):
                    dst.write(src.read(i), i)
            print(f"  Initial COG structure written to {output_cog_path}")

        print(f"  Building overviews (resampling: {overview_resampling_method.name})...")
        with rasterio.open(output_cog_path, 'r+') as dst_cog:
            dst_cog.build_overviews(overview_levels, overview_resampling_method)
        
        print(f"  SUCCESS: Overviews built. {output_cog_path} is now a COG.")
        return output_cog_path

    except Exception as e:
        print(f"ERROR during COG conversion: {e}")
        return None

def run_cog_conversion(input_geotiff_path: str):
    """Main function to run COG conversion, callable by Airflow."""
    if not input_geotiff_path or not os.path.exists(input_geotiff_path):
        print(f"ERROR: Invalid or non-existent input file provided: '{input_geotiff_path}'")
        return None

    abs_input_file_path = os.path.abspath(input_geotiff_path)
    input_dir = os.path.dirname(abs_input_file_path)
    input_basename = os.path.basename(abs_input_file_path)
    input_filename_stem, input_ext = os.path.splitext(input_basename)
    
    output_cog_basename = f"{input_filename_stem}_cog{input_ext}"
    final_output_cog_path = os.path.join(input_dir, output_cog_basename)

    print("--- COG Conversion Script ---")
    print(f"Input GeoTIFF: {abs_input_file_path}")
    print(f"Target Output COG: {final_output_cog_path}")

    # The return value will be the path string from convert_to_cog
    return convert_to_cog(abs_input_file_path, final_output_cog_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert a GeoTIFF to a Cloud Optimized GeoTIFF (COG).")
    parser.add_argument("input_file", help="Path to the input GeoTIFF file.")
    
    args = parser.parse_args()
    
    result_path = run_cog_conversion(args.input_file)
    if result_path:
        print(f"\n--- Script Finished Successfully ---")
        print(f"Output file: {result_path}")
        print(f"You can validate it with 'rio cogeo validate \"{result_path}\"'")
    else:
        print("\n--- Script Finished with Errors ---")