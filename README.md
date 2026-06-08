

---

# SmartH2wo Project Overview

# SmartH2wo

SmartH2wo is a smart water dispenser management system that combines an ESP32-controlled physical dispenser, a FastAPI backend with predictive maintenance and anomaly detection, and a React dashboard for live monitoring. Customers can pay through QR PH (PayMongo) or by inserting coins, and the dispenser releases the selected volume automatically once payment is confirmed.

## Overview

The system links three layers. An ESP32 with a 2.4" TFT display, three volume buttons (100ml, 500ml, 1000ml), two payment-method buttons (QR / Coin), and a coin acceptor (Allan 1239A) handles the customer interaction at the dispenser. After picking a volume the customer chooses how to pay: QR PH renders a scannable PayMongo QR directly on the TFT, and Coin shows a live progress screen that counts inserted credit. A FastAPI backend brokers QR payments, runs maintenance and anomaly rules over incoming sensor data, sends email alerts, and dispatches dispense commands to the ESP32 over MQTT. A React dashboard gives administrators a live view of transactions, sensor status, logs, analytics, and payment activity, with Supabase providing realtime sync between backend writes and the frontend.

## Features

- Dual payment options at the dispenser: **QR PH** (PayMongo, universal — works with GCash, Maya, BPI, BDO, etc.) and **Coins** (Allan 1239A acceptor)
- "Choose payment" screen after selecting a volume, with a 15-second auto-cancel
- Coin progress screen with live credit, progress bar, and a 60+30-second soft-timeout policy (warning before forfeit)
- Dynamic QR PH rendered directly on the dispenser's TFT — no dashboard required
- MQTT-driven dispense flow: paid QR transactions automatically trigger the ESP32 to release water
- Cancel-during-QR: customers can press any button to cancel an in-progress checkout
- TEST_MODE on the firmware for hardware-only validation without WiFi, backend, or PayMongo (volume buttons double as simulated coin denominations on the coin screen)
- Predictive maintenance and anomaly detection based on water level, temperature, flow rate, and pressure
- Email alerts (transactions, low water level, maintenance due, anomalies) through Resend
- Realtime React dashboard with transactions, logs, analytics, sensor status, and admin payments
- Supabase persistence with row-level security for transactions, logs, sensor status, and schedule
- Role-aware admin payments page that can simulate payments for end-to-end testing

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React 18 |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Charts | Recharts |
| Database and realtime | Supabase (PostgreSQL) |
| Backend API | FastAPI (Python 3.11+) |
| Payments | PayMongo (QR PH) |
| Messaging | MQTT (paho-mqtt, HiveMQ public broker) |
| Email | Resend |
| Hardware | ESP32, ILI9341 2.4" TFT, push buttons, LED/relay |
| Firmware libraries | TFT_eSPI, PubSubClient, ArduinoJson, QRCode (ricmoo) |

## Project Structure

```
smarth2wo/
  backend/
    main.py                    # FastAPI app and HTTP routes
    paymongo_service.py        # PayMongo checkout + webhook handling
    mqtt_service.py            # MQTT publish/subscribe for ESP32
    email_service.py           # Resend email alerts
    ESP32_ARDUINO.ino          # ESP32 firmware (Arduino IDE)
    ESP32_MQTT_GUIDE.md        # Hardware wiring and MQTT integration guide
    requirements.txt
    README.md
  frontend/
    src/
      pages/                   # Dashboard, Transaction, AdminPayments,
                               # Analytics, Logs, Settings, Login
      components/              # Sidebar, PageHeader, StatCard, SetupBanner
      context/                 # ThemeContext
      lib/                     # paymentApi, maintenanceApi, supabase, mockData
    supabase_schema.sql
    package.json
    README.md
  landing/
    src/
    index.html
    package.json
  SETUP.md                     # Complete setup guide (start here)
  QUICKSTART.md                # Quick reference for daily development
  GITHUB_SETUP.md              # Git workflow
  CONTRIBUTING.md              # Branching and commit conventions
  README.md                    # This file
```

## Getting Started

### Prerequisites

- Python 3.11 or later
- Node.js 18 or later
- A Supabase project (URL + anon key)
- A PayMongo account with test keys
- A Resend account for email alerts (optional but recommended)
- For the hardware path: an ESP32, a 2.4" ILI9341 TFT, five push buttons (3 volume + 2 payment-method), an LED or relay, and (optional, Phase 2) an Allan 1239A coin acceptor with a 12V supply

### Full setup

