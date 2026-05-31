# ESP32 MQTT Integration Guide

Complete guide for connecting ESP32 hardware to SmartH2O backend.

---

## Architecture

```
ESP32 (Hardware)
├── 3 Buttons → POST /api/payments/create-checkout
├── TFT Display → Show QR codes
├── MQTT Listener → smarth2o/dispense topic
└── Pump Output → GPIO trigger when payment confirmed

↓ (MQTT) ↓

Backend (FastAPI)
├── Publishes → smarth2o/dispense when payment confirmed
├── Subscribes → smarth2o/status (ESP32 status updates)
└── Subscribes → smarth2o/sensors (sensor data)

↓ (HTTP) ↓

Frontend (Dashboard)
└── Shows transaction history & logs
```

---

## Quick Start

### Step 1: Backend Setup

1. Install MQTT package:
```bash
pip install paho-mqtt>=1.6.1
```

2. Update `backend/.env`:
```env
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
```

3. Restart backend:
```bash
python main.py
```

You should see:
```
MQTT initialized - Broker: test.mosquitto.org:1883
```

### Step 2: ESP32 Setup

**Hardware needed:**
- ESP32 Dev Board
- 3 Push buttons (100ml, 500ml, 1000ml)
- 2.8" TFT SPI display
- 1 Relay or MOSFET for pump control
- Wires, breadboard

**Wiring:**
```
Buttons:
- BTN 100ml → GPIO 12 (with pulldown resistor 10k)
- BTN 500ml → GPIO 13 (with pulldown resistor 10k)
- BTN 1000ml → GPIO 14 (with pulldown resistor 10k)
- All buttons → GND

TFT Display (SPI):
- MOSI → GPIO 23
- CLK → GPIO 18
- CS → GPIO 5
- DC → GPIO 27
- RST → GPIO 33
- VCC → 3.3V
- GND → GND

Pump:
- GPIO 26 → Relay In / MOSFET Gate
- Relay/MOSFET → Pump power (external 12V recommended)
```

**Arduino IDE Setup:**

1. Install ESP32 board:
   - File → Preferences
   - Add: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools → Board Manager → Search "esp32" → Install

2. Install required libraries:
   - Sketch → Include Library → Manage Libraries
   - Search and install:
     - `TFT_eSPI`
     - `PubSubClient`
     - `ArduinoJson`

3. Configure TFT_eSPI:
   - Find: `Arduino/libraries/TFT_eSPI/User_Setup.h`
   - Uncomment for 2.8" ILI9341:
   ```cpp
   #define ILI9341_DRIVER
   #define TFT_CS   5
   #define TFT_DC   27
   #define TFT_RST  33
   #define TFT_MOSI 23
   #define TFT_SCLK 18
   ```

4. Upload code:
   - Open: `backend/ESP32_ARDUINO.ino`
   - Update WiFi credentials:
     ```cpp
     const char* WIFI_SSID = "YOUR_SSID";
     const char* WIFI_PASSWORD = "YOUR_PASSWORD";
     const char* BACKEND_URL = "http://192.168.x.x:8000";  // Your PC's IP
     ```
   - Tools → Board → "ESP32 Dev Module"
   - Tools → Upload Speed → 921600
   - Upload

---

## Testing

### Test 1: WiFi Connection

Open Serial Monitor (115200 baud):
```
SmartH2O ESP32 Starting...
Connecting to WiFi: YOUR_SSID
WiFi connected!
IP: 192.168.x.x
```

### Test 2: MQTT Connection

Should see:
```
Connecting to MQTT: test.mosquitto.org
MQTT connected!
Subscribed to dispense topic
```

### Test 3: Button → QR Code

1. Press 100ml button on ESP32
2. Display shows "Processing..."
3. Display shows "Scan QR" with transaction ID
4. Backend terminal shows:
```
POST /api/payments/create-checkout
Dispense signal sent: 100ml for transaction...
```

### Test 4: Payment → Dispense

1. Go to http://localhost:5173/admin/payments
2. Click "Simulate Payment Success" with same transaction ID
3. Backend publishes to `smarth2o/dispense`
4. ESP32 receives signal and:
   - Pump GPIO goes HIGH for calculated duration
   - Display shows "Dispensing"
   - Log entry created

