// src/components/Legend.tsx
import React, { useState, useEffect } from 'react';
import './Legend.css'; // Make sure to create this CSS file

interface LegendProps {
  minRescale: string | number;
  maxRescale: string | number;
  colormapName: string; // e.g., "viridis", "viridis_r"
  titilerBaseUrl?: string;
  numberOfClasses?: number; // How many distinct items in the legend
}

interface LegendItem {
  valueRange: string; // e.g., "-0.5 – -0.2"
  color: string;      // e.g., "rgb(R,G,B)"
  label?: string;      // Optional descriptive label like "Water"
}

const Legend: React.FC<LegendProps> = ({
  minRescale,
  maxRescale,
  colormapName,
  titilerBaseUrl = 'http://localhost:8001',
  numberOfClasses = 5, // Default to 5 classes
}) => {
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    console.log("Legend received colormapName:", colormapName);
    if (!colormapName) {
        setError("Colormap name not provided to Legend component.");
        setIsLoading(false);
        setLegendItems([]);
        return;
    }

    const fetchAndProcessColormap = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${titilerBaseUrl}/colorMaps/${colormapName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch colormap '${colormapName}': ${response.status} - ${response.statusText}`);
        }
        
        const fetchedJsonData = await response.json(); // This is the object like { "0": [...], "1": [...] }
        console.log("Raw fetched JSON data from /colorMaps:", fetchedJsonData);

        let actualColorArray: number[][] = []; // Initialize as an array

        if (Array.isArray(fetchedJsonData)) {
            // If it's already an array (like for viridis_r you saw earlier)
            actualColorArray = fetchedJsonData;
        } else if (typeof fetchedJsonData === 'object' && fetchedJsonData !== null) {
            // If it's an object, convert its values into an array
            actualColorArray = Object.values(fetchedJsonData);
            console.log("Converted object to array of colors:", actualColorArray);
        } else {
            // If it's neither, then it's an unexpected format
            console.error("Fetched data is not an array or a processable object. Data:", fetchedJsonData);
            throw new Error("Fetched colormap data is in an unexpected format.");
        }

        // Now, 'actualColorArray' should be the array of [R,G,B,A] arrays
        if (actualColorArray.length === 0) { // Check if the resulting array is empty
          console.error("Color array is empty after processing. Original data:", fetchedJsonData);
          throw new Error("Processed colormap data resulted in an empty color array.");
        }
        
        // The rest of your logic uses 'actualColorArray'
        const processedItems: LegendItem[] = [];
        const minV = parseFloat(minRescale as string);
        const maxV = parseFloat(maxRescale as string);
        
        const valueRangeSpan = (maxV - minV);
        const numColorsInFullMap = actualColorArray.length; // Use length of the processed array

        if (isNaN(minV) || isNaN(maxV) || (valueRangeSpan <= 0 && numberOfClasses > 1 && numColorsInFullMap > 0) ) {
            console.warn("Invalid min/max rescale values or zero range for legend. Min:", minV, "Max:", maxV);
            setError("Invalid rescale range for legend.");
            setLegendItems([]);
            setIsLoading(false);
            return; 
        }
        
        for (let i = 0; i < numberOfClasses; i++) {
          const classStartValue = minV + (i / numberOfClasses) * valueRangeSpan;
          const classEndValue = minV + ((i + 1) / numberOfClasses) * valueRangeSpan;

          let colorIndex = 0;
          if (numberOfClasses === 1 && numColorsInFullMap > 0) {
            colorIndex = Math.floor(numColorsInFullMap / 2);
          } else if (numColorsInFullMap > 1 && numberOfClasses > 1) {
            colorIndex = Math.round((i / (numberOfClasses - 1)) * (numColorsInFullMap - 1));
          } else if (numColorsInFullMap === 1) {
            colorIndex = 0;
          }
          
          colorIndex = Math.max(0, Math.min(numColorsInFullMap - 1, colorIndex)); 
          
          const colorRgba = actualColorArray[colorIndex];

          if (!colorRgba || !Array.isArray(colorRgba) || colorRgba.length < 3) {
            console.error("Invalid color data at index", colorIndex, ":", colorRgba, "from array:", actualColorArray);
            continue; 
          }

          processedItems.push({
            valueRange: `${classStartValue.toFixed(2)} – ${classEndValue.toFixed(2)}`,
            color: `rgb(${colorRgba[0]}, ${colorRgba[1]}, ${colorRgba[2]})`,
          });
        }
        setLegendItems(processedItems);

      } catch (err) {
        console.error("Error processing legend data (inside catch):", err);
        setError(err instanceof Error ? err.message : String(err));
        setLegendItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndProcessColormap();
  }, [minRescale, maxRescale, colormapName, titilerBaseUrl, numberOfClasses]);


  if (isLoading) return <div className="legend-container legend-loading">Loading legend...</div>;
  if (error) return <div className="legend-container legend-error">Error creating legend: {error}</div>;
  if (legendItems.length === 0 && !isLoading) return <div className="legend-container legend-no-data">Legend not available.</div>;

  return (
    <div className="leaflet-control leaflet-legend legend-container">
      <h4>NDVI Legend</h4>
      {legendItems.map((item, index) => (
        <div key={index} className="legend-item">
          <i style={{ backgroundColor: item.color }}></i>
          <span>{item.valueRange}</span>
        </div>
      ))}
    </div>
  );
};

export default Legend;