# calculate_ndvi_from_bands.py
import os
import json
import argparse
import rasterio
import numpy as np
import cupy as cp

def open_band_with_rasterio(band_href):
    """Opens a raster band from a URL and returns data + profile."""
    print(f"\nAttempting to open band: \n{band_href}")
    try:
        with rasterio.open(band_href) as band_src:
            band_data_np = band_src.read(1).astype(np.float32)
            profile = band_src.profile
            print(f"  Successfully opened '{band_src.name}'.")
            return band_data_np, profile
    except Exception as e:
        print(f"ERROR: Could not open band {band_href} with Rasterio: {e}")
        return None, None

def calculate_ndvi_gpu(red_band_np, nir_band_np):
    """Calculates NDVI on the GPU using CuPy."""
    if red_band_np.shape != nir_band_np.shape:
        print("ERROR: Red and NIR band shapes do not match!")
        return None

    print("\nTransferring band data to GPU and calculating NDVI...")
    try:
        red_gpu = cp.asarray(red_band_np)
        nir_gpu = cp.asarray(nir_band_np)
        print("  Data transferred to GPU.")

        # NDVI = (NIR - Red) / (NIR + Red)
        numerator_gpu = nir_gpu - red_gpu
        denominator_gpu = nir_gpu + red_gpu
        
        # Initialize NDVI array to handle division by zero
        ndvi_gpu = cp.zeros_like(numerator_gpu, dtype=cp.float32)
        
        # Create a mask for valid denominators to avoid division by zero
        valid_mask_gpu = (denominator_gpu != 0)
        
        # Calculate NDVI only where the denominator is not zero
        ndvi_gpu[valid_mask_gpu] = numerator_gpu[valid_mask_gpu] / denominator_gpu[valid_mask_gpu]
        
        # Clip values to the valid range [-1, 1]
        ndvi_gpu = cp.clip(ndvi_gpu, -1.0, 1.0)
        print("  NDVI calculation performed on GPU.")

        # Transfer the result back to the CPU
        ndvi_cpu = cp.asnumpy(ndvi_gpu)
        print("  NDVI result transferred back to CPU.")
        return ndvi_cpu
    except Exception as e:
        print(f"ERROR: Error during GPU NDVI calculation: {e}")
        return None

def save_geotiff(ndvi_array_np, profile, output_filename):
    """Saves the NDVI NumPy array as a GeoTIFF file and returns its path."""
    print(f"\nAttempting to save NDVI array as GeoTIFF: {output_filename}")
    try:
        # Update profile for a single-band Float32 output
        profile.update(dtype=rasterio.float32, count=1, driver='GTiff')

        with rasterio.open(output_filename, 'w', **profile) as dst:
            dst.write(ndvi_array_np.astype(rasterio.float32), 1)
        print(f"SUCCESS: NDVI GeoTIFF saved as {output_filename}")
        return output_filename
    except Exception as e:
        print(f"ERROR: Could not save NDVI GeoTIFF {output_filename}: {e}")
        return None

def run_ndvi_calculation(input_json_path: str):
    """Main function to run NDVI calculation, callable by Airflow."""
    print(f"--- Starting NDVI calculation from input file: {input_json_path} ---")
    
    try:
        with open(input_json_path, 'r') as f:
            band_info = json.load(f)
        red_href = band_info['assets']['red']
        nir_href = band_info['assets']['nir']
        item_id = band_info.get('item_id', 'unknown_item') 
    except Exception as e:
        print(f"ERROR: Could not read or parse input JSON file '{input_json_path}': {e}")
        return None

    red_band_np, red_profile = open_band_with_rasterio(red_href)
    if red_band_np is None: return None

    nir_band_np, _ = open_band_with_rasterio(nir_href)
    if nir_band_np is None: return None
    
    ndvi_result_np = calculate_ndvi_gpu(red_band_np, nir_band_np)

    if ndvi_result_np is not None:
        output_filename = f"ndvi_{item_id}.tif"
        # The return value will be the path string from save_geotiff
        return save_geotiff(ndvi_result_np, red_profile, output_filename)
    else:
        print("NDVI calculation failed.")
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calculate NDVI from band data specified in a JSON file.")
    parser.add_argument("input_json", help="Path to the input JSON file containing Red and NIR band HREFs.")
    args = parser.parse_args()
    
    result_path = run_ndvi_calculation(args.input_json)
    if result_path:
        print(f"\n--- Script Finished Successfully ---")
        print(result_path)
    else:
        print("\n--- Script Finished with Errors ---")