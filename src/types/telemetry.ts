/**
 * Telemetry packet schema matching the ESP32 transmitter,
 * receiver ESP-NOW structure, and Node.js backend JSON payload.
 */

export interface TelemetryData {
  packetNo: number;
  timestamp: number;

  // DHT11 Sensor
  temperature: number; // °C
  humidity: number;    // %

  // MPU6500 Accelerometer
  ax: number;          // g
  ay: number;          // g
  az: number;          // g
  totalAcc: number;    // g (sqrt(ax^2 + ay^2 + az^2))

  // MPU6500 Gyroscope
  gx: number;          // °/s
  gy: number;          // °/s
  gz: number;          // °/s

  // MPU6500 Filtered Attitude
  roll: number;        // degrees (-180 to 180)
  pitch: number;       // degrees (-90 to 90)

  // NEO-6M GPS
  latitude: number;    // decimal degrees
  longitude: number;   // decimal degrees
  altitude: number;    // meters above sea level
  speed: number;       // km/h
  satellites: number;  // satellite count
  gpsFix: number;      // 0 = no fix, 1 = fix acquired

  // BMP280 Barometer
  bmpTemperature: number; // °C
  pressure: number;       // hPa
  bmpAltitude: number;    // meters
}

export type ConnectionMode = 'websocket' | 'serial' | 'simulation';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface TelemetryStats {
  packetsReceived: number;
  packetsLost: number;
  packetRateHz: number;
  lastPacketTime: number | null;
  maxAltitude: number;
  maxTotalAcc: number;
  maxSpeed: number;
  minPressure: number;
}
