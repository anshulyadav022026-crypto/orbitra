import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Cpu, Radio, Server } from 'lucide-react';

interface ReferenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BACKEND_CODE = `const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

const SERIAL_PORT = "COM6";
const BAUD_RATE = 115200;
const WS_PORT = 8081;

const serial = new SerialPort({
  path: SERIAL_PORT,
  baudRate: BAUD_RATE
});

const parser = serial.pipe(
  new ReadlineParser({ delimiter: "\\n" })
);

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on("listening", () => {
  console.log(\`WebSocket server running at ws://localhost:\${WS_PORT}\`);
});

serial.on("open", () => {
  console.log(\`ESP8266 connected on \${SERIAL_PORT}\`);
});

serial.on("error", (err) => {
  console.error("Serial error:", err.message);
});

parser.on("data", (line) => {
  try {
    const data = JSON.parse(line.trim());

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

    const telemetry = {
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
      bmpAltitude: Number(data.bmpAltitude)
    };

    console.log("Telemetry:", telemetry);
    const message = JSON.stringify(telemetry);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch {
    // Ignore non-JSON serial lines.
  }
});

wss.on("connection", (socket) => {
  console.log("Telemetry dashboard client connected");
});`;

const RECEIVER_CODE = `#include <WiFi.h>
#include <esp_now.h>
#include <string.h>
#include <stdint.h>
#include <esp_wifi.h>

#define WIFI_CHANNEL 1

struct SensorPacket {
  uint32_t packetNo;
  float temperature;
  float humidity;
  float ax;
  float ay;
  float az;
  float totalAcc;
  float gx;
  float gy;
  float gz;
  float roll;
  float pitch;
  double latitude;
  double longitude;
  float altitude;
  float speed;
  uint32_t satellites;
  uint8_t gpsFix;
  float bmpTemperature;
  float pressure;
  float bmpAltitude;
};

SensorPacket receivedData;
volatile bool newPacketAvailable = false;
volatile bool invalidPacketReceived = false;

void onReceive(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
  if (len != sizeof(SensorPacket)) {
    invalidPacketReceived = true;
    return;
  }
  memcpy(&receivedData, incomingData, sizeof(SensorPacket));
  newPacketAvailable = true;
}

void printTelemetryJSON(const SensorPacket &d) {
  Serial.print("{\\"packetNo\\":");
  Serial.print(d.packetNo);
  Serial.print(",\\"temperature\\":");
  Serial.print(d.temperature, 2);
  Serial.print(",\\"humidity\\":");
  Serial.print(d.humidity, 2);
  Serial.print(",\\"ax\\":");
  Serial.print(d.ax, 3);
  Serial.print(",\\"ay\\":");
  Serial.print(d.ay, 3);
  Serial.print(",\\"az\\":");
  Serial.print(d.az, 3);
  Serial.print(",\\"totalAcc\\":");
  Serial.print(d.totalAcc, 3);
  Serial.print(",\\"gx\\":");
  Serial.print(d.gx, 2);
  Serial.print(",\\"gy\\":");
  Serial.print(d.gy, 2);
  Serial.print(",\\"gz\\":");
  Serial.print(d.gz, 2);
  Serial.print(",\\"roll\\":");
  Serial.print(d.roll, 2);
  Serial.print(",\\"pitch\\":");
  Serial.print(d.pitch, 2);
  Serial.print(",\\"latitude\\":");
  Serial.print(d.latitude, 6);
  Serial.print(",\\"longitude\\":");
  Serial.print(d.longitude, 6);
  Serial.print(",\\"altitude\\":");
  Serial.print(d.altitude, 2);
  Serial.print(",\\"speed\\":");
  Serial.print(d.speed, 2);
  Serial.print(",\\"satellites\\":");
  Serial.print(d.satellites);
  Serial.print(",\\"gpsFix\\":");
  Serial.print(d.gpsFix);
  Serial.print(",\\"bmpTemperature\\":");
  Serial.print(d.bmpTemperature, 2);
  Serial.print(",\\"pressure\\":");
  Serial.print(d.pressure, 2);
  Serial.print(",\\"bmpAltitude\\":");
  Serial.print(d.bmpAltitude, 2);
  Serial.println("}");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(WIFI_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) return;
  esp_now_register_recv_cb(onReceive);
}

void loop() {
  if (newPacketAvailable) {
    noInterrupts();
    SensorPacket packetCopy;
    memcpy(&packetCopy, &receivedData, sizeof(SensorPacket));
    newPacketAvailable = false;
    interrupts();
    printTelemetryJSON(packetCopy);
  }
  delay(1);
}`;

const TRANSMITTER_CODE = `// ESP32 Transmitter Architecture Summary
// Wireless: ESP-NOW on WiFi Channel 1
// Target MAC: 24:D7:EB:CD:36:E4
// MPU6500: SDA GPIO21, SCL GPIO22 (I2C Bus 0)
// BMP280:  SDA GPIO25, SCL GPIO26 (I2C Bus 1)
// DHT11:   DATA GPIO4
// GPS:     TX -> ESP32 GPIO16 (RX2)`;

