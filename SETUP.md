# SmartH2wo Setup Guide

Complete setup instructions for the SmartH2wo water dispenser management system. This guide consolidates everything you need to get started without errors.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [First-Time Setup (Complete)](#first-time-setup-complete)
3. [Service-Specific Setup](#service-specific-setup)
4. [Payment Integration (PayMongo)](#payment-integration-paymongo)
5. [Team Member Setup](#team-member-setup)
6. [Troubleshooting](#troubleshooting)
7. [Environment Variables Reference](#environment-variables-reference)

---

## Prerequisites

**Required:**
- Node.js 16+ ([Download](https://nodejs.org/)) - **Verify:** `node --version`
- Python 3.9+ ([Download](https://www.python.org/)) - **Verify:** `python --version`
- Git ([Download](https://git-scm.com/)) - **Verify:** `git --version`
- Supabase account ([Sign up free](https://supabase.com))

**Optional (for payment testing):**
- PayMongo account ([Sign up](https://dashboard.paymongo.com))
- ngrok account ([Sign up free](https://ngrok.com))

---

## First-Time Setup (Complete)

Follow these steps **in order** to avoid setup errors.

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/smarth2wo.git
cd smarth2wo
```

### Step 2: Setup Supabase Database

**Estimated time: 5 minutes**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or use existing one
3. Go to **Settings → API**
   - Copy **Project URL** → save it
   - Copy **anon public key** → save it (NOT the secret key)
4. Go to **SQL Editor → New Query**
5. Copy and paste this SQL:

```sql
-- Drop old logs table if it exists
DROP TABLE IF EXISTS logs CASCADE;

-- Create new logs table with correct schema
CREATE TABLE IF NOT EXISTS logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event       TEXT NOT NULL,
  message     TEXT,
  volume_ml   INT,
  payment_method TEXT,
  status      TEXT NOT NULL CHECK (status IN ('success', 'scheduled', 'error', 'warning')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all for anon" ON logs FOR ALL USING (true) WITH CHECK (true);
```

6. Click **Run** (green play button)
7. ✅ Database is ready!

### Step 3: Backend Setup

**Estimated time: 3 minutes**

Open **Terminal 1:**

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env - add your Supabase credentials
# Use your editor (VS Code, Notepad, etc.)
# Fill in:
#   SUPABASE_URL=https://your-project.supabase.co
#   SUPABASE_ANON_KEY=your-anon-key-here
#   (Optional) PAYMONGO_PUBLIC_KEY=pk_test_...
#   (Optional) PAYMONGO_SECRET_KEY=sk_test_...
```

**Verify backend works:**
```bash
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

✅ Visit http://localhost:8000/docs to see API documentation

**Keep this terminal running** for the next steps.

### Step 4: Frontend Setup

**Estimated time: 2 minutes**

Open **Terminal 2:**

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local - add your Supabase credentials
# Fill in:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Start development server:**
```bash
npm run dev
```

Expected output:
```
  VITE v... ready in ... ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ Visit http://localhost:5173 to see dashboard

---

## Service-Specific Setup

### Backend (FastAPI)

**Location:** `backend/`

**Start Command:**
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows
python main.py
```

**Expected Port:** http://localhost:8000

**Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Install New Package:**
```bash
pip install package-name
pip freeze > requirements.txt
```

**Common Issues:**
- **ModuleNotFoundError**: Ensure venv is activated (you should see `(venv)` in terminal)
- **Port 8000 in use**: See [Troubleshooting](#troubleshooting)
- **Import errors**: Run `pip install -r requirements.txt` again

---

### Frontend (React + Vite)

**Location:** `frontend/`

**Start Command:**
```bash
cd frontend
npm run dev
```

**Expected Port:** http://localhost:5173

**Key Commands:**
```bash
npm install           # Install dependencies
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build
npm install package-name  # Install new package
```

**Common Issues:**
- **Port 5173 in use**: See [Troubleshooting](#troubleshooting)
- **node_modules issues**: Delete and reinstall
  ```bash
  rm -rf node_modules
  rm package-lock.json
  npm install
  ```

---

## Payment Integration (PayMongo)

**This is OPTIONAL** - frontend works without it (shows mock QR codes).

### Setup PayMongo

1. **Sign up** at [PayMongo Dashboard](https://dashboard.paymongo.com)
2. **Get API keys:**
   - Go to Dashboard → Settings → API Keys
   - Copy Public Key (starts with `pk_`)
   - Copy Secret Key (starts with `sk_`)
3. **Add to `backend/.env`:**
   ```env
   PAYMONGO_PUBLIC_KEY=pk_live_xxxxx
   PAYMONGO_SECRET_KEY=sk_live_xxxxx
   ```
4. **Restart backend:**
   ```bash
   python main.py
   ```

### Testing Payments

1. Visit http://localhost:5173/admin/payments
2. Click any dispenser button (100ml, 500ml, 1L)
3. QR code appears
4. Click "Simulate Payment Success" to test webhook
5. Check System Logs page - transaction should appear

### Webhook Setup (Optional - for real GCash payments)

1. **Setup ngrok** (for public URL):
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ngrok http 8000
   ```
   Copy the public URL: `https://xxx.ngrok-free.dev`

2. **Configure in PayMongo Dashboard:**
   - Settings → Webhooks
   - Webhook URL: `https://xxx.ngrok-free.dev/api/payments/webhook`
   - Event: `payment.paid`

3. **For real testing:**
   - Customer scans QR code
   - Completes GCash payment
   - PayMongo sends webhook to your URL
   - Transaction confirms automatically

See [backend/PAYMONGO_SETUP.md](backend/PAYMONGO_SETUP.md) for detailed PayMongo guide.

---

## Team Member Setup

### For New Team Members

**They should:**

1. **Clone repo:**
   ```bash
   git clone https://github.com/yourusername/smarth2wo.git
   cd smarth2wo
   ```

2. **Follow "First-Time Setup" above** (all 4 steps)

3. **Create feature branch for their work:**
   ```bash
   git checkout -b feature/their-feature-name
   ```

### Onboarding Checklist

- [ ] Node.js and Python installed and verified
- [ ] Repository cloned
- [ ] Supabase account and credentials obtained
- [ ] Backend environment file created with Supabase URL and key
- [ ] Frontend environment file created with Supabase URL and key
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Dashboard loads at http://localhost:5173
- [ ] (Optional) PayMongo credentials added if testing payments

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/payment-dashboard

# Make changes...

# Stage and commit
git add .
git commit -m "feat: add payment dashboard"

# Push to GitHub
git push origin feature/payment-dashboard

# Create Pull Request on GitHub
```

---

## Troubleshooting

### Backend Won't Start

**Error: `ModuleNotFoundError: No module named 'fastapi'`**
```bash
# Solution: Activate virtual environment
# Windows:
backend\venv\Scripts\activate
# macOS/Linux:
source backend/venv/bin/activate

# Then reinstall:
pip install -r requirements.txt
```

**Error: `Address already in use (:8000)`**
```bash
# Solution: Kill process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :8000
kill -9 <PID>
```

**Error: `No module named 'paymongo_service'`**
```bash
# Solution: Ensure load_dotenv() runs BEFORE importing paymongo_service
# This is already fixed in main.py, but if you moved code around:
# Move "load_dotenv()" to line 11, BEFORE any service imports
```

---

### Frontend Won't Start

**Error: `Port 5173 already in use`**
```bash
# Solution: Kill process using port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :5173
kill -9 <PID>
```

**Error: `Cannot find module '@supabase/supabase-js'`**
```bash
# Solution: Reinstall node_modules
rm -rf node_modules
rm package-lock.json
npm install
```

**Error: `npm: command not found`**
```bash
# Solution: Install Node.js from https://nodejs.org/
# Verify with: node --version
```

---

### Communication Errors

**Error: Frontend can't reach backend**
```
CORS error, Backend not running, etc.
```

**Solutions:**
1. Ensure backend is running on http://localhost:8000
   ```bash
   curl http://localhost:8000/health
   ```
2. Ensure frontend is running on http://localhost:5173
3. Check `VITE_API_URL` in frontend/.env.local (should be http://localhost:8000)

---

### Database Connection Errors

**Error: `Supabase connection failed`**

1. Verify credentials in `.env` files:
   ```bash
   # Check backend/.env
   grep SUPABASE backend/.env
   
   # Check frontend/.env.local
   grep VITE_SUPABASE frontend/.env.local
   ```

2. Go to [Supabase Dashboard](https://app.supabase.com):
   - Verify Project URL (should match your .env)
   - Verify Anon Key (copy again if unsure)
   - Click "Test Connection" in SQL Editor

3. Restart both services after updating credentials

---

### Payment/Logging Issues

**Logs page shows no transactions**

1. Ensure logs table exists in Supabase:
   ```bash
   # Go to Supabase → SQL Editor
   # Run: SELECT * FROM logs;
   # Should show recent transactions
   ```

2. If table doesn't exist, run the SQL from [Step 2](#step-2-setup-supabase-database)

3. Ensure `payment_method` column exists (not `payment`):
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name='logs';
   ```

4. Restart backend:
   ```bash
   # Terminal 1: Press Ctrl+C
   # Then: python main.py
   ```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `SUPABASE_URL` | ✅ Yes | `https://xxx.supabase.co` | From Supabase Dashboard |
| `SUPABASE_ANON_KEY` | ✅ Yes | `eyJhbGc...` | Anon public key, NOT secret |
| `PAYMONGO_PUBLIC_KEY` | ❌ No | `pk_live_xxx` | For payment testing |
| `PAYMONGO_SECRET_KEY` | ❌ No | `sk_live_xxx` | For payment testing |

**Example `.env`:**
```env
SUPABASE_URL=https://myproject.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PAYMONGO_PUBLIC_KEY=pk_live_optional
PAYMONGO_SECRET_KEY=sk_live_optional
```

### Frontend (`frontend/.env.local`)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `VITE_SUPABASE_URL` | ✅ Yes | `https://xxx.supabase.co` | Same as backend |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | `eyJhbGc...` | Same as backend |
| `VITE_API_URL` | ❌ No | `http://localhost:8000` | Default: http://localhost:8000 |

**Example `.env.local`:**
```env
VITE_SUPABASE_URL=https://myproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:8000
```

---

## Project Structure

```
smarth2wo/
├── frontend/                   React + Vite Dashboard
│   ├── src/
│   │   ├── pages/             Dashboard, Logs, Admin Payments, etc.
│   │   ├── components/        Reusable UI components
│   │   ├── lib/               API utilities, Supabase client
│   │   └── context/           Theme and state management
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── backend/                    FastAPI + Python Backend
│   ├── main.py                 FastAPI app, all endpoints
│   ├── paymongo_service.py     PayMongo integration
│   ├── requirements.txt        Python dependencies
│   ├── .env.example
│   └── venv/                   Virtual environment (created locally)
│
├── SETUP.md                    (this file)
├── README.md                   Project overview
├── QUICKSTART.md               Quick reference
├── GITHUB_SETUP.md             Git/GitHub workflow
└── docker-compose.yml          (optional Docker setup)
```

---

## Next Steps

After setup is complete:

1. **Explore the dashboard:** http://localhost:5173
2. **Test payment flow:** http://localhost:5173/admin/payments
3. **Check API docs:** http://localhost:8000/docs
4. **Read detailed docs:** [README.md](README.md), [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md)
5. **Start developing:** Create a feature branch and make changes

---

## Support

- **Setup issues?** Check [Troubleshooting](#troubleshooting) above
- **Questions?** See individual service READMEs:
  - Backend: [backend/README.md](backend/README.md)
  - Frontend: [frontend/README.md](frontend/README.md)
  - Payments: [backend/PAYMONGO_SETUP.md](backend/PAYMONGO_SETUP.md)
- **Git help?** See [GITHUB_SETUP.md](GITHUB_SETUP.md)

---

**Last updated:** May 30, 2026
