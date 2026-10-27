import React, { useState, useRef, useEffect } from 'react';
import { TelemetryData, TelemetryStats } from '../types/telemetry';
import { Terminal, Copy, Check, Pause, Play, Trash2 } from 'lucide-react';

interface PacketConsoleProps {
  packets: TelemetryData[];
  stats: TelemetryStats;
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
}

export const PacketConsole: React.FC<PacketConsoleProps> = ({
  packets,
  stats,
  isPaused,
  onTogglePause,
  onClear,
}) => {
  const [activeView, setActiveView] = useState<'stream' | 'json'>('stream');
  const [copied, setCopied] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && scrollRef.current && activeView === 'stream') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [packets, isPaused, activeView]);

  const latest = packets.length > 0 ? packets[packets.length - 1] : null;

  const handleCopyJson = () => {
    if (!latest) return;
    navigator.clipboard.writeText(JSON.stringify(latest, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#121212] rounded-xl border border-[#262626] shadow-sm overflow-hidden flex flex-col h-full">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between p-2.5 bg-[#121212] border-b border-[#262626] text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#FFFFFF]" />
          <span className="font-bold text-[#FFFFFF] tracking-wider">SERIAL TELEMETRY BUS</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px] font-mono text-[#FFFFFF] bg-[#000000] px-2 py-0.5 rounded border border-[#262626] font-bold">
              {stats.packetRateHz.toFixed(1)} Hz
            </span>
            <span className="text-[11px] font-mono text-[#8E8E93] bg-[#000000] px-2 py-0.5 rounded border border-[#262626] font-semibold">
              Rx: {stats.packetsReceived}
            </span>
            {stats.packetsLost > 0 && (
              <span className="text-[11px] font-mono text-rose-400 bg-[#000000] px-2 py-0.5 rounded border border-[#262626] font-bold">
                Lost: {stats.packetsLost}
              </span>
            )}
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#000000] p-0.5 rounded-lg border border-[#262626] text-[11px]">
            <button
              onClick={() => setActiveView('stream')}
              className={`px-2.5 py-0.5 rounded transition-colors ${
                activeView === 'stream'
                  ? 'bg-[#FFFFFF] text-[#000000] font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              Stream
            </button>
            <button
              onClick={() => setActiveView('json')}
              className={`px-2.5 py-0.5 rounded transition-colors ${
                activeView === 'json'
                  ? 'bg-[#FFFFFF] text-[#000000] font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              JSON Tree
            </button>
          </div>

          <button
            onClick={onTogglePause}
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              isPaused
                ? 'bg-[#FFFFFF] text-[#000000] border-[#FFFFFF] font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                : 'bg-[#000000] border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#262626]'
            }`}
            title={isPaused ? 'Resume Stream' : 'Pause Stream'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClear}
            className="p-1.5 rounded-md bg-[#000000] hover:bg-[#262626] border border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF] text-xs transition-colors"
            title="Clear Stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Body */}
      <div className="relative flex-1 p-3 overflow-hidden font-mono text-xs bg-[#000000]">
        {activeView === 'stream' ? (
          <div
            ref={scrollRef}
            className="w-full h-64 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] select-text"
          >
            {packets.length === 0 ? (
              <div className="text-[#8E8E93] italic py-8 text-center">
                Waiting for serial packets from backend or ESP receiver...
              </div>
            ) : (
              packets.slice(-100).map((p, idx) => (
                <div
                  key={`${p.packetNo}-${idx}`}
                  className="flex items-start gap-2 hover:bg-[#121212] p-1 rounded border border-transparent hover:border-[#262626] transition-colors text-slate-300"
                >
                  <span className="text-[#8E8E93]/60 select-none">
                    [{new Date(p.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="text-[#FFFFFF] font-bold">#{p.packetNo.toString().padStart(4, '0')}</span>
                  <span className="text-amber-400">T:{p.temperature}°C</span>
                  <span className="text-emerald-400">P:{p.pressure}hPa</span>
                  <span className="text-cyan-400">Alt:{p.bmpAltitude}m</span>
                  <span className="text-purple-400">Acc:{p.totalAcc}g</span>
                  <span className="text-slate-300">R:{p.roll}° P:{p.pitch}°</span>
                  <span className="text-blue-400">
                    GPS:{p.latitude !== 0 ? `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}` : 'Wait'}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="w-full h-64 overflow-y-auto pr-1">
            {latest ? (
              <div className="relative">
                <button
                  onClick={handleCopyJson}
                  className="absolute top-2 right-2 p-1.5 rounded bg-[#121212] hover:bg-[#262626] text-[#FFFFFF] text-xs flex items-center gap-1 border border-[#262626] shadow-sm z-10 font-semibold"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="p-3 bg-[#121212] rounded-lg border border-[#262626] text-[#FFFFFF] text-[11px] overflow-x-auto shadow-sm">
                  {JSON.stringify(latest, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-[#8E8E93] italic py-8 text-center">No packet received yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
