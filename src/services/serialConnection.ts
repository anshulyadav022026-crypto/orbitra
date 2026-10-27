import { TelemetryData } from '../types/telemetry';

export class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private keepReading: boolean = false;
  private onPacketCallback: ((data: TelemetryData) => void) | null = null;
  private onStatusCallback: ((status: 'connected' | 'disconnected' | 'error', err?: string) => void) | null = null;

  public static isSupported(): boolean {
    return 'serial' in navigator;
  }

  public async connect(
    baudRate: number = 115200,
    onPacket: (data: TelemetryData) => void,
    onStatus: (status: 'connected' | 'disconnected' | 'error', err?: string) => void
  ): Promise<boolean> {
    if (!WebSerialManager.isSupported()) {
      onStatus('error', 'Web Serial API is not supported in this browser. Use Chrome, Edge, or connect via WebSocket.');
      return false;
    }

    this.onPacketCallback = onPacket;
    this.onStatusCallback = onStatus;

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });
      this.keepReading = true;
      this.onStatusCallback('connected');
      this.readLoop();
      return true;
    } catch (err: any) {
      this.onStatusCallback('error', err?.message || 'Failed to open serial port');
      return false;
    }
  }

  public async disconnect() {
    this.keepReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // ignore
      }
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore
      }
      this.port = null;
    }
    if (this.onStatusCallback) {
      this.onStatusCallback('disconnected');
    }
  }

  private async readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          // Keep the remaining partial line
          buffer = lines.pop() || '';

          for (const line of lines) {
            this.handleLine(line.trim());
          }
        }
      }
    } catch (err: any) {
      if (this.keepReading && this.onStatusCallback) {
        this.onStatusCallback('error', err?.message || 'Serial read error');
      }
    } finally {
      this.reader.releaseLock();
      await readableStreamClosed.catch(() => {});
    }
  }

  private handleLine(line: string) {
    if (!line.startsWith('{') || !line.endsWith('}')) return;
    try {
      const data = JSON.parse(line);
      if (
        data.packetNo === undefined ||
        !Number.isFinite(Number(data.temperature)) ||
        !Number.isFinite(Number(data.humidity)) ||
        !Number.isFinite(Number(data.ax)) ||
        !Number.isFinite(Number(data.ay)) ||
        !Number.isFinite(Number(data.az)) ||
        !Number.isFinite(Number(data.totalAcc)) ||
        !Number.isFinite(Number(data.gx)) ||
        !Number.isFinite(Number(data.gy)) ||
        !Number.isFinite(Number(data.gz)) ||
        !Number.isFinite(Number(data.roll)) ||
        !Number.isFinite(Number(data.pitch)) ||
        !Number.isFinite(Number(data.latitude)) ||
        !Number.isFinite(Number(data.longitude)) ||
        !Number.isFinite(Number(data.altitude)) ||
        !Number.isFinite(Number(data.speed)) ||
        !Number.isFinite(Number(data.satellites)) ||
        !Number.isFinite(Number(data.gpsFix)) ||
        !Number.isFinite(Number(data.bmpTemperature)) ||
        !Number.isFinite(Number(data.pressure)) ||
        !Number.isFinite(Number(data.bmpAltitude))
      ) {
        return;
      }

      const telemetry: TelemetryData = {
        packetNo: Number(data.packetNo),
        timestamp: Date.now(),
        temperature: Number(data.temperature),
        humidity: Number(data.humidity),
        ax: Number(data.ax),
        ay: Number(data.ay),
        az: Number(data.az),
        totalAcc: Number(data.totalAcc),
        gx: Number(data.gx),
        gy: Number(data.gy),
        gz: Number(data.gz),
        roll: Number(data.roll),
        pitch: Number(data.pitch),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        altitude: Number(data.altitude),
        speed: Number(data.speed),
        satellites: Number(data.satellites),
        gpsFix: Number(data.gpsFix),
        bmpTemperature: Number(data.bmpTemperature),
        pressure: Number(data.pressure),
        bmpAltitude: Number(data.bmpAltitude),
      };

      if (this.onPacketCallback) {
        this.onPacketCallback(telemetry);
      }
    } catch {
      // ignore
    }
  }
}
