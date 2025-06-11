import os
import json
from datetime import datetime, timedelta, timezone
from pystac_client import Client

def define_and_open_client():
    """Connects to the STAC API catalog."""
    catalog_url = "https://earth-search.aws.element84.com/v1/"
    try:
        client = Client.open(catalog_url)
        print(f"Connected to: {client.title if client and client.title else 'Unknown STAC API'}")
        return client
    except Exception as e:
        print(f"ERROR: Error connecting to STAC API: {e}")
        return None

def search_stac_for_latest(client, collections, bbox):
    """Searches for the most recent item in the last 30 days."""
    if not client:
        return None
        
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)
    datetime_range = f"{start_date.isoformat()}/{end_date.isoformat()}"
    
    print(f"\nSearching for items in date range: {datetime_range}")
    
    try:
        search = client.search(
            collections=collections,
            bbox=bbox,
            datetime=datetime_range,
            sortby=[{"field": "properties.datetime", "direction": "desc"}], 
            limit=10 
        )
        
        items_collection = search.item_collection()
        print(f"Found {len(items_collection)} items in the date range.")
        
        if len(items_collection) == 0:
            return None
        
        latest_item = items_collection[0]
        return latest_item
        
    except Exception as e:
        print(f"ERROR: Error during STAC search: {e}")
        return None

def get_and_save_band_hrefs(stac_item):
    """Extracts HREFs for Red/NIR/SCL bands and saves them to a JSON file."""
    print(f"\nProcessing Item ID: {stac_item.id}")
    print(f"Acquired on: {stac_item.datetime}")

    red_asset_href = None
    nir_asset_href = None
    scl_asset_href = None # For the Scene Classification Layer (cloud mask)

    # Get Red band HREF
    if 'red' in stac_item.assets:
        red_asset_href = stac_item.assets['red'].href
    elif 'B04' in stac_item.assets:
        red_asset_href = stac_item.assets['B04'].href
    
    # Get NIR band HREF
    if 'nir' in stac_item.assets:
        nir_asset_href = stac_item.assets['nir'].href
    elif 'B08' in stac_item.assets:
        nir_asset_href = stac_item.assets['B08'].href


    scl_asset = stac_item.assets.get('scl') 
    if scl_asset:
        scl_asset_href = scl_asset.href

    if not (red_asset_href and nir_asset_href):
        print("\nERROR: Could not find required HREFs for Red and NIR bands.")
        return False

    print(f"Found Red band asset URL: \n{red_asset_href}")
    print(f"Found NIR band asset URL: \n{nir_asset_href}")
    if scl_asset_href:
        print(f"Found SCL (cloud mask) asset URL: \n{scl_asset_href}")
    else:
        print("Warning: SCL (cloud mask) band not found for this item.")

    # --- Save the results to a JSON file ---
    output_data = {
        'item_id': stac_item.id,
        'item_datetime': str(stac_item.datetime),
        'assets': {
            'red': red_asset_href,
            'nir': nir_asset_href,
            'scl': scl_asset_href 
        }
    }
    
    output_filename = f"{stac_item.id}_bands.json"
    try:
        with open(output_filename, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        print(f"SUCCESS: Band URLs saved to {output_filename}")
        print(output_filename) # <--- Push the filename to XComs
        return True
    except Exception as e:
        print(f"\nERROR: Failed to save band URLs to JSON file: {e}")
        return False
    

def main():
    """Main function to run the data discovery script."""
    client = define_and_open_client()
    if not client:
        return

    # Define parameters for Ashdod
    aoi_name = "Ashdod"
    bbox = [34.55, 31.75, 34.75, 31.85]
    collection_id = "sentinel-2-l2a"
    
    print(f"--- Starting data discovery for AOI: {aoi_name} ---")
    latest_item = search_stac_for_latest(client, [collection_id], bbox)
    
    if latest_item:
        get_and_save_band_hrefs(latest_item)
    else:
        print("Could not find any recent items for the given AOI.")
    
    #print("\n--- Script Finished ---")

if __name__ == "__main__":
    main()
