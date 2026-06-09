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

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** FastAPI (Python 3.11+), Supabase (PostgreSQL & Realtime)
- **Machine Learning:** Scikit-learn (Predictive Maintenance & Anomaly Detection)
- **Payments:** PayMongo (QR PH)
- **IoT & Hardware:** ESP32, MQTT, ILI9341 TFT Display
- **Infrastructure:** Docker Compose, Cloudflare Tunnels

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

- [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) - Complete setup guide and quickstart
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Git workflow, branching, and team conventions
- [backend/README.md](backend/README.md) - Backend details, API reference, ML, and MQTT integration
- [frontend/README.md](frontend/README.md) - Frontend details
- [landing/README.md](landing/README.md) - Landing page details

## License

MIT License.

## Team

| Name | Role |
|------|------|
| Charles Vincent P. Terrenal | Project Lead, Full Stack Developer, Hardware Assembly and Integration |
| Anne Margareth B. Medina | Frontend Lead, UI Development and Design |
| Marielle Lois P. Bahuyo | Full Stack Developer, Frontend and Backend Development |
| Wilbert Lancelot S. Aguilar | UI/UX Designer, Hardware Assembly |
