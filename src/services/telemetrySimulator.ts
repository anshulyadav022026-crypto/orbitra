import { TelemetryData } from '../types/telemetry';

export type SimulatorFlightPhase = 'pad' | 'boost' | 'coasting' | 'descent' | 'landed';

/**
 * Realistic Flight & Aerospace Payload Telemetry Simulator.
 * Simulates a realistic sounding rocket / CanSat / high-altitude mission:
 * Launch -> Boost -> Apogee -> Drogue -> Main Parachute -> Touchdown.
 */
export class TelemetrySimulator {
  private packetCount: number = 0;
  private intervalId: number | null = null;
  private onPacketCallback: ((data: TelemetryData) => void) | null = null;

  // Flight simulation state variables
  private flightPhase: SimulatorFlightPhase = 'pad';
  private flightTime: number = 0; // seconds
  private altitude: number = 142.5; // ground elevation (m)
  private velocity: number = 0; // m/s
  private roll: number = 0; // deg
  private pitch: number = 0; // deg
  private yaw: number = 45; // deg
  private lat: number = 28.572872; // Cape Canaveral / launchpad reference
  private lon: number = -80.648981;
  private baseTemp: number = 24.5;
  private baseHumidity: number = 58.0;

  constructor(private intervalMs: number = 1000) {}

  public start(callback: (data: TelemetryData) => void) {
    this.stop();
    this.onPacketCallback = callback;
    this.intervalId = window.setInterval(() => {
      this.step();
    }, this.intervalMs);
  }

  public stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setInterval(ms: number) {
    this.intervalMs = ms;
    if (this.intervalId !== null && this.onPacketCallback) {
      this.start(this.onPacketCallback);
    }
  }

  public getFlightPhase(): SimulatorFlightPhase {
    return this.flightPhase;
  }

  public triggerLaunch() {
    this.flightPhase = 'boost';
    this.flightTime = 5.1;
  }

  public triggerApogee() {
    this.flightPhase = 'coasting';
    this.flightTime = 18.1;
    this.velocity = 0;
  }

  public triggerParachute() {
    this.flightPhase = 'descent';
    this.flightTime = 38.1;
    this.velocity = -6.2;
  }

  public induceTumble() {
    this.roll = Math.random() * 360 - 180;
    this.pitch = Math.random() * 160 - 80;
  }

  public resetMission() {
    this.packetCount = 0;
    this.flightTime = 0;
    this.altitude = 142.5;
    this.velocity = 0;
    this.roll = 0;
    this.pitch = 0;
    this.yaw = 45;
    this.lat = 28.572872;
    this.lon = -80.648981;
    this.flightPhase = 'pad';
  }