---

## Troubleshooting

### ESP32 can't find backend

**Problem:** HTTP requests timeout
```
Connection failed
```

**Solution:**
- Find your PC's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Update `BACKEND_URL = "http://192.168.x.x:8000"` with correct IP
- Ensure PC and ESP32 on same WiFi network
- Check firewall allows port 8000

### MQTT won't connect

**Problem:**
```
MQTT connection failed
```

**Solutions:**
1. Verify broker is reachable: `ping test.mosquitto.org`
2. Check WiFi connection first
3. Try test broker: `mosquitto-broker.herokuapp.com` (or another public broker)
4. Check firewall blocks port 1883

### Buttons not responding

**Problem:** No output when buttons pressed

**Solution:**
- Verify GPIO pins match wiring
- Check pullup/pulldown resistors (10k recommended)
- Open Serial Monitor, press button, check for:
  ```
  Creating checkout...
  ```

### Pump won't trigger

**Problem:** MQTT message received but pump stays off

**Solution:**
- Verify GPIO 26 pin and relay wiring
- Test manually: `digitalWrite(PUMP_PIN, HIGH)` in code
- Check pump power supply (external 12V for strong motors)
- For testing: use LED instead (verify light turns on)

---

## Configuration

### Changing Flow Rate

Adjust pump timing for your specific pump:

```cpp
const float PUMP_ML_PER_SECOND = 10.0;  // ml/sec for your pump
```

**To calibrate:**
1. Set volume to 100ml
2. Measure actual water dispensed
3. Calculate: `actual_ml / (durationMs / 1000) = new_flow_rate`

### Using Different MQTT Broker

For production (self-hosted Mosquitto):

```cpp
const char* MQTT_SERVER = "your-broker.com";
const int MQTT_PORT = 1883;  // or 8883 for TLS
const char* MQTT_USERNAME = "user";
const char* MQTT_PASSWORD = "pass";
```

Backend `.env`:
```env
MQTT_BROKER=your-broker.com
MQTT_PORT=1883
MQTT_USERNAME=user
MQTT_PASSWORD=pass
```

### Display Customization

Change colors:
```cpp
#define TFT_BLACK       0x0000
#define TFT_WHITE       0xFFFF
#define TFT_RED         0xF800
#define TFT_GREEN       0x07E0
#define TFT_BLUE        0x001F
#define TFT_YELLOW      0xFBE0
```

---

## Architecture Benefits (For Final Prototype)

This MQTT setup is **production-ready** because:

1. **Scalable** - Add multiple ESP32s (each gets unique ID)
2. **Reliable** - QoS=1 ensures messages arrive at least once
3. **Flexible** - Easy to add sensors, switches, more pumps
4. **Decoupled** - Backend doesn't care what hardware triggers dispense
5. **Real-time** - No polling, instant response to payments
6. **Secure** - Use TLS + auth for production

When you upgrade to final hardware:
- Replace breadboard with PCB ✓
- Use MOSFET instead of relay ✓
- Add real pump controller ✓
- All MQTT messages stay identical ✓

---

## Next Steps

- [ ] Get WiFi working (Serial Monitor shows IP)
- [ ] Get MQTT working (Serial Monitor shows "MQTT connected")
- [ ] Test button → HTTP request
- [ ] Test button → QR display
- [ ] Test payment simulation → pump trigger
- [ ] Calibrate pump flow rate
- [ ] Add pressure sensor data publishing
- [ ] Add water level sensor data publishing

---

## Monitoring

View all MQTT messages in real-time:

```bash
# Install MQTT client
pip install paho-mqtt

# Subscribe to all topics
mosquitto_sub -h test.mosquitto.org -t "smarth2o/#"
```

You'll see:
```
smarth2o/dispense {"transaction_id":"...", "volume_ml": 500}
smarth2o/status {"status": "dispensing"}
smarth2o/sensors {"water_level": 85, "temperature": 28}
```

---

## Support

- ESP32 docs: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/
- TFT_eSPI: https://github.com/Bodmer/TFT_eSPI
- PubSubClient: https://github.com/knolleary/pubsubclient
- MQTT Broker: https://test.mosquitto.org/
