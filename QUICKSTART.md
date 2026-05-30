# Quick Start Reference

**New to the project?** Start with [SETUP.md](SETUP.md) instead (complete step-by-step guide).

This page is a quick reference for developers who are already set up.

---

## Start Services (Fastest)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # macOS/Linux: or venv\Scripts\activate on Windows
python main.py
# Running on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

---

## Development Commands

### Backend
```bash
# Activate environment
source backend/venv/bin/activate  # macOS/Linux
backend\venv\Scripts\activate     # Windows

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
# Install dependencies
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

- **Dashboard:** http://localhost:5173
- **Admin Payments:** http://localhost:5173/admin/payments
- **System Logs:** http://localhost:5173/logs
- **API Docs:** http://localhost:8000/docs
- **API ReDoc:** http://localhost:8000/redoc

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

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Port 8000 in use` | `netstat -ano \| findstr :8000` then `taskkill /PID <PID> /F` (Windows) or `lsof -i :8000 \| kill -9` (Mac/Linux) |
| `Port 5173 in use` | `netstat -ano \| findstr :5173` then `taskkill /PID <PID> /F` (Windows) or `lsof -i :5173 \| kill -9` (Mac/Linux) |
| Backend won't start | Ensure venv is activated (should see `(venv)` in terminal) |
| Frontend won't start | Delete `node_modules`, run `npm install` again |
| Can't connect to Supabase | Check credentials in `.env` and `.env.local` |

**Full troubleshooting?** See [SETUP.md → Troubleshooting](SETUP.md#troubleshooting)

---

## Project Structure

```
smarth2wo/
├── SETUP.md               ← START HERE for new members
├── README.md              Project overview
├── QUICKSTART.md          (this file)
├── GITHUB_SETUP.md        Git workflow
│
├── frontend/              React + Vite
│   ├── src/pages/         Dashboard, Logs, AdminPayments, etc.
│   ├── src/lib/           API utilities, Supabase client
│   └── package.json
│
├── backend/               FastAPI + Python
│   ├── main.py            All API endpoints
│   ├── paymongo_service.py PayMongo integration
│   ├── requirements.txt
│   ├── PAYMONGO_SETUP.md  Payment integration guide
│   └── venv/              Virtual environment (local only)
│
└── docker-compose.yml     Optional Docker setup
```

---

## Need Help?

- **Setup issues?** → [SETUP.md](SETUP.md#troubleshooting)
- **Payments?** → [backend/PAYMONGO_SETUP.md](backend/PAYMONGO_SETUP.md)
- **Backend?** → [backend/README.md](backend/README.md)
- **Frontend?** → [frontend/README.md](frontend/README.md)
- **Git workflow?** → [GITHUB_SETUP.md](GITHUB_SETUP.md)

