# Crop Health Monitor Dashboard

A full-stack web application for processing and visualizing satellite imagery with a focus on NDVI (Normalized Difference Vegetation Index) analysis for agricultural health assessment. This project demonstrates proficiency in geospatial data engineering, backend development, and modern frontend technologies.

The dashboard provides an interactive mapping interface for analyzing Cloud Optimized GeoTIFF (COG) data derived from Sentinel-2 satellite imagery.

![Dashboard Screenshot](dashboard_screenshot.jpg)

## Features

- **Interactive Map Interface**: React and Leaflet-based mapping with smooth pan and zoom capabilities
- **Dynamic Tile Rendering**: Real-time COG tile serving via Dockerized Titiler instance
- **Adaptive Legend**: Automatically updates based on selected colormap and rescale parameters
- **Multi-segment Scale Bar**: Provides accurate distance reference with dynamic map scale adjustments
- **Live Histogram**: Real-time NDVI distribution analysis for the current viewport
- **Advanced Controls**: Layer management, colormap selection, and dynamic rescale value adjustment

## Technology Stack

| Component | Technologies |
|-----------|-------------|
| **Data Source** | Sentinel-2 (AWS Open Data) |
| **Data Discovery** | STAC API, pystac-client |
| **Processing** | Python, Rasterio, NumPy, CuPy (GPU acceleration), GDAL |
| **Data Format** | Cloud Optimized GeoTIFF (COG) |
| **Tile Server** | Titiler (Docker) |
| **Backend API** | FastAPI (Python) |
| **Frontend** | React, TypeScript, Leaflet, react-leaflet, Recharts |
| **Infrastructure** | Docker, Python venv, Linux |

## Prerequisites

- Docker (latest stable version)
- Node.js (v18+) and Yarn
- Python 3.10 or higher
- Linux environment with xfce4-terminal (for the startup script)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/crop-health-monitor.git
cd crop-health-monitor
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
```

### 3. Frontend Setup

```bash
cd frontend
yarn install
cd ..
```

### 4. Launch the Application

The project includes a unified startup script that manages all services:

```bash
chmod +x start_crop_health_monitor.sh
./start_crop_health_monitor.sh
```

The script will:
- Start the Titiler Docker container for tile serving
- Launch the FastAPI backend in a new terminal tab
- Start the React development server in another tab

Access the application at `http://localhost:5173`

## Project Structure

```
crop-health-monitor/
├── backend/                     # FastAPI backend server
│   ├── .venv/                  # Python virtual environment
│   ├── app/                    # Application code
│   └── requirements.txt        # Python dependencies
├── data/                       # COG files for visualization
├── frontend/                   # React frontend application
│   ├── src/                    # Source code
│   ├── public/                 # Static assets
│   └── package.json           # Node dependencies
├── start_crop_health_monitor.sh # Development startup script
├── .gitignore
└── README.md
```

## API Endpoints

### Backend (FastAPI) - Port 8000

- `GET /health` - Health check endpoint
- `GET /api/cog/metadata` - Retrieve COG metadata
- `GET /api/cog/statistics` - Calculate statistics for current viewport

### Titiler - Port 8001

- `GET /cog/tiles/{z}/{x}/{y}` - Tile endpoint for map rendering
- `GET /cog/info` - COG information and metadata
- `GET /cog/statistics` - Band statistics

## Development Workflow

### Adding New COG Files

1. Place COG files in the `data/` directory
2. Update the backend configuration to include new file paths
3. Restart the backend service

### Modifying the Frontend

The frontend uses Vite for hot module replacement:

```bash
cd frontend
yarn dev
```

Changes will be reflected immediately in the browser.

### Backend Development

The FastAPI backend supports automatic reloading:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

## Data Processing Pipeline

The NDVI calculation pipeline processes Sentinel-2 imagery through the following steps:

1. **Data Discovery**: Query STAC API for available Sentinel-2 scenes
2. **Band Selection**: Extract NIR (B08) and Red (B04) bands
3. **NDVI Calculation**: Apply formula `(NIR - Red) / (NIR + Red)`
4. **GPU Acceleration**: Utilize CuPy for large-scale computations
5. **COG Generation**: Create Cloud Optimized GeoTIFFs for efficient web serving

Note: Processing scripts are maintained separately and will be integrated in future releases.

## Performance Considerations

- COG files enable efficient partial reads, reducing bandwidth usage
- Titiler provides dynamic tile generation with caching capabilities
- React frontend implements viewport-based data loading
- GPU acceleration reduces processing time for large raster datasets

## Troubleshooting

### Common Issues

**Docker container fails to start**
- Ensure Docker daemon is running: `sudo systemctl start docker`
- Check port availability: `sudo lsof -i :8001`

**Frontend build errors**
- Clear node modules: `rm -rf node_modules && yarn install`
- Check Node.js version compatibility

**Backend import errors**
- Verify virtual environment activation
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

## Future Enhancements

- Integration of complete data processing pipeline
- Multi-temporal analysis capabilities
- User authentication and project management
- Export functionality for analysis results
- Support for additional vegetation indices

## Contributing

Contributions are welcome. Please ensure:
- Code follows existing style conventions
- New features include appropriate tests
- Documentation is updated accordingly

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Acknowledgments

- Sentinel-2 data provided by ESA/Copernicus
- Titiler project for efficient COG tile serving
- OpenStreetMap contributors for base map data
