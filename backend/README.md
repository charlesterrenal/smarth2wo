

---

# Backend API Documentation

# SmartH2wo Backend API

FastAPI-based backend service for the SmartH2wo water dispenser management system. Provides ML-powered maintenance predictions and anomaly detection.

## Features

- **Maintenance Prediction** - AI-driven maintenance scheduling based on sensor data
- **Anomaly Detection** - Real-time detection of system anomalies
- **Sensor Analytics** - Process and analyze water dispenser telemetry
- **CORS Enabled** - Seamless integration with frontend
- **Auto Documentation** - Swagger UI at `/docs`

## Quick Start

### Prerequisites

- **Python 3.9+** (Check with `python --version`)
- **pip** (comes with Python)
- **Git** (for cloning and pushing to GitHub)

### Installation & Setup

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/smarth2wo-backend.git
cd smarth2wo-backend
```

#### 2️⃣ Create Virtual Environment (Required)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

#### 3️⃣ Install Dependencies
```bash
pip install -r requirements.txt
```

> **Note**: `scikit-learn` / `numpy` / `pandas` are optional (see `requirements-ml.txt`). The API runs without them. If `pip` tries to compile packages and asks for Visual C++, use Python 3.12 or install only `requirements.txt` (not `requirements-ml.txt`).

#### 4️⃣ (Optional) Configure Environment
```bash
# Create .env file for environment variables (optional)
# cp .env.example .env
# Edit .env with your settings if needed
```

### Running the Server

**Every time you want to run the backend:**

```bash
# Navigate to backend directory
cd smarth2wo-backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Start the API server
python main.py
```

**Output should show:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Access the API:**
-  API Base: `http://localhost:8000`
- Interactive Docs (Swagger UI): `http://localhost:8000/docs`
-  Alternative Docs (ReDoc): `http://localhost:8000/redoc`

**For Development with Auto-Reload:**
```bash
uvicorn main:app --reload
```

## API Endpoints

### Health & Status

#### GET `/`
- **Description**: API status check
- **Response**: `{ "status": "ok", "message": "...", "docs": "/docs" }`

#### GET `/health`
- **Description**: Health check endpoint
- **Response**: `{ "status": "healthy", "timestamp": "..." }`

#### GET `/api/status/summary`
- **Description**: Overall system status summary
- **Response**: System metrics and statistics

### Maintenance & Anomalies

#### POST `/api/maintenance/predict`
- **Description**: Predict maintenance needs based on sensor data
- **Request Body**:
```json
{
  "water_level_pct": 75.5,
  "temperature": 38,
  "flow_rate": 2.1,
  "pressure": 45,
  "power_on": true
}
```
- **Response**:
```json
{
  "days_remaining": 30,
  "reason": "Regular maintenance cycle",
  "severity": "low",
  "confidence": 0.85
}
```

#### POST `/api/anomalies/detect`
- **Description**: Detect anomalies in sensor readings
- **Request Body**: Same as maintenance predict
- **Response**:
```json
[
  {
    "type": "High Temperature",
    "message": "System running hot: 45°C",
    "severity": "high",
    "timestamp": "2024-01-15T10:30:00"
  }
]
```

## Sensor Data Reference

All endpoints accept the following optional sensor parameters:

| Parameter | Type | Range | Unit | Description |
|-----------|------|-------|------|-------------|
| `water_level_pct` | float | 0-100 | % | Water tank fill percentage |
| `temperature` | float | -10-60 | °C | System temperature |
| `flow_rate` | float | 0-10 | L/min | Water flow rate |
| `pressure` | float | 0-100 | PSI | System pressure |
| `power_on` | bool | true/false | - | System power status |

## Development

### Project Structure
```
smarth2wo-backend/
├── main.py              # FastAPI application & endpoints
├── requirements.txt     # Python dependencies
├── .env                 # Local configuration (git-ignored)
├── .env.example         # Example configuration
├── venv/                # Virtual environment
└── README.md            # This file
```

### Adding New Endpoints

1. Define a Pydantic model for request/response
2. Create the endpoint function
3. Add docstring with description
4. Auto-documentation updates at `/docs`

Example:
```python
from pydantic import BaseModel

class MyRequest(BaseModel):
    param1: str
    param2: int

@app.post("/api/my-endpoint")
async def my_endpoint(request: MyRequest):
    """Description of what this endpoint does"""
    return {"result": "value"}
```

### Testing

Use the interactive Swagger UI:
```
http://localhost:8000/docs
```

Or test with curl:
```bash
curl -X POST "http://localhost:8000/api/maintenance/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "water_level_pct": 50,
    "temperature": 35,
    "flow_rate": 2.0,
    "pressure": 40,
    "power_on": true
  }'
```

## Frontend Integration

The frontend dashboard connects to this API at `http://localhost:8000`.

