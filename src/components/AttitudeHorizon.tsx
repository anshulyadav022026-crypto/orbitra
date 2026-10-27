import React from 'react';

interface AttitudeHorizonProps {
  roll: number;  // degrees
  pitch: number; // degrees
}

export const AttitudeHorizon: React.FC<AttitudeHorizonProps> = ({ roll, pitch }) => {
  const clampedPitch = Math.max(-80, Math.min(80, pitch));
  const pitchOffset = clampedPitch * 1.8;

  return (
    <div className="relative w-44 h-44 rounded-full border-2 border-[#262626] bg-[#000000] overflow-hidden shadow-md select-none mx-auto">
      {/* Sky / Ground Disk */}
      <div
        className="absolute w-80 h-80 -top-18 -left-18 transition-transform duration-75 ease-out"
        style={{
          transform: `rotate(${-roll}deg) translateY(${pitchOffset}px)`,
          transformOrigin: 'center center',
        }}
      >
        {/* Sky (Upper Half) */}
        <div className="w-full h-40 bg-gradient-to-t from-[#262626] to-[#333333]" />
        {/* Ground (Lower Half) */}
        <div className="w-full h-40 bg-gradient-to-b from-[#121212] to-[#000000]" />
        {/* Horizon Dividing Line */}
        <div className="absolute top-40 -left-10 w-[120%] h-0.5 bg-white shadow-[0_0_6px_white]" />

        {/* Pitch Ladder Marks */}
        {[-30, -20, -10, 10, 20, 30].map((deg) => {
          const yPos = 160 - deg * 1.8;
          const isSky = deg > 0;
          return (
            <div
              key={deg}
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-between w-20 text-[9px] font-mono font-bold text-white/90"
              style={{ top: `${yPos}px` }}
            >
              <span>{Math.abs(deg)}</span>
              <div className={`h-0.5 ${isSky ? 'w-10 bg-white' : 'w-10 bg-[#8E8E93]'}`} />
              <span>{Math.abs(deg)}</span>
            </div>
          );
        })}
      </div>

      {/* Fixed Aircraft Crosshairs */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF] border border-[#000000] shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
        <div className="absolute w-12 h-1 bg-[#FFFFFF] left-6 rounded shadow-[0_0_6px_rgba(255,255,255,0.3)] border border-[#000000]" />
        <div className="absolute w-12 h-1 bg-[#FFFFFF] right-6 rounded shadow-[0_0_6px_rgba(255,255,255,0.3)] border border-[#000000]" />
      </div>

      {/* Roll Pointer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-[#FFFFFF]" />
      </div>

      {/* Digital Readout Insets */}
      <div className="absolute bottom-1.5 left-2 bg-[#000000]/90 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#FFFFFF] border border-[#262626] font-semibold">
        R:{roll.toFixed(0)}°
      </div>
      <div className="absolute bottom-1.5 right-2 bg-[#000000]/90 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#8E8E93] border border-[#262626] font-semibold">
        P:{pitch.toFixed(0)}°
      </div>
    </div>
  );
};