See [SETUP.md](SETUP.md) for the complete step-by-step setup of the backend, frontend, and ESP32 hardware, including TFT_eSPI configuration, library installation, and PayMongo + Supabase + Resend credentials.

### Quick start (already configured)

```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
python main.py                   # http://localhost:8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

For the ESP32 firmware, open `backend/ESP32_ARDUINO.ino` in Arduino IDE, install the libraries listed in [backend/ESP32_MQTT_GUIDE.md](backend/ESP32_MQTT_GUIDE.md), set your WiFi and `BACKEND_URL`, and upload.

## Architecture

```
ESP32 dispenser
  volume btn  ---> CHOOSE_PAYMENT screen
  QR Pay btn  ---> POST /api/payments/create-checkout ---> QR on TFT
  Coin Pay btn ---> COIN_PAYMENT screen
  coin pulses ---> credit accumulates ---> auto-dispense when paid
  MQTT       <--- smarth2o/dispense (triggers pump/LED, QR path)
  MQTT        ---> smarth2o/status, smarth2o/sensors

Backend (FastAPI)
  PayMongo --> webhook /api/payments/webhook --> MQTT dispense
  Supabase <-- transactions, logs, sensor_status
  Resend   <-- transaction, water level, maintenance, anomaly alerts

Frontend (React)
  Realtime <-- Supabase (transactions, logs, sensor status)
  Admin    --> /admin/payments (create checkout, simulate payment)
```

## Backend API

The dashboard and ESP32 talk to FastAPI at the URL defined by `VITE_API_URL` and `BACKEND_URL` respectively (default `http://localhost:8000`). Interactive docs are served at `/docs` and `/redoc`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | API status and link to docs |
| GET | `/health` | Health check |
| GET | `/api/status/summary` | System status summary used by the dashboard |
| POST | `/api/maintenance/predict` | Rule-based maintenance prediction from sensor data |
| POST | `/api/anomalies/detect` | Anomaly detection from sensor data |
| POST | `/api/payments/create-checkout` | Create a PayMongo QR PH checkout for the dispenser |
| POST | `/api/payments/webhook` | PayMongo webhook handler; publishes MQTT dispense on success |
| GET | `/api/payments/status/{transaction_id}` | Look up a transaction |

## Documentation

- [SETUP.md](SETUP.md) - Complete setup guide (backend, frontend, hardware, deployment, troubleshooting)
- [QUICKSTART.md](QUICKSTART.md) - Daily development quick reference
- [backend/README.md](backend/README.md) - Backend details and API reference
- [backend/ESP32_MQTT_GUIDE.md](backend/ESP32_MQTT_GUIDE.md) - ESP32 hardware wiring and MQTT integration
- [frontend/README.md](frontend/README.md) - Frontend details
- [GITHUB_SETUP.md](GITHUB_SETUP.md) - Git workflow
- [CONTRIBUTING.md](CONTRIBUTING.md) - Branching and commit conventions

## License

MIT License.

## Team

| Name | Role |
|------|------|
| Charles Vincent P. Terrenal | Project Lead, Full Stack Developer, Hardware Assembly and Integration |
| Anne Margareth B. Medina | Frontend Lead, UI Development and Design |
| Marielle Lois P. Bahuyo | Full Stack Developer, Frontend and Backend Development |
| Wilbert Lancelot S. Aguilar | UI/UX Designer, Hardware Assembly |




---

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




---

# Quickstart Reference

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
2. SQL Editor → New Query
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