Key integration points:
- `/api/maintenance/predict` - Used on Dashboard for maintenance card
- `/api/anomalies/detect` - Used on Dashboard for alerts banner

## Dependencies

- **FastAPI** - Modern web framework for building APIs
- **Uvicorn** - ASGI web server
- **Pydantic** - Data validation using Python type hints
- **scikit-learn** - Machine learning (for future ML models)
- **pandas** - Data processing (for future analytics)
- **numpy** - Numerical computing

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_HOST` | `0.0.0.0` | Server host |
| `BACKEND_PORT` | `8000` | Server port |
| `DEBUG` | `True` | Debug mode |
| `ENVIRONMENT` | `development` | Environment type |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS |

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
netstat -ano | findstr :8000
# Kill the process
taskkill /PID <PID> /F
```

### Module Not Found
```bash
# Ensure virtual environment is activated
pip install -r requirements.txt
```

### CORS Errors
- Ensure `FRONTEND_URL` is in `.env`
- Check frontend is running on correct port
- Verify API is accessible at `http://localhost:8000`

## Production Deployment

### Using Gunicorn (Linux/macOS)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Using Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY main.py .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment-Specific Config
Update `.env` for production:
```
DEBUG=False
ENVIRONMENT=production
FRONTEND_URL=https://yourdomain.com
```

## Future Enhancements

