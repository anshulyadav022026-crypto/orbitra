import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TelemetryData,
  ConnectionMode,
  ConnectionState,
  TelemetryStats,
} from './types/telemetry';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { Attitude3D } from './components/Attitude3D';
import { AttitudeHorizon } from './components/AttitudeHorizon';
import { PlotlyCharts } from './components/PlotlyCharts';
import { PacketConsole } from './components/PacketConsole';
import { ReferenceViewerModal } from './components/ReferenceViewerModal';
import { TelemetrySimulator, SimulatorFlightPhase } from './services/telemetrySimulator';
import { WebSerialManager } from './services/serialConnection';
import { telemetryAudio } from './utils/audio';
import { Activity, Cpu, Satellite, Rocket, Crosshair } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<ConnectionMode>('simulation');
  const [status, setStatus] = useState<ConnectionState>('connected');
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:8081');
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [missionStartTime, setMissionStartTime] = useState<number | null>(Date.now());

  // IMU Zero/Tare Calibration Offsets
  const [rollOffset, setRollOffset] = useState<number>(0);
  const [pitchOffset, setPitchOffset] = useState<number>(0);

  // Simulator Phase state
  const [simPhase, setSimPhase] = useState<SimulatorFlightPhase>('pad');
  const [simRate, setSimRate] = useState<number>(1000);

  const [stats, setStats] = useState<TelemetryStats>({
    packetsReceived: 0,
    packetsLost: 0,
    packetRateHz: 0,
    lastPacketTime: null,
    maxAltitude: 0,
    maxTotalAcc: 0,
    maxSpeed: 0,
    minPressure: 0,
  });

  const simulatorRef = useRef<TelemetrySimulator>(new TelemetrySimulator(1000));
  const serialManagerRef = useRef<WebSerialManager>(new WebSerialManager());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const packetTimestampsRef = useRef<number[]>([]);
  const lastPacketNoRef = useRef<number | null>(null);

  const handleIncomingPacket = useCallback(
    (packet: TelemetryData) => {
      if (isPaused) return;

      const now = Date.now();
      telemetryAudio.playTelemetryPing();

      packetTimestampsRef.current.push(now);
      packetTimestampsRef.current = packetTimestampsRef.current.filter((t) => now - t <= 3000);
      const hz = packetTimestampsRef.current.length / 3.0;

      let lostDelta = 0;
      if (lastPacketNoRef.current !== null && packet.packetNo > lastPacketNoRef.current + 1) {
        lostDelta = packet.packetNo - lastPacketNoRef.current - 1;
      }
      lastPacketNoRef.current = packet.packetNo;

      if (mode === 'simulation') {
        setSimPhase(simulatorRef.current.getFlightPhase());
      }

      setStats((prev) => ({
        packetsReceived: prev.packetsReceived + 1,
        packetsLost: prev.packetsLost + lostDelta,
        packetRateHz: Number(hz.toFixed(1)),
        lastPacketTime: now,
        maxAltitude: Math.max(prev.maxAltitude, packet.bmpAltitude, packet.altitude),
        maxTotalAcc: Math.max(prev.maxTotalAcc, packet.totalAcc),
        maxSpeed: Math.max(prev.maxSpeed, packet.speed),
        minPressure:
          prev.minPressure === 0
            ? packet.pressure
            : Math.min(prev.minPressure, packet.pressure),
      }));

      setTelemetryHistory((prev) => {
        const updated = [...prev, packet];
        if (updated.length > 1000) {
          return updated.slice(updated.length - 1000);
        }
        return updated;
      });
    },
    [isPaused, mode]
  );

  const setupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw && typeof raw === 'object' && Number.isFinite(raw.packetNo)) {
            handleIncomingPacket(raw as TelemetryData);
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (mode === 'websocket') {
            setupWebSocket();
          }
        }, 3000);
      };
    } catch {
      setStatus('error');
    }
  }, [wsUrl, mode, handleIncomingPacket]);

  const setupSerial = useCallback(async () => {
    setStatus('connecting');
    const success = await serialManagerRef.current.connect(
      115200,
      handleIncomingPacket,
      (newStatus) => {
        setStatus(newStatus);
      }
    );
    if (!success) {
      setStatus('disconnected');
    }
  }, [handleIncomingPacket]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    simulatorRef.current.stop();
    serialManagerRef.current.disconnect();

    if (mode === 'simulation') {
      setStatus('connected');
      simulatorRef.current.setInterval(simRate);
      simulatorRef.current.start(handleIncomingPacket);
      setSimPhase(simulatorRef.current.getFlightPhase());
    } else if (mode === 'websocket') {
      setupWebSocket();
    } else if (mode === 'serial') {
      setupSerial();
    }

    return () => {
      simulatorRef.current.stop();
      serialManagerRef.current.disconnect();
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [mode, wsUrl, simRate, setupWebSocket, setupSerial, handleIncomingPacket]);

  const handleExportCsv = () => {
    if (telemetryHistory.length === 0) return;

    const headers = [
      'packetNo',
      'timestamp',
      'isoTime',
      'temperature',
      'humidity',
      'ax',
      'ay',
      'az',
      'totalAcc',
      'gx',
      'gy',
      'gz',
      'roll',
      'pitch',
      'latitude',
      'longitude',
      'altitude',
      'speed',
      'satellites',
      'gpsFix',
      'bmpTemperature',
      'pressure',
      'bmpAltitude',
    ];

    const rows = telemetryHistory.map((t) => [
      t.packetNo,
      t.timestamp,
      new Date(t.timestamp).toISOString(),
      t.temperature,
      t.humidity,
      t.ax,
      t.ay,
      t.az,
      t.totalAcc,
      t.gx,
      t.gy,
      t.gz,
      t.roll,
      t.pitch,
      t.latitude,
      t.longitude,
      t.altitude,
      t.speed,
      t.satellites,
      t.gpsFix,
      t.bmpTemperature,
      t.pressure,
      t.bmpAltitude,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `telemetry_mission_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetData = () => {
    setTelemetryHistory([]);
    lastPacketNoRef.current = null;
    packetTimestampsRef.current = [];
    setMissionStartTime(Date.now());
    simulatorRef.current.resetMission();
    setSimPhase('pad');
    setStats({
      packetsReceived: 0,
      packetsLost: 0,
      packetRateHz: 0,
      lastPacketTime: null,
      maxAltitude: 0,
      maxTotalAcc: 0,
      maxSpeed: 0,
      minPressure: 0,
    });
  };

  const handleTareLevel = () => {
    if (latest) {
      setRollOffset(latest.roll);
      setPitchOffset(latest.pitch);
    }
  };

  const handleResetTare = () => {
    setRollOffset(0);
    setPitchOffset(0);
  };

  const latestRaw = telemetryHistory.length > 0 ? telemetryHistory[telemetryHistory.length - 1] : null;
  const latest: TelemetryData | null = latestRaw
    ? {
        ...latestRaw,
        roll: Number((latestRaw.roll - rollOffset).toFixed(2)),
        pitch: Number((latestRaw.pitch - pitchOffset).toFixed(2)),
      }
    : null;

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col font-sans tech-grid">
      {/* Top Header */}
      <Header
        mode={mode}
        onChangeMode={(m) => setMode(m)}
        status={status}
        wsUrl={wsUrl}
        onWsUrlChange={(url) => setWsUrl(url)}
        stats={stats}
        onExportCsv={handleExportCsv}
        onResetData={handleResetData}
        onOpenReference={() => setIsReferenceOpen(true)}
        missionStartTime={missionStartTime}
      />

      {/* Main Ground Station Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Simulation Control Strip */}
        {mode === 'simulation' && (
          <div className="p-3 bg-[#121212] border border-[#262626] rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#000000] border border-[#262626] text-[#FFFFFF] font-mono text-[11px] font-bold">
                <Rocket className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span className="uppercase tracking-wider">FLIGHT SIMULATOR</span>
              </div>
              <span className="text-[#8E8E93] font-medium">Phase:</span>
              <span className="px-2 py-0.5 rounded uppercase font-mono font-bold tracking-wider text-[11px] bg-[#000000] text-[#FFFFFF] border border-[#262626]">
                {simPhase}
              </span>
            </div>

            {/* Scenario Triggers */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => {
                  simulatorRef.current.triggerLaunch();
                  setSimPhase('boost');
                }}
                className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] text-[#FFFFFF] font-bold shadow-sm transition-colors border border-[#262626]"
              >
                Ignition / Boost
              </button>

              <button
                onClick={() => {
                  simulatorRef.current.triggerApogee();
                  setSimPhase('coasting');
                }}
                className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] text-[#FFFFFF] font-bold shadow-sm transition-colors border border-[#262626]"
              >
                Apogee / Coast
              </button>

              <button
                onClick={() => {
                  simulatorRef.current.triggerParachute();
                  setSimPhase('descent');
                }}
                className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] text-[#FFFFFF] font-bold shadow-sm transition-colors border border-[#262626]"
              >
                Deploy Chute
              </button>

              <button
                onClick={() => simulatorRef.current.induceTumble()}
                className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] text-[#FFFFFF] font-bold shadow-sm transition-colors border border-[#262626]"
              >
                Induce Tumble
              </button>

              <div className="h-4 w-px bg-[#262626] mx-1 hidden sm:block" />

              <div className="flex items-center bg-[#000000] p-0.5 rounded border border-[#262626] text-[11px]">
                {[
                  { label: '2s (ESP)', val: 2000 },
                  { label: '1s', val: 1000 },
                  { label: '250ms', val: 250 },
                ].map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setSimRate(r.val)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      simRate === r.val ? 'bg-[#FFFFFF] text-[#000000] font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'text-[#8E8E93] hover:text-[#FFFFFF]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Real-time Telemetry Metrics Strip */}
        <MetricsOverview latest={latest} stats={stats} />

        {/* Primary Avionics Display: 3D Attitude Gimbal & Plotly Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Hero: Three.js 3D Attitude Gimbal & Cockpit Artificial Horizon */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="h-[480px]">
              <Attitude3D
                roll={latest ? latest.roll : 0}
                pitch={latest ? latest.pitch : 0}
                totalAcc={latest ? latest.totalAcc : 1.0}
                altitude={latest ? latest.bmpAltitude : 0}
              />
            </div>

            {/* Artificial Horizon & Avionics Subsystems Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#121212] border border-[#262626] rounded-xl shadow-sm">
              <div className="flex flex-col items-center justify-center p-2 bg-[#000000] rounded-lg border border-[#262626]">
                <div className="w-full flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-bold tracking-wider text-[#FFFFFF]">
                    ARTIFICIAL HORIZON
                  </span>
                  <button
                    onClick={rollOffset !== 0 || pitchOffset !== 0 ? handleResetTare : handleTareLevel}
                    title={rollOffset !== 0 ? 'Reset Tare Offset' : 'Tare / Zero Attitude Level'}
                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      rollOffset !== 0 || pitchOffset !== 0
                        ? 'bg-[#FFFFFF] text-[#000000] border-[#FFFFFF] font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                        : 'bg-[#121212] text-[#8E8E93] hover:text-[#FFFFFF] border-[#262626]'
                    }`}
                  >
                    <Crosshair className="w-2.5 h-2.5" />
                    <span>{rollOffset !== 0 ? 'Tared' : 'Tare'}</span>
                  </button>
                </div>
                <AttitudeHorizon
                  roll={latest ? latest.roll : 0}
                  pitch={latest ? latest.pitch : 0}
                />
              </div>

              {/* Hardware Subsystem Status Matrix */}
              <div className="flex flex-col justify-between p-2.5 bg-[#000000] rounded-lg border border-[#262626] text-xs">
                <span className="text-[11px] font-bold tracking-wider text-[#FFFFFF]">
                  SYSTEM BUS HEALTH
                </span>
                <div className="space-y-2 mt-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E8E93] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#FFFFFF]" /> MPU6500 IMU
                    </span>
                    <span className="text-emerald-400 font-bold">ACTIVE (I2C0)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8E8E93] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#FFFFFF]" /> BMP280 Baro
                    </span>
                    <span className="text-emerald-400 font-bold">ACTIVE (I2C1)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8E8E93] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> DHT11 Thermal
                    </span>
                    <span className="text-emerald-400 font-bold">GPIO 4</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8E8E93] flex items-center gap-1.5">
                      <Satellite className="w-3.5 h-3.5 text-[#FFFFFF]" /> NEO-6M GPS
                    </span>
                    <span className={latest && latest.gpsFix ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {latest && latest.gpsFix ? 'LOCKED' : 'SEARCHING'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#262626]">
                    <span className="text-[#8E8E93]">ESP-NOW Link</span>
                    <span className="text-[#FFFFFF] font-bold">CH 1 • OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero: PlotlyJS Graphical Charts */}
          <div className="lg:col-span-7 flex flex-col">
            <PlotlyCharts telemetryHistory={telemetryHistory} />
          </div>
        </div>

        {/* Bottom Section: Raw Serial Telemetry Bus & JSON Explorer */}
        <div className="w-full">
          <PacketConsole
            packets={telemetryHistory}
            stats={stats}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onClear={() => setTelemetryHistory([])}
          />
        </div>
      </main>

      {/* Reference Code & Wiring Modal */}
      <ReferenceViewerModal
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
      />
    </div>
  );
}