**Full troubleshooting?** See [SETUP.md → Troubleshooting](SETUP.md#troubleshooting)

---

## Project Structure

```
smarth2wo/
├── SETUP.md               ← START HERE for setup
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

✅ **Real-time MQTT** - ESP32 hardware integration  
✅ **Payment Processing** - PayMongo QR codes  
✅ **Email Alerts** - Resend notifications  
✅ **Predictive Maintenance** - ML-powered predictions  
✅ **Anomaly Detection** - System health monitoring  
✅ **Beautiful Dashboard** - React + Tailwind UI  

---

## Need Help?

- **Full setup?** → [SETUP.md](SETUP.md)
- **Backend details?** → [backend/ESP32_MQTT_GUIDE.md](backend/ESP32_MQTT_GUIDE.md)
- **Git workflow?** → [GITHUB_SETUP.md](GITHUB_SETUP.md)
- **Frontend?** → [frontend/README.md](frontend/README.md)

---

**Ready?** Run the commands above and you're all set! 🚀




---

# Contributing Guidelines

# Contributing to SmartH2wo

Thanks for contributing. This document covers the branching model and commit conventions used across the project. For the full team Git workflow, see [GIT_WORKFLOW.md](GIT_WORKFLOW.md), and for initial setup instructions, see [GITHUB_SETUP.md](GITHUB_SETUP.md).

## Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Make your changes and commit using the convention below.
3. Push the branch:
   ```bash
   git push origin feature/your-feature
   ```
4. Open a Pull Request against `main` with a clear summary of what changed and why.

## Commit Convention

Use a short type prefix followed by a concise description in the imperative mood.

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no code change |
| `refactor:` | Code restructuring with no behavior change |
| `test:` | Adding or updating tests |
| `chore:` | Tooling, build, or maintenance |

Examples:

```
feat(esp32): cancel checkout during QR
fix(backend): handle missing PayMongo metadata in webhook
docs(readme): rewrite for clarity and move details into SETUP.md
```

A scope in parentheses (`esp32`, `backend`, `frontend`, `docs`, etc.) is encouraged when the change is localized.

## Pull Requests

- Keep PRs focused and reasonably small.
- Include a short summary of the change and the motivation.
- Note any manual steps required (database migrations, env var changes, hardware reflashing).
- Link related issues if applicable.

## Code Style

- Backend: follow standard Python conventions (PEP 8). Keep handlers thin and put logic in service modules.
- Frontend: keep components small and colocated by feature where possible. Use Tailwind utilities consistently.
- Firmware: keep one responsibility per function, prefer the existing UI primitives (`uiHeader`, `uiCenterText`, `uiVolumeRow`, etc.) over ad-hoc drawing code, and avoid blocking the main loop for long periods.

## Secrets

Never commit `.env` files or credentials. Use `.env.example` files as a template and document any new variables there.




---

# GitHub Setup

# SmartH2wo Monorepo - GitHub Setup Guide

This is now a **monorepo** containing both frontend and backend in one repository.

---

## What's Inside

```
smarth2wo-monorepo/
├── frontend/          React Dashboard (npm run dev)
├── backend/           FastAPI Backend (python main.py)
├── README.md          Project documentation
└── .gitignore         Ignores node_modules, venv, .env, etc.
```

---

## Step 1: Initialize Git Repository

```bash
cd smarth2wo-monorepo

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "chore: initial monorepo commit - frontend + backend"

# Rename branch to main (if needed)
git branch -M main
```

---

## Step 2: Connect to GitHub

1. **Create repository on GitHub**: https://github.com/new
   - **Repository name**: `smarth2wo` (or `smarth2wo-monorepo`)
   - **Description**: Smart water dispenser management system - full stack
   - **Visibility**: Public or Private
   - **DO NOT** initialize with README

2. **Link remote repository** (replace USERNAME):

```bash
git remote add origin https://github.com/USERNAME/smarth2wo.git
```

3. **Verify remote**:

```bash
git remote -v
# Should show:
# origin  https://github.com/USERNAME/smarth2wo.git (fetch)
# origin  https://github.com/USERNAME/smarth2wo.git (push)
```

---

## Step 3: Push to GitHub

```bash
# Push to GitHub
git push -u origin main

# Future pushes (after this):
git push
```

**First time only** - You may be prompted for credentials:
- Use your GitHub username and **personal access token** (not password)
- Or set up SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

## Verify on GitHub

1. Visit: `https://github.com/USERNAME/smarth2wo`
2. Check files are visible:
   - frontend/ folder
   - backend/ folder
   - README.md
   - .gitignore
3. Verify ignored files are **NOT** uploaded:
   - frontend/node_modules
   - backend/venv
   - .env files

---

## Git Workflow (Going Forward)

Every time you make changes:

```bash
# See what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "feat: add user authentication to backend"

# Push to GitHub
git push
```

---

## Commit Message Convention

Keep commit messages clear and organized:

| Type | Example |
|------|---------|
| `feat:` | `feat: add maintenance prediction API` |
| `fix:` | `fix: correct water level calculation` |
| `docs:` | `docs: update setup instructions` |
| `style:` | `style: format code to meet standards` |
| `refactor:` | `refactor: reorganize API endpoints` |
| `test:` | `test: add unit tests for prediction` |
| `chore:` | `chore: update dependencies` |

---

## Branching Strategy (Optional but Recommended)

For team collaboration:

```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Work on feature
# ... make changes ...

# Commit
git add .
git commit -m "feat: implement new feature"

# Push feature branch
git push origin feature/new-feature-name

# Create Pull Request on GitHub
# Then merge to main
```

Main branches to use:
- `main` - Production-ready code
- `develop` - Development/staging (optional)
- `feature/*` - Individual features

---

## Troubleshooting

### Error: "fatal: not a git repository"
```bash
cd smarth2wo-monorepo
git status  # Should show git info now
```

### Error: "remote already exists"
```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/smarth2wo.git
```

### Need to update repository name on GitHub?
```bash
# Change local remote
git remote set-url origin https://github.com/USERNAME/new-name.git

# Push again
git push -u origin main
```

### Accidentally committed `.env` file?
```bash
git rm --cached .env
git commit -m "remove .env from tracking"
git push
```

---

## Useful Git Commands

```bash
# View commit history
git log --oneline

# View changes
git diff

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# See all branches
git branch -a

# Delete local branch
git branch -d feature-name
```

---

## Team Collaboration

**Recommended workflow for teams:**

1. Always pull latest before starting work:
   ```bash
   git pull origin main
   ```

2. Create feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

3. Make changes and commit

4. Push and create Pull Request on GitHub

5. Team reviews and merges

This prevents conflicts and keeps code quality high!

---

## You're All Set!

Your monorepo is now ready for GitHub!

**Repository Link**: `https://github.com/USERNAME/smarth2wo`

**Next Steps:**
- Share the link with your team
- Start collaborating!
- Use issues for feature requests and bug reports

---

**Questions?** Check the individual READMEs:
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)