  private step() {
    const dt = this.intervalMs / 1000;
    this.flightTime += dt;
    this.packetCount++;

    // Base sensor noise
    let ax = 0.02 * (Math.random() - 0.5);
    let ay = 0.02 * (Math.random() - 0.5);
    let az = 1.0 + 0.03 * (Math.random() - 0.5); // 1g at rest

    let gx = (Math.random() - 0.5) * 1.5;
    let gy = (Math.random() - 0.5) * 1.5;
    let gz = (Math.random() - 0.5) * 1.0;

    // Kinematic phase machine
    if (this.flightTime < 5) {
      this.flightPhase = 'pad';
      this.velocity = 0;
      this.roll = (Math.random() - 0.5) * 0.4;
      this.pitch = (Math.random() - 0.5) * 0.4;
    } else if (this.flightTime < 18) {
      this.flightPhase = 'boost';
      const boostAccel = 24.5 + Math.sin(this.flightTime * 2) * 4; // ~2.5g
      az = boostAccel / 9.81;
      ax = Math.sin(this.flightTime * 3) * 0.4;
      ay = Math.cos(this.flightTime * 3) * 0.4;
      this.velocity += (boostAccel - 9.81) * dt;
      this.altitude += this.velocity * dt;

      // Rocket spin stabilization
      gz = 180 + Math.sin(this.flightTime) * 30; // 180 deg/sec spin
      this.roll = (this.roll + gz * dt) % 360;
      this.pitch = 85 + Math.sin(this.flightTime * 0.5) * 4;
    } else if (this.flightTime < 38) {
      this.flightPhase = 'coasting';
      az = -9.81 / 9.81 * 0.1; // microgravity during coast
      this.velocity -= 9.81 * dt;
      this.altitude += this.velocity * dt;

      this.pitch = Math.sin(this.flightTime * 0.3) * 25;
      this.roll += Math.cos(this.flightTime * 0.2) * 10 * dt;
      gx = Math.cos(this.flightTime) * 12;
      gy = Math.sin(this.flightTime) * 8;
    } else if (this.flightTime < 80) {
      this.flightPhase = 'descent';
      // Terminal velocity under parachute ~ 6 m/s
      const targetSpeed = -6.2;
      this.velocity += (targetSpeed - this.velocity) * 0.4 * dt;
      this.altitude = Math.max(142.5, this.altitude + this.velocity * dt);

      // Parachute oscillation / pendulum swing
      const swingFreq = 0.8;
      this.roll = Math.sin(this.flightTime * swingFreq) * 18 + (Math.random() - 0.5) * 2;
      this.pitch = Math.cos(this.flightTime * swingFreq * 0.8) * 14 + (Math.random() - 0.5) * 2;
      gx = Math.cos(this.flightTime * swingFreq) * 15;
      gy = -Math.sin(this.flightTime * swingFreq * 0.8) * 12;
      gz = (Math.random() - 0.5) * 6;
      az = 1.0 + Math.sin(this.flightTime * 2) * 0.15;

      if (this.altitude <= 142.6) {
        this.flightPhase = 'landed';
      }
    } else {
      this.flightPhase = 'landed';
      this.velocity = 0;
      this.altitude = 142.5;
      this.roll = 72; // payload resting on ground on its side
      this.pitch = 12;
    }

    const totalAcc = Math.sqrt(ax * ax + ay * ay + az * az);

    // Barometric pressure derived from barometric formula
    const seaLevelPressure = 1013.25;
    const baroPressure = seaLevelPressure * Math.pow(Math.max(0.1, 1 - 2.25577e-5 * this.altitude), 5.25588);
    const bmpAltitude = this.altitude + (Math.random() - 0.5) * 0.8;

    // Environmental temperatures lapse rate (~6.5°C per 1000m)
    const lapse = (this.altitude - 142.5) * 0.0065;
    const bmpTemp = Number((this.baseTemp - lapse + (Math.random() - 0.5) * 0.2).toFixed(2));
    const dhtTemp = Number((this.baseTemp - lapse + 0.3 + (Math.random() - 0.5) * 0.3).toFixed(1));
    const humidity = Math.min(100, Math.max(20, Number((this.baseHumidity + lapse * 2 + (Math.random() - 0.5) * 1.2).toFixed(1))));

    // GPS location drift based on velocity & wind
    const windDriftNorth = 0.000003 * dt;
    const windDriftEast = 0.000005 * dt;
    this.lat += windDriftNorth;
    this.lon += windDriftEast;
    const speedKmph = Math.abs(this.velocity * 3.6);

    const packet: TelemetryData = {
      packetNo: this.packetCount,
      timestamp: Date.now(),
      temperature: dhtTemp,
      humidity: humidity,
      ax: Number(ax.toFixed(3)),
      ay: Number(ay.toFixed(3)),
      az: Number(az.toFixed(3)),
      totalAcc: Number(totalAcc.toFixed(3)),
      gx: Number(gx.toFixed(2)),
      gy: Number(gy.toFixed(2)),
      gz: Number(gz.toFixed(2)),
      roll: Number(this.roll.toFixed(2)),
      pitch: Number(this.pitch.toFixed(2)),
      latitude: Number(this.lat.toFixed(6)),
      longitude: Number(this.lon.toFixed(6)),
      altitude: Number(this.altitude.toFixed(2)),
      speed: Number(speedKmph.toFixed(2)),
      satellites: 9 + Math.floor(Math.sin(this.flightTime * 0.05) * 2),
      gpsFix: 1,
      bmpTemperature: bmpTemp,
      pressure: Number(baroPressure.toFixed(2)),
      bmpAltitude: Number(bmpAltitude.toFixed(2)),
    };

    if (this.onPacketCallback) {
      this.onPacketCallback(packet);
    }
  }
}