- [ ] Database integration (PostgreSQL with Supabase)
- [ ] Advanced ML models for maintenance prediction
- [ ] Historical data analysis and trending
- [ ] Real-time WebSocket support for live sensor data
- [ ] User authentication and API keys
- [ ] Rate limiting and request throttling
- [ ] Logging and monitoring
- [ ] Unit and integration tests

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues, questions, or suggestions:
-  [Report a Bug](https://github.com/yourusername/smarth2wo-backend/issues)
-  [Request a Feature](https://github.com/yourusername/smarth2wo-backend/issues)
-  Contact: your-email@example.com

## Links

- [Dashboard Repository](https://github.com/yourusername/smarth2wo-dashboard)
- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [API Interactive Docs](http://localhost:8000/docs)




---

# Hardware & MQTT Integration Guide

# ESP32 MQTT Integration Guide

Complete guide for connecting ESP32 hardware to SmartH2wo backend.

---

## Architecture

```
ESP32 (Hardware)
├── 3 Volume Buttons (100ml / 500ml / 1000ml)  start checkout
├── 2 Payment Buttons (QR Pay / Coin Pay)  pick payment method
├── Coin Acceptor (Allan 1239A, Phase 2)  pulse stream  coin credit
├── TFT Display  Ready / Choose Payment / QR / Coin progress / Dispensing
├── HTTP POST   /api/payments/create-checkout (QR path only)
├── MQTT Listener  smarth2o/dispense topic
└── Pump Output  GPIO trigger when payment confirmed

 (MQTT) 

Backend (FastAPI)
├── Publishes   smarth2o/dispense when payment confirmed
├── Subscribes  smarth2o/status (ESP32 status updates)
└── Subscribes  smarth2o/sensors (sensor data)

 (HTTP) 

Frontend (Dashboard)
└── Shows transaction history, logs, sensor status, payments
```

### Payment flow

```
READY  press volume button
   CHOOSE_PAYMENT
        press QR Pay   QR_PAYMENT   scan + pay  MQTT dispense
        press Coin Pay  COIN_PAYMENT  insert coins  auto-dispense
```

Coin payments dispense locally (no backend round-trip) once the credit
reaches the price. QR payments still go through PayMongo + MQTT as before.

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
- 5 Push buttons total:
  - 3 volume buttons (100ml, 500ml, 1000ml)
  - 2 payment buttons (QR Pay, Coin Pay)
- 2.4" or 2.8" TFT SPI display (ILI9341 driver)
- 1 LED + 220Ω resistor (for testing) OR relay/MOSFET for actual pump
- Allan 1239A coin acceptor (or compatible pulse acceptor) — **Phase 2 only**
- 12V DC supply (1A) for the coin acceptor
- Wires, breadboard

**Wiring:**
```
Volume buttons (one leg to GPIO, other leg to GND, no external resistor):
- BTN 100ml    GPIO 12
- BTN 500ml    GPIO 13
- BTN 1000ml   GPIO 14

Payment buttons (same wiring pattern):
- BTN QR Pay   GPIO 25
- BTN Coin Pay  GPIO 32

TFT Display (SPI):
- MOSI  GPIO 23
- SCLK  GPIO 18
- MISO  GPIO 19   (optional, not used in firmware)
- CS    GPIO 5
- DC    GPIO 27
- RST   GPIO 33
- VCC   3.3V       (DO NOT use 5V)
- GND   GND
- LED   3.3V       (backlight)

LED (test) / Pump output:
- GPIO 26  LED anode through 220Ω resistor  GND
            (production: GPIO 26  Relay In / MOSFET Gate  pump)

Coin acceptor (Phase 2 — wire when ready):
- Allan 1239A RED    +12V from external supply
- Allan 1239A BLACK  external supply GND  AND  ESP32 GND (common ground!)
- Allan 1239A WHITE  GPIO 34
    (CAUTION: some 1239A units output 12V on this signal line. Measure with
     a multimeter BEFORE connecting to GPIO 34. If you see 12V, use either
     a voltage divider (20kΩ + 10kΩ) or a PC817 optocoupler to drop to 3.3V.
     If it's floating / open-collector, direct connection is safe.)
- Allan 1239A GREEN  tied to BLACK, or leave disconnected
```

> All buttons use the ESP32's internal pull-up resistors (`INPUT_PULLUP`).
> Do not add external pull-down resistors — they will conflict and may
> cause the input to read LOW (which the firmware interprets as a button
> press) at boot.

**Arduino IDE Setup:**

1. Install ESP32 board:
   - File  Preferences
   - Add: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools  Board Manager  Search "esp32"  Install

2. Install required libraries:
   - Sketch  Include Library  Manage Libraries
   - Search and install:
     - `TFT_eSPI` (by Bodmer)
     - `PubSubClient` (by Nick O'Leary)
     - `ArduinoJson` (by Benoit Blanchon)
     - `QRCode` (by Richard Moore / ricmoo) — used to render the PayMongo QR directly on the TFT

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
   - Tools  Board  "ESP32 Dev Module"
   - Tools  Upload Speed  921600
   - Upload

---

## Testing

### Test 0: TEST_MODE (no WiFi / no backend / no PayMongo)

Use this first to verify the **hardware only** — buttons, TFT, and LED — without
needing the backend, MQTT broker, or PayMongo account.

1. In `ESP32_ARDUINO.ino`, make sure the flag at the top is enabled:
   ```cpp
   #define TEST_MODE true
   ```
2. Upload the sketch. The TFT should boot straight to the **READY** menu
   (header pill reads `TEST`).

#### Test 0a: QR payment path

1. Press any volume button  **Choose Payment** screen appears
2. Press the **QR Pay** button  `Processing...`  real scannable QR appears
3. (Optional: scan the QR with your phone to confirm it decodes; in TEST_MODE
   the URL is a dummy `https://smarth2wo.test/pay/<volume>ml`)
4. After ~5 seconds it auto-confirms "payment" and goes to **Dispensing**
5. The LED on GPIO 26 turns on for a volume-proportional duration
   (100ml ≈ 0.5s, 500ml ≈ 2.5s, 1000ml ≈ 5s)
6. Returns to **READY**

#### Test 0b: Coin payment path (simulated)

In Phase 1, the volume buttons double as coin denominations on the coin screen.
Phase 2 will replace this with real pulses from the Allan 1239A.

1. Press a volume button (e.g. 500ml = ₱10)  **Choose Payment** screen
2. Press the **Coin Pay** button  **Insert Coins** screen with `P0 / P10`
3. Simulate coins:
   - Press **100ml**  adds ₱1
   - Press **500ml**  adds ₱5
   - Press **1000ml**  adds ₱10
   - Progress bar fills as you go
4. Once credit reaches the price, **Dispensing** triggers automatically
5. Returns to **READY**

#### Test 0c: Cancel & timeout paths

- On **Choose Payment**, wait 15 seconds with no input  auto-cancel to READY
- On **Choose Payment**, press a different volume  header updates (no cancel)
- On **QR** screen, press any button (after 1.2s lockout)  cancel to READY
- On **Insert Coins**, wait 60s with insufficient credit  amber **warning**
  screen appears with another 30s extension; wait that out  forfeit + READY
- On **Insert Coins**, press **Coin Pay**  cancel back to READY

Once all three of these test groups pass, flip `TEST_MODE` to `false` and
continue with the live tests below.

### Test 1: WiFi Connection

Open Serial Monitor (115200 baud):
```
SmartH2wo ESP32 Starting...
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

### Test 3: Button  QR Code

1. Press 100ml button on ESP32
2. Display shows "Processing..."
3. Display shows a **real QR code** encoding the PayMongo `checkout_url`.
   Scan it with your phone (GCash or any QR scanner) and it should open the
   PayMongo checkout page for ₱2 / 100ml.
4. Backend terminal shows:
```
POST /api/payments/create-checkout
```

> **Note:** The TFT itself cannot "redirect" to PayMongo — it's a display, not
> a browser. The scan-with-phone flow is the intended UX. If you ever want to
> bypass scanning during development, use `TEST_MODE` (Test 0) or the
> "Simulate Payment Success" button on the admin dashboard.

### Test 4: Payment  Dispense

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
- Replace breadboard with PCB 
- Use MOSFET instead of relay 
- Add real pump controller 
- All MQTT messages stay identical 

---

## Next Steps

- [ ] Get WiFi working (Serial Monitor shows IP)
- [ ] Get MQTT working (Serial Monitor shows "MQTT connected")
- [ ] Test button  HTTP request
- [ ] Test button  QR display
- [ ] Test payment simulation  pump trigger
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




---

# Machine Learning Pipeline

# SmartH2WO Machine Learning Module

This directory contains the machine learning pipeline for predictive maintenance and anomaly detection. We have transitioned from hard-coded heuristics to dynamic AI models capable of analyzing live IoT sensor data.

## Architecture & Features

The module uses lightweight `scikit-learn` algorithms (running entirely on CPU) combined into two predictors:

1. **Maintenance Predictor:** Uses a `RandomForestRegressor` and `RandomForestClassifier` to estimate exact `days_remaining` until maintenance and categorize severity (`low`, `medium`, `high`, `critical`).
2. **Anomaly Detector:** Uses an `IsolationForest` to spot sensor outliers in real-time, and a `RandomForestClassifier` to diagnose specific hardware faults (e.g., `Overheating`, `Pressure Alert`).

Both models require 4 mandatory snapshot inputs from the ESP32: `water_level_pct`, `temperature`, `flow_rate`, and `pressure`.

## Generating Data & Training

Due to physical time constraints, the models are trained on synthetic data based on the AI4I Predictive Maintenance dataset format, algorithmically simulating a 30-day hardware lifecycle.

1. **Generate Synthetic Data (~43k rows):**
   ```bash
   python -m ml.generate_training_data
   ```
2. **Train the Models:**
   ```bash
   python -m ml.train_models
   ```
   This generates `maintenance_model.joblib` and `anomaly_model.joblib` in the `models/` directory.

## Inference & Fallbacks

The FastAPI server initializes `MaintenancePredictor` and `AnomalyDetector` globally at startup to cache the `.joblib` models in memory. 

- **Endpoints:** The ESP32 hits `POST /api/maintenance/predict` and `POST /api/anomalies/detect` every minute.
- **Fail-safe Fallback:** To guarantee 100% hardware uptime, if the `.joblib` files are missing or crash, the API seamlessly falls back to the old, hard-coded rule-based heuristics.

## Limitations
- **Stateless Analysis:** The models analyze an exact snapshot in time; they do not retain a time-series memory of past minutes.
- **Synthetic Blindspots:** You may experience false alarms until the model is eventually fine-tuned on real hardware data.




---

# Machine Learning Next Steps

# Next Steps: Transitioning SmartH2WO ML to Live Hardware

This guide outlines the critical next steps for your thesis project to transition the predictive maintenance and anomaly detection systems from simulated (synthetic) data to live, physical hardware.

---

##  Action Items Checklist

### 1. Merge the ML Branch
- [ ] Create a Pull Request on GitHub from `feature/ml-predictive-maintenance` to `main`.
- [ ] Review modifications in `backend/main.py` and merge the branch to keep your repository unified.

### 2. Configure Live Logging from physical ESP32
- [ ] Flash the Arduino code `backend/ESP32_ARDUINO.ino` onto your ESP32 board.
- [ ] Connect the ZJ-S201 flow sensor, ultrasonic transducer, pressure transducer, and temperature sensors.
- [ ] Verify that the ESP32 successfully calls the backend endpoints (`/api/maintenance/predict` and `/api/anomalies/detect`) on a regular cadence (e.g., once per minute).
- [ ] Verify that incoming sensor payloads are being correctly inserted into the Supabase `sensor_history` table.

### 3. Train Models using the AI4I Dataset
Due to time constraints for collecting real-world failure data, the model will be strictly trained on the AI4I Predictive Maintenance CSV dataset. The live ESP32 hardware will only be used for *inference* (real-time predictions).
- [x] Ensure you are in the `backend` directory.
- [x] Run `python -m ml.train_models` to process the CSV dataset and generate the trained model files.
- [x] Verify that the `.joblib` model files are created in your backend folder. Your backend API will load these pre-trained models to evaluate the incoming live ESP32 sensor data.

### 4. Deploy Backend to Production
- [ ] Deploy the FastAPI backend code to hosting services (e.g., Render, AWS EC2, or Heroku).
- [ ] Add your production environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`) to the hosting dashboard.

### 5. Verify Real-time Alerts
- [ ] Ensure that email alerts are working by setting a valid `RESEND_API_KEY` in your production environment.
- [ ] Confirm that when the ML model predicts critical anomalies (e.g. system overheating or dry runs) or low days remaining, email notifications are instantly dispatched to stakeholders.