---

# Git Workflow

# Team Git Workflow Guide

Welcome to the team! This document outlines our standard Git workflow. Following these practices ensures a clean history, fewer merge conflicts, and a smooth review process for everyone.

---

## 1. The Core Workflow

Our team uses a **Feature Branch Workflow**. All new development happens in dedicated feature branches, not directly on the `main` branch.

### 1.1 Update Your Local `main`
Always start your work by ensuring your local `main` branch is up to date with the remote repository.

```bash
git checkout main
git pull origin main
```

### 1.2 Create a New Branch
Create a branch for your specific task from the updated `main` branch.

```bash
git checkout -b <type>/<short-description>
```

**Branch Naming Convention:**
- `feature/` - For new features or enhancements (e.g., `feature/login-page`)
- `fix/` - For bug fixes (e.g., `fix/header-alignment`)
- `docs/` - For documentation updates (e.g., `docs/api-readme`)
- `chore/` - For maintenance tasks, dependency updates, etc. (e.g., `chore/update-deps`)

---

## 2. Making and Committing Changes

Make your code changes, keeping them small, focused, and related to a single task.

### 2.1 Stage Your Changes
Check your modifications and stage the files you want to commit:

```bash
# See what files have been changed
git status

# Stage all changes
git add . 

# Or stage specific files (recommended)
git add path/to/file
```

### 2.2 Commit Your Changes
We use **Semantic Commit Messages**. This helps automate changelogs and makes our commit history readable.

```bash
git commit -m "type(scope): concise description"
```

**Examples:**
- `feat(auth): add google sign-in button`
- `fix(api): handle missing user metadata in webhook`
- `docs(readme): update local setup instructions`

