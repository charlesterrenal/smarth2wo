# Complete Setup Guide

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
Get these from: Supabase Dashboard  Project Settings  API

#### PayMongo Configuration
```env
PAYMONGO_PUBLIC_KEY=pk_live_xxxxx
PAYMONGO_SECRET_KEY=sk_live_xxxxx
```
Get these from: [PayMongo Dashboard](https://dashboard.paymongo.com)  API Keys

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

Go to Supabase Dashboard  SQL Editor  Run these queries:

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
- **Status:**  Automatically initialized on startup

#### PayMongo (Payment Processing)
- **Purpose:** QR code payments via GCash
- **Flow:** ESP32  Backend  QR Code  Customer Payment
- **Setup:** See [PayMongo Documentation](https://developers.paymongo.com)
- **Testing:** Use "Simulate Payment Success" in admin panel
- **Status:**  Integrated and working

#### Resend (Email Alerts)
- **Purpose:** Automated notifications for system events
- **Alerts Sent For:**
  -  Transaction confirmations
  -  Water level warnings (< 20% or < 10%)
  -  Maintenance due notifications
  -  System anomalies (pressure, temperature, flow rate)
- **Cooldown:** Same alert won't send twice within 30 minutes
- **Status:**  Fully integrated

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
  - 3 volume buttons  GPIO 12, 13, 14
  - 2 payment buttons  GPIO 25, 32
- 2.4" or 2.8" TFT SPI display (ILI9341 driver)
- 1 LED + 220Ω resistor (for testing) OR relay/MOSFET for the pump
- Allan 1239A coin acceptor + 12V/1A supply (Phase 2)
- WiFi network access

### Wiring Diagram

All buttons use the ESP32's internal pull-up (`INPUT_PULLUP`) — no external
resistors needed.

**Volume buttons:**
```
BTN 100ml    GPIO 12  GND
BTN 500ml    GPIO 13  GND
BTN 1000ml   GPIO 14  GND
```

**Payment buttons:**
```
BTN QR Pay    GPIO 25  GND
BTN Coin Pay  GPIO 32  GND
```

**TFT Display (SPI):**
```
MOSI  GPIO 23
SCLK  GPIO 18
MISO  GPIO 19   (optional)
CS    GPIO 5
DC    GPIO 27
RST   GPIO 33
VCC   3.3V       (NOT 5V)
GND   GND
LED   3.3V       (backlight)
```

**LED (test) / Pump output:**
```
GPIO 26  LED through 220Ω  GND
          (production: GPIO 26  Relay In / MOSFET Gate  pump)
```

**Coin acceptor (Phase 2):**
```
Allan 1239A RED    +12V external supply
Allan 1239A BLACK  external supply GND + ESP32 GND (common ground!)
Allan 1239A WHITE  GPIO 34
                    (measure signal voltage first; if 12V, use a voltage
                    divider or PC817 optocoupler)
```

See [backend/ESP32_MQTT_GUIDE.md](backend/ESP32_MQTT_GUIDE.md) for full details
on the coin acceptor wiring and Allan 1239A programming.

### Arduino IDE Setup

1. Install ESP32 board:
   - File  Preferences
   - Add: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools  Board Manager  Search "esp32"  Install

2. Install libraries:
   - Sketch  Include Library  Manage Libraries
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
3. Tools  Board  "ESP32 Dev Module"
4. Tools  Upload Speed  921600
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

3. Press button on ESP32  QR appears on display
4. Scan QR  Payment gateway opens
5. Test payment flow

---

## Part 5: Production Deployment

The recommended production setup uses a unified Docker Compose stack (`docker-compose.prod.yml`) paired with Cloudflare Tunnels to safely expose the services to the internet without opening router ports.

### 1. Build and Run the Stack

The production stack spins up three containers:
- `frontend` (React Dashboard) on port `80`
- `landing` (React Marketing Page) on port `81`
- `backend` (FastAPI) on port `8000`

First, create the necessary `.env` files on your server (these are ignored by Git):
- `backend/.env` (Supabase, PayMongo, Resend, MQTT credentials)
- `frontend/.env` (Vite Supabase credentials)

Then build and start the containers in detached mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 2. Configure Cloudflare Tunnel (cloudflared)

Install `cloudflared` on your server or a separate Gateway LXC. Edit your `/etc/cloudflared/config.yml` to map your subdomains to the Docker ports:

```yaml
ingress:
  - hostname: smarth2wo.tech
    service: http://<DOCKER_SERVER_IP>:81      # Landing Page

  - hostname: dash.smarth2wo.tech
    service: http://<DOCKER_SERVER_IP>:80      # Dashboard

  - hostname: api.smarth2wo.tech
    service: http://<DOCKER_SERVER_IP>:8000    # FastAPI Backend

  - service: http_status:404
```

Restart the tunnel:
```bash
systemctl restart cloudflared
```

### 3. Setup DNS Records

Go to your Cloudflare Dashboard -> DNS. For each subdomain (`@`, `dash`, `api`), create a `CNAME` record pointing to your tunnel's `.cfargotunnel.com` target, with the Orange Cloud (Proxy) enabled.

Finally, go to **SSL/TLS -> Edge Certificates** and turn on **Always Use HTTPS** to automatically encrypt all traffic.

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
# Supabase Dashboard  Table Editor
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


---

# Quickstart Guide

# Quick Start Reference

**New to the project?** Start with [SETUP.md](SETUP.md) instead (complete step-by-step guide).

This page is a quick reference for developers who are already set up.

---

## Start Services (Every Session)

### Terminal 1 - Backend

```bash
cd backend
.\venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # macOS/Linux

python main.py
# Running on http://localhost:8000
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

### Terminal 3 - ngrok (for PayMongo webhooks)

**Required for payment testing to receive webhooks**

```bash
ngrok http 8000
# Copy the https://xxxxx.ngrok-free.app URL
# Update webhook URL in PayMongo dashboard: https://xxxxx.ngrok-free.app/api/payments/webhook
```

**Note:** ngrok URL changes each time you restart. Update PayMongo webhook URL accordingly.

---

## Development Commands

### Backend
```bash
# Activate environment (first time only in new terminal)
.\venv\Scripts\activate     # Windows
source venv/bin/activate    # macOS/Linux

# Run server
python main.py

# Run with auto-reload
uvicorn main:app --reload

# Install new package
pip install package-name
pip freeze > requirements.txt
```

### Frontend
```bash
# Install dependencies (first time only)
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install package-name
```

---

## URLs

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| Admin Payments | http://localhost:5173/admin/payments |
| System Logs | http://localhost:5173/logs |
| API Docs | http://localhost:8000/docs |
| API ReDoc | http://localhost:8000/redoc |

---

## Common Tasks

### Test Payment Flow
1. Go to http://localhost:5173/admin/payments
2. Click a dispenser button (100ml, 500ml, 1L)
3. Click "Simulate Payment Success"
4. Check System Logs page

### Check Backend Health
```bash
curl http://localhost:8000/health
```

### View Database Logs
1. Go to Supabase Dashboard
2. SQL Editor  New Query
3. Run: `SELECT * FROM logs ORDER BY created_at DESC LIMIT 10;`

### Test Email Alerts
```bash
# Water level alert
curl -X POST http://localhost:8000/api/maintenance/predict \
  -H "Content-Type: application/json" \
  -d '{"water_level_pct": 15, "temperature": 30, "flow_rate": 5.0, "pressure": 50, "power_on": true}'

# Anomaly alert
curl -X POST http://localhost:8000/api/anomalies/detect \
  -H "Content-Type: application/json" \
  -d '{"water_level_pct": 2, "temperature": 52, "flow_rate": 0.05, "pressure": 110, "power_on": false}'
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8000 in use | `netstat -ano \| findstr :8000` then `taskkill /PID <PID> /F` (Windows) or `lsof -i :8000 \| kill -9` (Mac/Linux) |
| Port 5173 in use | Kill process on port 5173 |
| Backend won't start | Ensure venv is activated (should see `(venv)` in terminal) |
| Frontend won't start | Delete `node_modules`, run `npm install` again |
| Can't connect to Supabase | Check credentials in `.env` and `.env.local` |
| Emails not sending | Verify `RESEND_API_KEY` and sender domain in Resend dashboard |
| Webhooks not received | 1. Check ngrok is running<br>2. Verify webhook URL in PayMongo dashboard<br>3. Look for "WEBHOOK RECEIVED" in backend logs |
| QR code won't scan | See backend logs for "DEBUG: PayMongo checkout response" - QR PH string should be present |

**Full troubleshooting?** See [SETUP.md  Troubleshooting](SETUP.md#troubleshooting)

---

## Project Structure

```
smarth2wo/
├── SETUP.md                START HERE for setup
├── README.md              Project overview
├── QUICKSTART.md          (this file)
├── GITHUB_SETUP.md        Git workflow
│
├── frontend/              React + Vite
│   ├── src/pages/         Dashboard, Logs, AdminPayments, etc.
│   ├── src/lib/           API utilities, Supabase client
│   └── package.json
│
├── landing/               React + Vite (Static Marketing Page)
│   ├── src/sections/      Landing page sections
│   └── package.json
│
├── backend/               FastAPI + Python
│   ├── main.py            All API endpoints
│   ├── paymongo_service.py PayMongo integration
│   ├── mqtt_service.py     IoT communication
│   ├── email_service.py    Email notifications
│   ├── requirements.txt
│   └── venv/              Virtual environment (local only)
│
└── docker-compose.yml     Optional Docker setup
```

---

## Key Features

 **Real-time MQTT** - ESP32 hardware integration  
 **Payment Processing** - PayMongo QR codes  
 **Email Alerts** - Resend notifications  
 **Predictive Maintenance** - ML-powered predictions  
 **Anomaly Detection** - System health monitoring  
 **Beautiful Dashboard** - React + Tailwind UI  

---

## Need Help?

- **Full setup?**  [SETUP.md](SETUP.md)
- **Backend details?**  [backend/ESP32_MQTT_GUIDE.md](backend/ESP32_MQTT_GUIDE.md)
- **Git workflow?**  [GITHUB_SETUP.md](GITHUB_SETUP.md)
- **Frontend?**  [frontend/README.md](frontend/README.md)

---

