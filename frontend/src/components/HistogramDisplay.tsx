// src/components/HistogramDisplay.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types & Defaults                                                   */
/* ------------------------------------------------------------------ */

interface HistogramDisplayProps {
  /** Relative path or full URL to your COG */
  cogUrlPart: string; // e.g. "/data/ndvi_ashdod_20230701_cog.tif"
  /** Titiler endpoint (no trailing slash) */
  titilerBaseUrl?: string;
  /** Number of histogram bins (must match UI expectations) */
  histogramBins?: number;
  /** [min, max] range sent to Titiler for clipping */
  histogramRange?: [number, number];
}

interface HistogramData {
  counts: number[];
  binEdges: number[];
}

const DEFAULT_HISTOGRAM_RANGE: [number, number] = [-1, 1];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const HistogramDisplay: React.FC<HistogramDisplayProps> = ({
  cogUrlPart,
  titilerBaseUrl = 'http://localhost:8001',
  histogramBins = 20,
  histogramRange = DEFAULT_HISTOGRAM_RANGE,
}) => {
  const map = useMap(); // Leaflet map instance
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----------------------- Fetch histogram ------------------------ */
  const fetchHistogram = useCallback(async () => {
    if (!map || !cogUrlPart) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Current view bounding box in WGS84 (Leaflet default)
      const b = map.getBounds();
      const bboxStr = [
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ].join(',');

      // 2. Build query string
        const qs = new URLSearchParams({
        url: cogUrlPart,
        bidx: '1',
        histogram_bins: histogramBins.toString(),
        histogram_range: histogramRange.join(','),
        bbox: bboxStr,
        bbox_crs: 'EPSG:4326'          // ← change param name
        });

      const requestUrl = `${titilerBaseUrl}/cog/statistics?${qs.toString()}`;

      // 3. Fetch
      const res = await fetch(requestUrl);
      if (!res.ok) {
        throw new Error(`Titiler responded ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // 4. Parse response
      if (!data?.b1?.histogram || data.b1.histogram.length !== 2) {
        throw new Error('Histogram missing in Titiler response');
      }
      const [counts, binEdges] = data.b1.histogram as [number[], number[]];
      if (
        counts.length !== histogramBins ||
        binEdges.length !== histogramBins + 1
      ) {
        throw new Error('Unexpected histogram size');
      }

      setHistogramData({ counts, binEdges });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHistogramData(null);
    } finally {
      setIsLoading(false);
    }
  }, [map, cogUrlPart, titilerBaseUrl, histogramBins, histogramRange]);

  /* ----------------------- Lifecycle hooks ------------------------ */
  useEffect(() => {
    if (!map) return;

    // Initial fetch + update on every pan / zoom
    fetchHistogram();
    map.on('moveend', fetchHistogram);

    return () => {
      map.off('moveend', fetchHistogram);
    };
  }, [map, fetchHistogram]);

  /* ----------------------- Prepare chart data --------------------- */
  const chartData =
    histogramData &&
    histogramData.binEdges.slice(0, -1).map((edge, i) => ({
      name: `${edge.toFixed(2)} – ${histogramData.binEdges[i + 1].toFixed(2)}`,
      count: histogramData.counts[i],
    }));

  /* ----------------------- Render --------------------------------- */
  if (isLoading) return <div className="histogram-panel">Loading…</div>;
  if (error) return <div className="histogram-panel">Error: {error}</div>;
  if (!chartData) return <div className="histogram-panel">No data.</div>;

  return (
    <div className="histogram-panel">
      <h4>NDVI Distribution&nbsp;(Current View)</h4>
      <p style={{ fontSize: '10px', textAlign: 'center', margin: 0 }}>
        Pixels: {histogramData.counts.reduce((a, b) => a + b, 0).toLocaleString()}
      </p>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: -25, bottom: 25 }}
          barCategoryGap="10%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={50}
            interval={Math.max(0, Math.floor(chartData.length / 5) - 1)}
            style={{ fontSize: '9px' }}
          />
          <YAxis
            allowDecimals={false}
            style={{ fontSize: '9px' }}
            label={{
              value: 'Count',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: '10px', fill: '#666' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              fontSize: '11px',
              borderRadius: '3px',
              padding: '3px 7px',
              border: '1px solid #ccc',
            }}
            itemStyle={{ color: '#17a2b8' }}
            formatter={(v: number) => [v.toLocaleString(), 'Pixels']}
          />
          <Bar dataKey="count" fill="#17a2b8" name="Pixels" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistogramDisplay;
