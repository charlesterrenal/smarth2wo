# SmartH2wo - Complete Setup Guide

This is the **complete setup guide** for the SmartH2wo water dispenser system. Choose your section below.

**New to the project?** Start with [Part 1: Initial Setup](#part-1-initial-setup)

**Already set up?** Jump to [QUICKSTART.md](QUICKSTART.md) instead.

---

## Table of Contents

- [Part 1: Initial Setup](#part-1-initial-setup)
- [Part 2: Backend Setup](#part-2-backend-setup)
- [Part 3: Frontend Setup](#part-3-frontend-setup)
- [Part 4: Hardware Setup (ESP32)](#part-4-hardware-setup-esp32)
- [Part 5: Production Deployment](#part-5-production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Part 1: Initial Setup

### Prerequisites

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up free](https://supabase.com)
- **PayMongo Account** - [Sign up](https://dashboard.paymongo.com)
- **Resend Account** - [Sign up free](https://resend.com)

### Clone Repository

```bash
git clone https://github.com/charlesterrenal/smarth2wo.git
cd smarth2wo
```

### Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## Part 2: Backend Setup

### Environment Configuration

1. **Copy template:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Fill in `.env` with your credentials:**

#### Supabase Configuration
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```
Get these from: Supabase Dashboard → Project Settings → API

#### PayMongo Configuration
```env
PAYMONGO_PUBLIC_KEY=pk_live_xxxxx
PAYMONGO_SECRET_KEY=sk_live_xxxxx
```
Get these from: [PayMongo Dashboard](https://dashboard.paymongo.com) → API Keys

#### MQTT Configuration (IoT Communication)
```env
MQTT_BROKER=broker.hivemq.com  # Public free broker for testing
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
```

#### Resend Email Configuration
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=alerts@your-domain.com
ALERT_RECIPIENT_EMAIL=admin@example.com
EMAIL_COOLDOWN_MINUTES=30
```
Get API key from: [Resend Dashboard](https://resend.com/api-keys)

#### Server Configuration
```env
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=True
ENVIRONMENT=development
```

---

### Database Setup

#### 1. Create Tables in Supabase

Go to Supabase Dashboard → SQL Editor → Run these queries:

**Transactions Table:**
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  customer TEXT,
  volume_ml INT,
  price DECIMAL,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);
```

**Logs Table:**
```sql
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT,
  status TEXT,
  message TEXT,
  volume_ml INT,
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

**Sensor Status Table:**
```sql
CREATE TABLE sensor_status (
  id INT PRIMARY KEY DEFAULT 1,
  water_level_pct FLOAT,
  temperature FLOAT,
  power_on BOOLEAN,
  updated_at TIMESTAMP DEFAULT now()
);
```

**Email Logs Table:**
```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_alert_type_created ON email_logs(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email, created_at DESC);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read email_logs" ON email_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert email_logs" ON email_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update email_logs" ON email_logs FOR UPDATE USING (true);
```

#### 2. Enable RLS on All Tables

For each table (transactions, logs, sensor_status):
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON table_name FOR ALL USING (true);
```

---

### Running the Backend

```bash
cd backend
.\venv\Scripts\activate
python main.py
```

You should see:
```
STARTUP EVENT: Initializing MQTT...
MQTT initialized - Broker: broker.hivemq.com:1883
STARTUP EVENT: Initializing Email Service...
Email service initialized - From: alerts@your-domain.com
API Docs: http://localhost:8000/docs
```

---

### Backend Services

#### MQTT (IoT Communication)
- **Purpose:** Real-time communication with ESP32 hardware
- **Broker:** broker.hivemq.com (free public broker)
- **Topics:**
  - `smarth2o/dispense` - Backend sends dispense commands
  - `smarth2o/status` - ESP32 sends status updates
  - `smarth2o/sensors` - ESP32 sends sensor data
- **Status:** ✅ Automatically initialized on startup

#### PayMongo (Payment Processing)
- **Purpose:** QR code payments via GCash
- **Flow:** ESP32 → Backend → QR Code → Customer Payment
- **Setup:** See [PayMongo Documentation](https://developers.paymongo.com)
- **Testing:** Use "Simulate Payment Success" in admin panel
- **Status:** ✅ Integrated and working

#### Resend (Email Alerts)
- **Purpose:** Automated notifications for system events
- **Alerts Sent For:**
  - 💰 Transaction confirmations
  - 💧 Water level warnings (< 20% or < 10%)
  - 🔧 Maintenance due notifications
  - 🚨 System anomalies (pressure, temperature, flow rate)
- **Cooldown:** Same alert won't send twice within 30 minutes
- **Status:** ✅ Fully integrated

---

## Part 3: Frontend Setup

### Install & Run

```bash
cd frontend
npm install
npm run dev
```

Access at: http://localhost:5173

### Available Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | http://localhost:5173 | Main display |
| System Logs | http://localhost:5173/logs | View all system events |
| Admin Payments | http://localhost:5173/admin/payments | Test payment flow |

### Payment Testing

1. Go to http://localhost:5173/admin/payments
2. Click a dispenser button (100ml, 500ml, 1L)
3. QR code appears on screen
4. Scan with phone
5. Click "Simulate Payment Success"
6. Check logs for dispense confirmation

---

## Part 4: Hardware Setup (ESP32)

### Prerequisites

- ESP32 Dev Board
- 5 Push buttons:
  - 3 volume buttons → GPIO 12, 13, 14
  - 2 payment buttons → GPIO 25, 32
- 2.4" or 2.8" TFT SPI display (ILI9341 driver)
- 1 LED + 220Ω resistor (for testing) OR relay/MOSFET for the pump
- Allan 1239A coin acceptor + 12V/1A supply (Phase 2)
- WiFi network access

### Wiring Diagram

All buttons use the ESP32's internal pull-up (`INPUT_PULLUP`) — no external
resistors needed.

**Volume buttons:**
```
BTN 100ml   → GPIO 12 → GND
BTN 500ml   → GPIO 13 → GND
BTN 1000ml  → GPIO 14 → GND
```

**Payment buttons:**
```
BTN QR Pay   → GPIO 25 → GND
BTN Coin Pay → GPIO 32 → GND
```

**TFT Display (SPI):**
```
MOSI → GPIO 23
SCLK → GPIO 18
MISO → GPIO 19   (optional)
CS   → GPIO 5
DC   → GPIO 27
RST  → GPIO 33
VCC  → 3.3V       (NOT 5V)
GND  → GND
LED  → 3.3V       (backlight)
```

**LED (test) / Pump output:**
```
GPIO 26 → LED through 220Ω → GND
          (production: GPIO 26 → Relay In / MOSFET Gate → pump)
```

**Coin acceptor (Phase 2):**
```
Allan 1239A RED   → +12V external supply
Allan 1239A BLACK → external supply GND + ESP32 GND (common ground!)
Allan 1239A WHITE → GPIO 34
                    (measure signal voltage first; if 12V, use a voltage
                    divider or PC817 optocoupler)
```

See [backend/ESP32_MQTT_GUIDE.md](backend/ESP32_MQTT_GUIDE.md) for full details
on the coin acceptor wiring and Allan 1239A programming.

### Arduino IDE Setup

1. Install ESP32 board:
   - File → Preferences
   - Add: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools → Board Manager → Search "esp32" → Install

2. Install libraries:
   - Sketch → Include Library → Manage Libraries
   - Install: `TFT_eSPI` (Bodmer), `PubSubClient` (Nick O'Leary),
     `ArduinoJson` (Benoit Blanchon), `QRCode` (Richard Moore / ricmoo)

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

### Flash ESP32

1. Open `backend/ESP32_ARDUINO.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* WIFI_SSID = "YOUR_SSID";
   const char* WIFI_PASSWORD = "YOUR_PASSWORD";
   const char* BACKEND_URL = "http://192.168.x.x:8000";  // Your PC IP
   ```
3. Tools → Board → "ESP32 Dev Module"
4. Tools → Upload Speed → 921600
5. Upload

### Testing ESP32

1. Open Serial Monitor (115200 baud)
2. Should see:
   ```
   SmartH2wo ESP32 Starting...
   Connecting to WiFi: YOUR_SSID
   WiFi connected! IP: 192.168.x.x
   Connecting to MQTT: broker.hivemq.com
   MQTT connected!
   ```

3. Press button on ESP32 → QR appears on display
4. Scan QR → Payment gateway opens
5. Test payment flow

---

## Part 5: Production Deployment

### Backend Deployment

**Option 1: Railway (Recommended)**
1. Push code to GitHub
2. Connect Railway to GitHub repo
3. Set environment variables
4. Deploy

**Option 2: Docker**
```bash
docker build -t smarth2o-backend .
docker run -e SUPABASE_URL=... -p 8000:8000 smarth2o-backend
```

### Frontend Deployment

**Option: Vercel (Recommended)**
```bash
npm run build
# Push to GitHub
# Connect Vercel to repo
# Auto-deploys on push
```

### ngrok for Webhook Testing

For local testing of PayMongo webhooks:

```bash
# Install
brew install ngrok  # macOS
choco install ngrok # Windows

# Start tunnel
ngrok config add-authtoken YOUR_AUTH_TOKEN
ngrok http 8000

# Copy public URL and add to PayMongo dashboard
```

---

## Troubleshooting

### Backend Won't Start

**Port 8000 in use:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8000
kill -9 <PID>
```

**Missing dependencies:**
```bash
pip install -r requirements.txt
```

**MQTT connection timeout:**
- Change `MQTT_BROKER` in `.env`
- Try: `broker.hivemq.com`

**Email not sending:**
- Check `RESEND_API_KEY` is set
- Verify sender email is in Resend dashboard
- Check `email_logs` table in Supabase

### Frontend Won't Start

**Port 5173 in use:**
```bash
# Kill process on port 5173
```

**Node modules issue:**
```bash
rm -rf node_modules
npm install
```

### ESP32 Won't Connect

**WiFi issues:**
- Check SSID/password correct
- Ensure WiFi 2.4GHz (not 5GHz)
- Check serial monitor for errors

**MQTT not connecting:**
- Verify broker is reachable
- Check firewall allows port 1883
- Try different broker

**QR not displaying:**
- Check TFT display wiring
- Verify correct GPIO pins
- Check display voltage (3.3V)

---

## Quick Commands Reference

```bash
# Start venv
cd backend
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend
python main.py

# Run frontend
cd frontend
npm run dev

# View API docs
# http://localhost:8000/docs

# View database
# Supabase Dashboard → Table Editor
```

---

## Support & Documentation

- **API Docs:** http://localhost:8000/docs
- **Project Overview:** [README.md](README.md)
- **Quick Reference:** [QUICKSTART.md](QUICKSTART.md)
- **Git Workflow:** [GITHUB_SETUP.md](GITHUB_SETUP.md)
- **ESP32 Guide:** [backend/ESP32_MQTT_GUIDE.md](backend/ESP32_MQTT_GUIDE.md)

---

**Setup complete?** Jump to [QUICKSTART.md](QUICKSTART.md) for running the system daily.
