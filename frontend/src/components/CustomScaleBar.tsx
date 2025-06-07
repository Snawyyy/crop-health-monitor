// src/components/CustomScaleBar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface CustomScaleBarProps {
  maxWidth?: number; // Max width of the scale bar in pixels
  minWidth?: number;
  numberOfSegments?: number; // Desired number of segments
}

// Define a type for our scale information state
interface ScaleInfo {
  totalPixelWidth: number;      // Total width of the bar in pixels
  totalDistanceMeters: number; // Total real-world distance in meters
  displayUnit: 'm' | 'km';     // Unit for display
}

const CustomScaleBar: React.FC<CustomScaleBarProps> = ({ 
  maxWidth = 800, 
  minWidth = 600,
  numberOfSegments = 2
}) => {
  const map = useMap();
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo | null>(null);

  const updateScale = useCallback(() => {
    if (!map) {
      setScaleInfo(null);
      return;
    }

    const mapSize = map.getSize();
    if (mapSize.x <= 0) {
      setScaleInfo(null);
      return;
    }

    // Function to get a "nice" round number for the scale
    const getNiceRoundDistance = (roughDistanceInMeters: number): number => {
      if (roughDistanceInMeters <= 0) return 0;
      const exponent = Math.floor(Math.log10(roughDistanceInMeters));
      const powerOf10 = Math.pow(10, exponent);
      const mantissa = roughDistanceInMeters / powerOf10; // Should be between 1 and 10

      // Pick a "nice" multiplier for the powerOf10
      if (mantissa >= 5) return 5 * powerOf10;
      if (mantissa >= 2.5) return 2.5 * powerOf10; // You could use 2 or 3 here too
      if (mantissa >= 2) return 2 * powerOf10;
      if (mantissa >= 1) return 1 * powerOf10;
      // For very small numbers (less than 1m), this might need more fractional nice numbers
      // or just use the value directly if it's already small like 0.5, 0.2, 0.1
      return parseFloat(roughDistanceInMeters.toPrecision(1)); // Fallback for very small
    };

    // Calculate meters per pixel at the map's center latitude for accuracy
    const center = map.getCenter();
    const bounds = map.getBounds();
    const pointWest = L.latLng(center.lat, bounds.getWest());
    const pointEast = L.latLng(center.lat, bounds.getEast());
    const mapVisibleWidthMeters = map.distance(pointWest, pointEast);

    if (mapVisibleWidthMeters <= 0) {
      setScaleInfo(null);
      return;
    }
    const metersPerPixel = mapVisibleWidthMeters / mapSize.x;

    if (metersPerPixel <= 0) {
      setScaleInfo(null);
      return;
    }

    // Target a distance that would roughly fill the maxWidth
    const targetDistanceForMaxWidth = metersPerPixel * maxWidth; // 'maxWidth' is from props
    let roundedDistanceMeters = getNiceRoundDistance(targetDistanceForMaxWidth);
    let finalPixelWidth = roundedDistanceMeters / metersPerPixel;
    
    // If it's too short based on a minWidth (e.g. minWidth prop), try to adjust
    // This is a simple adjustment; more complex logic could iterate to find a better fit.
    const minWidthProp = minWidth;
    if (finalPixelWidth < minWidthProp && roundedDistanceMeters > 0) {
        // Try to double it, if that doesn't make it too wide
        if ((roundedDistanceMeters * 2) / metersPerPixel <= maxWidth) {
            roundedDistanceMeters *= 2; // or find next nice number
            finalPixelWidth = roundedDistanceMeters / metersPerPixel;
        }
        // If still too small, it might just be very zoomed out.
    }


    if (roundedDistanceMeters <= 0 || finalPixelWidth <=0) {
      setScaleInfo(null);
      return;
    }

    const displayUnit = roundedDistanceMeters >= 1000 ? 'km' : 'm';

    setScaleInfo({
      totalPixelWidth: finalPixelWidth,
      totalDistanceMeters: roundedDistanceMeters,
      displayUnit: displayUnit,
    });
    // console.log(`m/px: ${metersPerPixel.toFixed(2)}, targetDist: ${targetDistanceForMaxWidth.toFixed(0)}m, roundedDist: ${roundedDistanceMeters}m, pxWidth: ${finalPixelWidth.toFixed(0)}`);

  }, [map, maxWidth /*, minWidth - if minWidth becomes a prop */]);

  useEffect(() => {
    if (!map) return;
    updateScale(); // Initial calculation
    map.on('zoomend moveend', updateScale);
    return () => {
      map.off('zoomend moveend', updateScale);
    };
  }, [map, updateScale]);

  if (!scaleInfo || scaleInfo.totalPixelWidth <= 0) {
    return null;
  }

  const { totalPixelWidth, totalDistanceMeters, displayUnit } = scaleInfo;
  const segmentPixelWidth = totalPixelWidth / numberOfSegments;

  // Helper to format distance for labels
  const formatLabel = (distanceInMeters: number, unit: 'm' | 'km'): string => {
    if (unit === 'km') {
      let km = distanceInMeters / 1000;
      return km.toLocaleString(undefined, { 
        minimumFractionDigits: km < 10 && !Number.isInteger(km) ? 1 : 0, 
        maximumFractionDigits: km < 10 ? 1 : 0 
      });
    }
    return Math.round(distanceInMeters).toLocaleString();
  };

  return (
    <div className="custom-scale-bar-container">
      <div className="custom-scale-segments-container" style={{ width: `${totalPixelWidth}px` }}>
        {Array.from({ length: numberOfSegments }).map((_, index) => (
          <div
            key={index}
            className={`custom-scale-segment segment-${index % 2 === 0 ? 'even' : 'odd'}`}
            style={{ width: `${segmentPixelWidth}px` }}
          />
        ))}
      </div>
      <div className="custom-scale-labels-container" style={{ width: `${totalPixelWidth}px` }}>
        {Array.from({ length: numberOfSegments + 1 }).map((_, index) => {
          const proportion = index / numberOfSegments;
          const distanceAtTick = totalDistanceMeters * proportion;
          const labelText = formatLabel(distanceAtTick, displayUnit);
          
          // Add unit only to the last label, and "0" doesn't need a unit.
          const displayLabel = (index === 0) ? "0" : 
                               (index === numberOfSegments ? `${labelText} ${displayUnit}` : labelText);
          return (
            <span key={index} className="custom-scale-label">
              {displayLabel}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default CustomScaleBar;