*(Refer to our [CONTRIBUTING.md](CONTRIBUTING.md#commit-convention) for the full list of commit types).*

---

## 3. Syncing and Pushing

While you are working on your feature, other team members might be merging their changes into `main`. Keep your branch updated to prevent massive merge conflicts later.

### 3.1 Pull Latest `main` into Your Branch (Optional but Recommended)
If you've been working on a branch for a few days, bring in the latest changes from `main`:

```bash
# Make sure you are on your feature branch
git pull origin main
```
*Note: If there are merge conflicts, resolve them in your code editor, stage the resolved files (`git add .`), and commit them.*

### 3.2 Push Your Branch
Push your branch to the remote repository so it's backed up and ready for a Pull Request:

```bash
# The -u flag links your local branch to the remote branch
git push -u origin <your-branch-name>
```
*For subsequent pushes on the same branch, simply use `git push`.*

---

## 4. Pull Requests (PRs) & Code Review

Code goes into `main` strictly through Pull Requests on GitHub.

1. **Open a PR:** Go to GitHub and open a Pull Request from your feature branch against `main`.
2. **Describe Your Changes:** Provide a clear title and description. What does this PR do? What issue does it fix? Include screenshots if you changed the UI.
3. **Request Reviews:** Assign at least one team member to review your code.
4. **Address Feedback:** If reviewers request changes, make the updates locally, commit them, and push. The PR will update automatically.

### Merging
Once the PR is approved and all automated checks pass:
- **Squash and Merge:** We recommend using "Squash and Merge" in GitHub to keep the `main` history clean (squashing your branch's commits into one single commit on `main`).
- **Clean up:** Delete the feature branch on GitHub after merging to keep the repository tidy.

---

## 5. Troubleshooting & Tips

### Accidental Commit to `main`
If you made changes on `main` but haven't pushed yet:
```bash
git checkout -b feature/my-new-branch
# Your changes are now safely on the new branch!
```

### Modifying the Last Commit
If you forgot to add a file or made a typo in your last commit message (and haven't pushed yet):
```bash
git add <forgotten-file>
git commit --amend --no-edit  # Keeps the same message
# OR
git commit --amend -m "new(message): updated commit message"
```

### Stuck in a Merge Conflict?
Don't panic!
1. Open the conflicting files in your code editor.
2. Look for `<<<<<<< HEAD` (your changes) and `>>>>>>> main` (incoming changes) markers.
3. Keep the code you want, and delete the Git markers.
4. Run `git add <resolved-file>` and `git commit` to finish resolving the conflict.




---

# Backend GitHub Setup

# Pushing SmartH2wo Backend to GitHub

## Step 1: Create GitHub Repository

1. Go to **https://github.com/new**
2. **Repository name**: `smarth2wo-backend`
3. **Description**: `ML-powered FastAPI backend for SmartH2wo water dispenser management`
4. **Visibility**: Choose `Public` or `Private`
5. **DO NOT** initialize with README (we already have one)
6. Click **Create repository**

---

## Step 2: Initialize & Push Locally

### In Terminal/PowerShell (in the `smarth2wo-backend` folder):

```bash
# Navigate to backend directory
cd smarth2wo-backend

# Initialize git repository (if not already done)
git init

# Add all files to staging area
git add .

# Create initial commit
git commit -m "Initial commit: FastAPI backend with maintenance prediction and anomaly detection"

# Add remote repository (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/smarth2wo-backend.git

# Verify remote was added correctly
git remote -v
```

### Push to GitHub:

```bash
# For the first time, use:
git branch -M main
git push -u origin main

# After that, just use:
git push
```

---

## Step 3: Verify on GitHub

1. Go to **https://github.com/USERNAME/smarth2wo-backend**
2. You should see all your code files
3. ✅ Check that `venv/` folder is **NOT** uploaded (thanks to .gitignore)
4. ✅ Check that `.env` file is **NOT** uploaded

---

## Step 4: Set Up Git Credentials (If Asked)

If GitHub asks for credentials:

### Option A: Use GitHub Personal Access Token (Recommended)
1. Go to **https://github.com/settings/tokens**
2. Click **Generate new token (classic)**
3. Select scopes: `repo`, `write:packages`, `read:packages`
4. Copy the token
5. Use this token as password when prompted

### Option B: Use SSH (Advanced)
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub
# Copy content from ~/.ssh/id_ed25519.pub
# Go to https://github.com/settings/keys and add it
```

---

## 📝 Regular Workflow After Setup

Every time you make changes:

```bash
# See what changed
git status

# Add changes
git add .

# Commit with meaningful message
git commit -m "Add new feature: user authentication"

# Push to GitHub
git push
```

---

## 🔗 Link to Backend Repository

Once pushed, share this link with your team:
```
https://github.com/USERNAME/smarth2wo-backend
```

---

## 💡 Tips

- **Never commit** sensitive data:
  - ❌ API keys
  - ❌ Database passwords
  - ❌ `.env` files
  - ✅ Use `.env.example` instead

- **Good commit messages** help track changes:
  - ✅ `git commit -m "Add maintenance prediction endpoint"`
  - ❌ `git commit -m "updates"`

- **Keep it organized**:
  - `main` branch = production-ready code
  - `develop` branch = development work
  - Feature branches = `feature/new-feature-name`

---

## 🆘 Troubleshooting

### Remote already exists
```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/smarth2wo-backend.git
```

### Large files in venv uploaded
```bash
# Remove from git history (advanced)
git filter-branch --tree-filter 'rm -rf venv' --prune-empty HEAD
git push origin --force --all
```

### Forgot to add .env to .gitignore
```bash
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

---

## ✅ Verification Checklist

- [ ] Repository created on GitHub
- [ ] Code pushed successfully
- [ ] `venv/` folder NOT in GitHub
- [ ] `.env` file NOT in GitHub
- [ ] `README.md` visible on GitHub
- [ ] All files visible except ignored ones


