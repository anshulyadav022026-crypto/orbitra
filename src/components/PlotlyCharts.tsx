import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { TelemetryData } from '../types/telemetry';
import { Activity, Wind, Compass, Thermometer, MapPin, Download, Clock } from 'lucide-react';

interface PlotlyChartsProps {
  telemetryHistory: TelemetryData[];
}

export const PlotlyCharts: React.FC<PlotlyChartsProps> = ({ telemetryHistory }) => {
  const [activeTab, setActiveTab] = useState<'alt_press' | 'accel' | 'gyro' | 'environment' | 'gps_map'>('alt_press');
  const [windowSec, setWindowSec] = useState<number>(60);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current) {
        Plotly.Plots.resize(chartContainerRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    if (telemetryHistory.length === 0) {
      Plotly.react(
        container,
        [],
        {
          paper_bgcolor: 'transparent',
          plot_bgcolor: '#0A0A0A',
          annotations: [
            {
              text: 'Awaiting telemetry packets from ESP receiver...',
              showarrow: false,
              font: { color: '#8E8E93', size: 14, family: 'JetBrains Mono, monospace' },
            },
          ],
          xaxis: { showgrid: false, zeroline: false, showticklabels: false },
          yaxis: { showgrid: false, zeroline: false, showticklabels: false },
          margin: { l: 40, r: 40, t: 30, b: 40 },
        },
        { responsive: true, displayModeBar: false }
      );
      return;
    }

    const now = telemetryHistory[telemetryHistory.length - 1].timestamp;
    const filtered =
      windowSec > 0
        ? telemetryHistory.filter((t) => now - t.timestamp <= windowSec * 1000)
        : telemetryHistory;

    const timestamps = filtered.map((t) => new Date(t.timestamp).toLocaleTimeString());

    const commonDarkLayout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: '#0A0A0A',
      font: { color: '#8E8E93', family: 'Plus Jakarta Sans, sans-serif' },
      hovermode: 'x unified' as const,
      margin: { l: 55, r: 50, t: 35, b: 45 },
      legend: {
        orientation: 'h' as const,
        y: 1.14,
        x: 0,
        font: { color: '#FFFFFF', size: 11 },
      },
      xaxis: {
        gridcolor: '#262626',
        zerolinecolor: '#3A3A3C',
        title: { text: 'Time (HH:MM:SS)', font: { size: 11, color: '#8E8E93' } },
        tickfont: { size: 10, color: '#8E8E93', family: 'JetBrains Mono, monospace' },
      },
    };

    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'] as any,
    };

    if (activeTab === 'alt_press') {
      const traceBmpAlt: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.bmpAltitude),
        name: 'BMP280 Altitude (m)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#FFFFFF', width: 2.5 },
      };

      const traceGpsAlt: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.altitude),
        name: 'GPS Altitude (m)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#8E8E93', width: 1.8, dash: 'dot' },
      };

      const tracePressure: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.pressure),
        name: 'Pressure (hPa)',
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#F59E0B', width: 2 },
      };

      const layout = {
        ...commonDarkLayout,
        yaxis: {
          title: { text: 'Altitude (m)', font: { color: '#FFFFFF' } },
          tickfont: { color: '#FFFFFF', size: 10 },
          gridcolor: '#262626',
        },
        yaxis2: {
          title: { text: 'Pressure (hPa)', font: { color: '#F59E0B' } },
          tickfont: { color: '#F59E0B', size: 10 },
          overlaying: 'y' as const,
          side: 'right' as const,
          showgrid: false,
        },
      };

      Plotly.react(container, [traceBmpAlt, traceGpsAlt, tracePressure], layout, config);
    } else if (activeTab === 'accel') {
      const traceAx: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.ax),
        name: 'Accel X (g)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#EF4444', width: 1.8 },
      };
      const traceAy: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.ay),
        name: 'Accel Y (g)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#10B981', width: 1.8 },
      };
      const traceAz: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.az),
        name: 'Accel Z (g)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#8E8E93', width: 1.8 },
      };
      const traceTotal: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.totalAcc),
        name: 'Total Accel (g)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#FFFFFF', width: 2.6 },
      };

      const layout = {
        ...commonDarkLayout,
        yaxis: {
          title: { text: 'Acceleration (g)', font: { color: '#FFFFFF' } },
          gridcolor: '#262626',
          zerolinecolor: '#3A3A3C',
        },
      };

      Plotly.react(container, [traceAx, traceAy, traceAz, traceTotal], layout, config);
    } else if (activeTab === 'gyro') {
      const traceGx: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.gx),
        name: 'Gyro X (°/s)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#EF4444', width: 1.6 },
      };
      const traceGy: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.gy),
        name: 'Gyro Y (°/s)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#10B981', width: 1.6 },
      };
      const traceGz: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.gz),
        name: 'Gyro Z (°/s)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#8E8E93', width: 1.6 },
      };
      const traceRoll: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.roll),
        name: 'Roll Angle (°)',
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#FFFFFF', width: 2.2 },
      };
      const tracePitch: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.pitch),
        name: 'Pitch Angle (°)',
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#F59E0B', width: 2.2 },
      };

      const layout = {
        ...commonDarkLayout,
        yaxis: {
          title: { text: 'Angular Rate (°/s)', font: { color: '#8E8E93' } },
          gridcolor: '#262626',
        },
        yaxis2: {
          title: { text: 'Attitude Angles (°)', font: { color: '#FFFFFF' } },
          overlaying: 'y' as const,
          side: 'right' as const,
          showgrid: false,
        },
      };

      Plotly.react(container, [traceGx, traceGy, traceGz, traceRoll, tracePitch], layout, config);
    } else if (activeTab === 'environment') {
      const traceDhtTemp: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.temperature),
        name: 'DHT11 Temp (°C)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#FB923C', width: 2 },
      };
      const traceBmpTemp: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.bmpTemperature),
        name: 'BMP280 Temp (°C)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#F87171', width: 2 },
      };
      const traceHumidity: Plotly.Data = {
        x: timestamps,
        y: filtered.map((t) => t.humidity),
        name: 'Humidity (%RH)',
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#FFFFFF', width: 2 },
      };

      const layout = {
        ...commonDarkLayout,
        yaxis: {
          title: { text: 'Temperature (°C)', font: { color: '#FB923C' } },
          gridcolor: '#262626',
        },
        yaxis2: {
          title: { text: 'Humidity (%)', font: { color: '#FFFFFF' } },
          overlaying: 'y' as const,
          side: 'right' as const,
          showgrid: false,
        },
      };

      Plotly.react(container, [traceDhtTemp, traceBmpTemp, traceHumidity], layout, config);
    } else if (activeTab === 'gps_map') {
      const validGps = filtered.filter((t) => t.latitude !== 0 && t.longitude !== 0);

      if (validGps.length === 0) {
        Plotly.react(
          container,
          [],
          {
            ...commonDarkLayout,
            annotations: [
              {
                text: 'Waiting for GPS satellite fix (valid latitude/longitude)...',
                showarrow: false,
                font: { color: '#8E8E93', size: 14 },
              },
            ],
          },
          config
        );
        return;
      }

      const lats = validGps.map((t) => t.latitude);
      const lons = validGps.map((t) => t.longitude);
      const alts = validGps.map((t) => t.altitude);

      const pathTrace: Plotly.Data = {
        x: lons,
        y: lats,
        mode: 'lines+markers',
        type: 'scatter',
        name: 'Ground Path',
        line: { color: '#FFFFFF', width: 3 },
        marker: {
          size: 6,
          color: alts,
          colorscale: 'Greys',
          colorbar: {
            title: { text: 'Alt (m)', font: { color: '#FFFFFF', size: 10 } },
            tickfont: { color: '#8E8E93', size: 9 },
            thickness: 12,
          },
        },
        text: validGps.map(
          (t) => `Alt: ${t.altitude.toFixed(1)}m<br>Spd: ${t.speed.toFixed(1)}km/h<br>Sats: ${t.satellites}`
        ),
      };

      const current = validGps[validGps.length - 1];
      const currentTrace: Plotly.Data = {
        x: [current.longitude],
        y: [current.latitude],
        mode: 'markers',
        type: 'scatter',
        name: 'Current Fix',
        marker: {
          size: 14,
          color: '#EF4444',
          symbol: 'diamond',
          line: { color: '#FFFFFF', width: 2 },
        },
      };

      const layout = {
        ...commonDarkLayout,
        xaxis: {
          title: { text: 'Longitude (°)', font: { size: 11, color: '#8E8E93' } },
          gridcolor: '#262626',
          tickformat: '.6f',
        },
        yaxis: {
          title: { text: 'Latitude (°)', font: { size: 11, color: '#8E8E93' } },
          gridcolor: '#262626',
          tickformat: '.6f',
        },
      };

      Plotly.react(container, [pathTrace, currentTrace], layout, config);
    }
  }, [telemetryHistory, activeTab, windowSec]);

  const handleDownloadSnapshot = () => {
    if (chartContainerRef.current) {
      Plotly.downloadImage(chartContainerRef.current, {
        format: 'png',
        filename: `telemetry_${activeTab}_${Date.now()}`,
        height: 600,
        width: 1000,
      });
    }
  };

  return (
    <div className="bg-[#121212] rounded-xl border border-[#262626] shadow-sm overflow-hidden flex flex-col h-full">
      {/* Chart Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#121212] border-b border-[#262626]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('alt_press')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'alt_press'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#262626]/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Altitude & Barometer</span>
          </button>

          <button
            onClick={() => setActiveTab('accel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'accel'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#262626]/50'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>3-Axis Accel</span>
          </button>

          <button
            onClick={() => setActiveTab('gyro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'gyro'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#262626]/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Gyro & Attitude</span>
          </button>

          <button
            onClick={() => setActiveTab('environment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'environment'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#262626]/50'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Temp & Humidity</span>
          </button>

          <button
            onClick={() => setActiveTab('gps_map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'gps_map'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#262626]/50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>GPS Trajectory</span>
          </button>
        </div>

        {/* Window Range & Export Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#000000] p-0.5 rounded-lg border border-[#262626] text-xs">
            <Clock className="w-3 h-3 text-[#8E8E93] ml-1.5 mr-1" />
            {[
              { label: '30s', val: 30 },
              { label: '1m', val: 60 },
              { label: '3m', val: 180 },
              { label: 'All', val: -1 },
            ].map((w) => (
              <button
                key={w.label}
                onClick={() => setWindowSec(w.val)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                  windowSec === w.val
                    ? 'bg-[#FFFFFF] text-[#000000] font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                    : 'text-[#8E8E93] hover:text-[#FFFFFF]'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadSnapshot}
            title="Download Graph Snapshot as PNG"
            className="p-1.5 rounded-lg bg-[#000000] hover:bg-[#262626] border border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF] text-xs flex items-center transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Plotly Interactive Canvas */}
      <div className="relative flex-1 w-full min-h-[380px] p-2 bg-[#121212]">
        <div ref={chartContainerRef} className="w-full h-full min-h-[380px]" />
      </div>
    </div>
  );
};
