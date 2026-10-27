import React from 'react';
import { TelemetryData, TelemetryStats } from '../types/telemetry';
import {
  Compass,
  ArrowUpRight,
  Gauge,
  Thermometer,
  Droplets,
  Satellite,
  Wind,
} from 'lucide-react';

interface MetricsOverviewProps {
  latest: TelemetryData | null;
  stats: TelemetryStats;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ latest, stats }) => {
  if (!latest) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] animate-pulse h-28 flex flex-col justify-between"
          >
            <div className="h-3 w-16 bg-[#262626] rounded" />
            <div className="h-6 w-24 bg-[#262626] rounded" />
            <div className="h-2 w-20 bg-[#262626] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Barometric & GPS Altitude */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#8E8E93] transition-all">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-bold tracking-wider flex items-center gap-1.5 text-[#FFFFFF]">
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E93]" />
            ALTITUDE
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#000000] text-[#8E8E93] border border-[#262626] font-semibold">
            BMP280
          </span>
        </div>
        <div className="my-1">
          <div className="text-2xl font-bold font-mono text-[#FFFFFF] tracking-tight">
            {latest.bmpAltitude.toFixed(1)}
            <span className="text-xs font-normal text-[#8E8E93] ml-1">m</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8E93] border-t border-[#262626]/60 pt-1.5">
          <span>GPS: {latest.altitude.toFixed(0)}m</span>
          <span className="text-stone-500">Max: {stats.maxAltitude.toFixed(0)}m</span>
        </div>
      </div>

      {/* 2. Attitude (Roll / Pitch) */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#8E8E93] transition-all">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-bold tracking-wider flex items-center gap-1.5 text-[#FFFFFF]">
            <Compass className="w-3.5 h-3.5 text-[#8E8E93]" />
            ATTITUDE
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#000000] text-[#8E8E93] border border-[#262626] font-semibold">
            MPU6500
          </span>
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <div className="text-lg font-bold font-mono text-[#FFFFFF]">
            R: <span className="text-[#FFFFFF]">{latest.roll.toFixed(1)}°</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#FFFFFF]">
            P: <span className="text-[#8E8E93]">{latest.pitch.toFixed(1)}°</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8E93] border-t border-[#262626]/60 pt-1.5">
          <span>GZ: {latest.gz.toFixed(1)}°/s</span>
          <span className="text-stone-500">G-Rate</span>
        </div>
      </div>

      {/* 3. Barometric Pressure */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#8E8E93] transition-all">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-bold tracking-wider flex items-center gap-1.5 text-[#FFFFFF]">
            <Gauge className="w-3.5 h-3.5 text-[#8E8E93]" />
            PRESSURE
          </span>
          <span className="text-[10px] font-mono text-stone-500">hPa</span>
        </div>
        <div className="my-1">
          <div className="text-2xl font-bold font-mono text-[#FFFFFF] tracking-tight">
            {latest.pressure.toFixed(1)}
            <span className="text-xs font-normal text-[#8E8E93] ml-1">hPa</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8E93] border-t border-[#262626]/60 pt-1.5">
          <span>Sea: 1013.2</span>
          <span className="text-stone-500">Min: {stats.minPressure > 0 ? stats.minPressure.toFixed(1) : '--'}</span>
        </div>
      </div>

      {/* 4. Temperature & Humidity */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#8E8E93] transition-all">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-bold tracking-wider flex items-center gap-1.5 text-[#FFFFFF]">
            <Thermometer className="w-3.5 h-3.5 text-[#8E8E93]" />
            THERMAL
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#000000] text-[#8E8E93] border border-[#262626] font-semibold">
            DHT + BMP
          </span>
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <div className="text-2xl font-bold font-mono text-[#FFFFFF]">
            {latest.temperature.toFixed(1)}°C
          </div>
          <div className="text-xs font-mono text-[#8E8E93]">
            BMP: {latest.bmpTemperature.toFixed(1)}°
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8E93] border-t border-[#262626]/60 pt-1.5">
          <span className="flex items-center gap-1 text-[#FFFFFF] font-medium">
            <Droplets className="w-3 h-3 text-[#8E8E93]" /> {latest.humidity.toFixed(0)}% RH
          </span>
          <span className="text-stone-500">Air</span>
        </div>
      </div>

      {/* 5. G-Force & Accelerometer */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#8E8E93] transition-all">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-bold tracking-wider flex items-center gap-1.5 text-[#FFFFFF]">
            <Wind className="w-3.5 h-3.5 text-[#8E8E93]" />
            G-FORCE
          </span>
          <span className="text-[10px] font-mono text-stone-500">TOTAL</span>
        </div>
        <div className="my-1">
          <div className="text-2xl font-bold font-mono text-[#FFFFFF] tracking-tight">
            {latest.totalAcc.toFixed(2)}
            <span className="text-xs font-normal text-[#8E8E93] ml-1">g</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8E93] border-t border-[#262626]/60 pt-1.5">
          <span>Z: {latest.az.toFixed(2)}g</span>
          <span className="text-[#FFFFFF] font-bold">Max: {stats.maxTotalAcc.toFixed(2)}g</span>
        </div>
      </div>

      {/* 6. GPS Positioning & Speed */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#8E8E93] transition-all">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-bold tracking-wider flex items-center gap-1.5 text-[#FFFFFF]">
            <Satellite className="w-3.5 h-3.5 text-[#8E8E93]" />
            GPS FIX
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
              latest.gpsFix
                ? 'bg-[#000000] text-[#FFFFFF] border-[#262626]'
                : 'bg-[#000000] text-[#8E8E93] border-[#262626]'
            }`}
          >
            {latest.gpsFix ? '3D FIX' : 'ACQUIRING'}
          </span>
        </div>
        <div className="my-1">
          <div className="text-2xl font-bold font-mono text-[#FFFFFF] tracking-tight">
            {latest.speed.toFixed(1)}
            <span className="text-xs font-normal text-[#8E8E93] ml-1">km/h</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8E93] border-t border-[#262626]/60 pt-1.5">
          <span>Sats: {latest.satellites}</span>
          <span className="text-stone-500">
            {latest.latitude !== 0 ? `${latest.latitude.toFixed(2)}, ${latest.longitude.toFixed(2)}` : 'No Pos'}
          </span>
        </div>
      </div>
    </div>
  );
};
