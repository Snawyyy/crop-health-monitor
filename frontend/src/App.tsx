  import React, { useState, useEffect } from "react";
  import { MapContainer, TileLayer } from "react-leaflet";
  import { type LatLngExpression } from "leaflet";

  import LayerControlPanel from "./components/LayerControlPanel";
  import Header from "./components/Header";
  import Legend from './components/Legend'; 
  import CustomScaleBar from "./components/CustomScaleBar";
  import HistogramDisplay from './components/HistogramDisplay';

  import "./App.css"; //

  const App: React.FC = () => {
    const mapStyle: React.CSSProperties = {
      height: "100%",
      width: "100%",
    };

    useEffect(() => {
      const fetchApiInfo = async () => {
        try {
          const response = await fetch("http://localhost:8000/api/info");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log("Data from FastAPI backend:", data);
        } catch (error) {
          console.error("Could not fetch API info:", error);
        }
      };

      fetchApiInfo();
    }, []);

    const cogInitialCenter: LatLngExpression = [39.95, -104.95];
    const initialZoom: number = 12;

    const [isCogLayerVisible, setIsCogLayerVisible] = useState<boolean>(true);
    const [minRescale, setMinRescale] = useState<string>("0"); // Store as string for input fields
    const [maxRescale, setMaxRescale] = useState<string>("1.0");
    const [colormapName, setColormapName] = useState<string>("viridis"); // Default colormap

    const availableColormaps = ["viridis", "rdylgn", "gray", "terrain", "plasma"];
    // Handler for min rescale input change
    const handleMinRescaleChange = (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      setMinRescale(event.target.value);
    };

    // Handler for max rescale input change
    const handleMaxRescaleChange = (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      setMaxRescale(event.target.value);
    };

    // Handler for colormap select change
    const handleColormapChange = (
      event: React.ChangeEvent<HTMLSelectElement>
    ) => {
      setColormapName(event.target.value);
    };

    // Dynamically construct the Titiler COG URL based on state
    const titilerCogUrl = `http://localhost:8001/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=/data/ndvi_ashdod_20230701_cog.tif&rescale=${minRescale},${maxRescale}&colormap_name=${colormapName}`;
    const handleCogLayerToggle = () => {
      setIsCogLayerVisible(!isCogLayerVisible);
    };

    const currentCogPathForTitiler = titilerCogUrl.substring(titilerCogUrl.indexOf("url=") + 4).split("&")[0];

    return (
      <div className="App">
        {" "}
        <Header />
        <div className="MainContent">
          {" "}
          <MapContainer
            center={cogInitialCenter}
            zoom={initialZoom}
            style={mapStyle}
          >
            {/* Base Map Layer: OpenStreetMap */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {isCogLayerVisible && (
              <TileLayer
                key={titilerCogUrl}
                url={titilerCogUrl}
                attribution="My Dummy COG &copy; Eitan"
                zIndex={10}
              />
            )}
            
          <HistogramDisplay 
            cogUrlPart="/data/ndvi_ashdod_20230701_cog.tif" 
            titilerBaseUrl="http://localhost:8001" 
            histogramBins={100} 
          />

          <CustomScaleBar maxWidth={300} minWidth={200} numberOfSegments={3} /> 
          </MapContainer>

          <LayerControlPanel
            isCogLayerVisible={isCogLayerVisible}
            onCogLayerToggle={handleCogLayerToggle}
            minRescale={minRescale}
            onMinRescaleChange={handleMinRescaleChange}
            maxRescale={maxRescale}
            onMaxRescaleChange={handleMaxRescaleChange}
            currentColormap={colormapName}
            availableColormaps={availableColormaps}
            onColormapChange={handleColormapChange}
          />
          <Legend
            minRescale={minRescale}
            maxRescale={maxRescale}
            colormapName={colormapName} 
          />
        </div>
      </div>
    );
  };

  export default App;
