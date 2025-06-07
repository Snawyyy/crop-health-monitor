/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/LayerControlPanel.tsx
import React from "react";
import './LayerControlPanel.css';

// Define the props that this component will accept
interface LayerControlPanelProps {
  // For COG Layer Visibility Toggle
  isCogLayerVisible: boolean;
  onCogLayerToggle: () => void;

  // For Rescale Min
  minRescale: string; // The current min rescale value
  onMinRescaleChange: (event: React.ChangeEvent<HTMLInputElement>) => void; // Function to call when min rescale changes

  // For Rescale Max
  maxRescale: string; // The current max rescale value
  onMaxRescaleChange: (event: React.ChangeEvent<HTMLInputElement>) => void; // Function to call when max rescale changes

  // For Colormap Selection
  currentColormap: string; // The currently selected colormap name
  availableColormaps: string[]; // An array of available colormap names
  onColormapChange: (event: React.ChangeEvent<HTMLSelectElement>) => void; // Function to call when colormap changes
}

const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  isCogLayerVisible,
  onCogLayerToggle,
  minRescale,
  onMinRescaleChange,
  maxRescale,
  onMaxRescaleChange,
  currentColormap,
  availableColormaps,
  onColormapChange,
}) => {
  return (
    <div className="LayerControlPanel">
      <h3>Layer Controls</h3>
      <div className="CheckboxPanel">
        <input
          type="checkbox"
          id="cogLayerToggle"
          checked={isCogLayerVisible}
          onChange={onCogLayerToggle}
        />
        <label htmlFor="cogLayerToggle">Show COG Layer</label>
      </div>
      {/* COG Layer Visibility Toggle */}
      <hr /> {/* Separator */}
      <h4>COG Rendering</h4>
      {/* Colormap Select Dropdown */}
      <div>
        <label htmlFor="colormapSelect">Colormap:</label>
        <select
          id="colormapSelect"
          value={currentColormap}
          onChange={onColormapChange}
        >
          {availableColormaps.map((cmap) => (
            <option key={cmap} value={cmap}>
              {cmap}
            </option>
          ))}
        </select>
      </div>
      {/* Min Rescale Input */}
      <div>
        <label htmlFor="minRescale">Min Rescale:</label>
        <input
          type="text" // Using "text" for more flexible input, can also be "number"
          id="minRescale"
          value={minRescale}
          onChange={onMinRescaleChange}
        />
      </div>
      {/* Max Rescale Input */}
      <div>
        {" "}
        <label htmlFor="maxRescale">Max Rescale:</label>
        <input
          type="text"
          id="maxRescale"
          value={maxRescale}
          onChange={onMaxRescaleChange}
        />
      </div>
    </div>
  );
};

export default LayerControlPanel;
