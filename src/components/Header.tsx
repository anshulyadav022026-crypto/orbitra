import React, { useState, useEffect } from 'react';
import {
  ConnectionMode,
  ConnectionState,
  TelemetryStats,
} from '../types/telemetry';
import {
  Radio,
  Wifi,
  Usb,
  Play,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  BookOpen,
  Settings,
} from 'lucide-react';
import { telemetryAudio } from '../utils/audio';

interface HeaderProps {
  mode: ConnectionMode;
  onChangeMode: (mode: ConnectionMode) => void;
  status: ConnectionState;
  wsUrl: string;
  onWsUrlChange: (url: string) => void;
  stats: TelemetryStats;
  onExportCsv: () => void;
  onResetData: () => void;
  onOpenReference: () => void;
  missionStartTime: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onChangeMode,
  status,
  wsUrl,
  onWsUrlChange,
  stats,
  onExportCsv,
  onResetData,
  onOpenReference,
  missionStartTime,
}) => {
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tempWsUrl, setTempWsUrl] = useState<string>(wsUrl);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (missionStartTime) {
        setElapsedSec(Math.floor((Date.now() - missionStartTime) / 1000));
      } else {
        setElapsedSec(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [missionStartTime]);

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `T+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    telemetryAudio.setEnabled(next);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return 'text-[#FFFFFF] border-[#262626] bg-[#000000]';
      case 'connecting':
        return 'text-amber-400 border-[#262626] bg-[#000000]';
      case 'error':
        return 'text-rose-400 border-[#262626] bg-[#000000]';
      default:
        return 'text-[#8E8E93] border-[#262626] bg-[#000000]';
    }
  };

  return (
    <header className="bg-[#121212]/95 border-b border-[#262626] px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Ground Station Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#000000] border border-[#262626] flex items-center justify-center text-[#FFFFFF] shadow-sm">
            <Radio className="w-5 h-5 text-[#FFFFFF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-[#FFFFFF] tracking-wide">
                AEROTRACK <span className="text-[#8E8E93]">GS</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#000000] text-[#8E8E93] border border-[#262626] font-semibold">
                ESP-NOW TELEMETRY
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93] font-mono flex items-center gap-2">
              <span className="font-semibold text-[#FFFFFF]">{formatTimer(elapsedSec)}</span>
              <span>•</span>
              <span>115200 BAUD</span>
              <span>•</span>
              <span>COM6 : 8081</span>
            </p>
          </div>
        </div>

        {/* Source Mode Selector Pills */}
        <div className="flex items-center bg-[#000000] p-1 rounded-xl border border-[#262626] text-xs">
          <button
            onClick={() => onChangeMode('websocket')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'websocket'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold'
                : 'text-[#8E8E93] hover:text-[#FFFFFF]'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>WebSocket Bridge</span>
          </button>

          <button
            onClick={() => onChangeMode('serial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'serial'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold'
                : 'text-[#8E8E93] hover:text-[#FFFFFF]'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>Web Serial</span>
          </button>

          <button
            onClick={() => onChangeMode('simulation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'simulation'
                ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold'
                : 'text-[#8E8E93] hover:text-[#FFFFFF]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Flight Demo</span>
          </button>
        </div>

        {/* Right Action Icons & Status Badge */}
        <div className="flex items-center gap-2">
          {/* Connection Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold ${getStatusBadge()}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : status === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="uppercase text-[11px] tracking-wider">{status}</span>
          </div>

          {/* WebSocket Settings Popover */}
          {mode === 'websocket' && (
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="Configure WebSocket URL"
                className="p-2 rounded-lg bg-[#000000] hover:bg-[#262626] border border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-80 p-3 bg-[#121212] border border-[#262626] rounded-xl shadow-2xl z-50 text-xs">
                  <h4 className="font-semibold text-[#FFFFFF] mb-1">WebSocket Server Address</h4>
                  <p className="text-[11px] text-[#8E8E93] mb-2">
                    Must match the port in <code className="text-[#FFFFFF] font-mono">backend.js</code> (default: ws://localhost:8081)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempWsUrl}
                      onChange={(e) => setTempWsUrl(e.target.value)}
                      placeholder="ws://localhost:8081"
                      className="flex-1 bg-[#000000] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-[#FFFFFF] font-mono focus:outline-none focus:border-[#8E8E93]"
                    />
                    <button
                      onClick={() => {
                        onWsUrlChange(tempWsUrl);
                        setShowSettings(false);
                      }}
                      className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-slate-200 text-[#000000] font-bold rounded-lg transition-colors shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audio Beep Toggle */}
          <button
            onClick={toggleAudio}
            title={audioEnabled ? 'Mute Telemetry Pings' : 'Enable Audio Telemetry Pings'}
            className={`p-2 rounded-lg border transition-colors ${
              audioEnabled
                ? 'bg-[#FFFFFF] border-[#FFFFFF] text-[#000000] shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                : 'bg-[#000000] hover:bg-[#262626] border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF]'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            title="Export CSV Telemetry Log"
            className="p-2 rounded-lg bg-[#000000] hover:bg-[#262626] border border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Reset Telemetry Buffer */}
          <button
            onClick={onResetData}
            title="Reset Telemetry Data Buffer"
            className="p-2 rounded-lg bg-[#000000] hover:bg-[#262626] border border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Reference Modal Drawer Button */}
          <button
            onClick={onOpenReference}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#000000] hover:bg-[#262626] border border-[#262626] text-[#FFFFFF] text-xs font-semibold transition-colors"
          >
            <BookOpen className="w-4 h-4 text-[#8E8E93]" />
            <span className="hidden sm:inline">Reference Code</span>
          </button>
        </div>
      </div>
    </header>
  );
};