export const ReferenceViewerModal: React.FC<ReferenceViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'backend' | 'receiver' | 'transmitter' | 'pinouts'>('backend');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const getCode = () => {
    switch (activeTab) {
      case 'backend':
        return BACKEND_CODE;
      case 'receiver':
        return RECEIVER_CODE;
      case 'transmitter':
        return TRANSMITTER_CODE;
      default:
        return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-[#121212] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-[#000000] border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-[#FFFFFF]" />
            <div>
              <h3 className="text-sm font-bold text-[#FFFFFF] tracking-wide">
                HARDWARE & BACKEND ARCHITECTURE REFERENCE
              </h3>
              <p className="text-xs text-[#8E8E93]">
                Original reference scripts for ESP32 transmitter, receiver, and Node.js serial bridge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#000000]/80 border-b border-[#262626] text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('backend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'backend'
                  ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>backend.js (Node.js / WS)</span>
            </button>

            <button
              onClick={() => setActiveTab('receiver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'receiver'
                  ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>reciever.ino (ESP-NOW)</span>
            </button>

            <button
              onClick={() => setActiveTab('transmitter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'transmitter'
                  ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>transmitter.ino (Sensors)</span>
            </button>

            <button
              onClick={() => setActiveTab('pinouts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'pinouts'
                  ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              <span>Wiring & Pinouts</span>
            </button>
          </div>

          {activeTab !== 'pinouts' && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#121212] hover:bg-[#262626] text-[#FFFFFF] text-xs font-semibold transition-colors border border-[#262626]"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#121212]">
          {activeTab === 'pinouts' ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#000000] border border-[#262626]">
                <h4 className="font-bold text-[#FFFFFF] mb-2 text-sm">Transmitter ESP32 Sensor Connections</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-2.5 rounded bg-[#121212] border border-[#262626]">
                    <span className="text-[#FFFFFF] font-bold block mb-1">MPU6500 6-DOF IMU (I2C Bus 0)</span>
                    <p className="text-[#8E8E93]">SDA: GPIO 21</p>
                    <p className="text-[#8E8E93]">SCL: GPIO 22</p>
                    <p className="text-stone-500">Scale: Accel ±2g, Gyro 250 dps</p>
                  </div>

                  <div className="p-2.5 rounded bg-[#121212] border border-[#262626]">
                    <span className="text-[#FFFFFF] font-bold block mb-1">BMP280 Barometer (I2C Bus 1)</span>
                    <p className="text-[#8E8E93]">SDA: GPIO 25</p>
                    <p className="text-[#8E8E93]">SCL: GPIO 26</p>
                    <p className="text-stone-500">I2C Address: 0x76</p>
                  </div>

                  <div className="p-2.5 rounded bg-[#121212] border border-[#262626]">
                    <span className="text-[#FFFFFF] font-bold block mb-1">DHT11 Temp & Humidity</span>
                    <p className="text-[#8E8E93]">DATA: GPIO 4</p>
                    <p className="text-stone-500">Single wire digital interface</p>
                  </div>

                  <div className="p-2.5 rounded bg-[#121212] border border-[#262626]">
                    <span className="text-[#FFFFFF] font-bold block mb-1">NEO-6M GPS Module</span>
                    <p className="text-[#8E8E93]">GPS TX → ESP32 RX2 (GPIO 16)</p>
                    <p className="text-stone-500">Baud: 9600 bps</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#000000] border border-[#262626]">
                <h4 className="font-bold text-[#FFFFFF] mb-2 text-sm">Wireless ESP-NOW & Host Bridge</h4>
                <div className="space-y-2 text-[#8E8E93]">
                  <p>
                    • <strong className="text-[#FFFFFF]">WiFi Channel:</strong> 1 (channel must match on transmitter & receiver).
                  </p>
                  <p>
                    • <strong className="text-[#FFFFFF]">Receiver MAC:</strong> <code className="bg-[#121212] px-1.5 py-0.5 rounded text-[#FFFFFF] font-bold border border-[#262626]">24:D7:EB:CD:36:E4</code>
                  </p>
                  <p>
                    • <strong className="text-[#FFFFFF]">Serial Connection:</strong> ESP Receiver connected via USB COM port (<code className="bg-[#121212] px-1.5 py-0.5 rounded text-[#FFFFFF] font-bold border border-[#262626]">COM6</code>, 115200 baud).
                  </p>
                  <p>
                    • <strong className="text-[#FFFFFF]">Backend Script:</strong> <code className="bg-[#121212] px-1.5 py-0.5 rounded text-[#FFFFFF] font-bold border border-[#262626]">node backend.js</code> runs WebSocket server on <code className="bg-[#121212] px-1.5 py-0.5 rounded text-[#FFFFFF] font-bold border border-[#262626]">ws://localhost:8081</code>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <pre className="p-4 rounded-xl bg-[#000000] border border-[#262626] font-mono text-xs text-[#FFFFFF] overflow-x-auto select-text leading-relaxed shadow-sm">
              {getCode()}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
