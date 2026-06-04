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
