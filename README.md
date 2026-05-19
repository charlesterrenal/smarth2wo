# SmartH2wo - Smart Water Dispenser Management System

Complete full-stack IoT solution for smart water dispensers with **real-time monitoring**, **predictive maintenance**, and **payment processing**.

```
smarth2wo/
├── frontend/              React Dashboard
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/               FastAPI Backend
│   ├── main.py
│   ├── requirements.txt
│   └── venv/
├── README.md              (this file)
├── .gitignore
└── docker-compose.yml     (optional)
```

---

## Project Overview

SmartH2wo monitors water dispensers through:
- **Real-time sensor analytics** (water level, temperature, flow rate, pressure)
- **ML-powered maintenance predictions** before failures occur
- **Anomaly detection** for system issues
- **Payment processing** for refills
- **IoT hardware integration** (ESP32 with sensors)

---

## Prerequisites

- **Node.js 16+** (for frontend)
- **Python 3.9+** (for backend)
- **Git** for version control
- **Supabase** account (optional, for database)

---

## Quick Start (Full Stack)

### Terminal 1: Start Backend

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

# Setup environment variables (REQUIRED)
cp .env.example .env

# Edit .env with your Supabase credentials:
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_ANON_KEY=your-anon-key-here
# (Get these from Supabase Dashboard → Settings → API)

# Start the API server
python main.py
```

**Backend running on:** `http://localhost:8000`
- **Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Terminal 2: Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables (REQUIRED)
cp .env.example .env.local

# Edit .env.local with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Start dev server
npm run dev
```

**Dashboard running on:** `http://localhost:5173`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + Tailwind CSS + Recharts |
| **Backend** | FastAPI + Python 3.9+ |
| **Database** | Supabase (PostgreSQL) |
| **Hardware** | ESP32 + Arduino sensors |
| **ML/AI** | Predictive maintenance + Anomaly detection |

---

## Directory Structure

```
smarth2wo/
├── frontend/
│   ├── src/
│   │   ├── components/       UI components
│   │   ├── pages/            Page components
│   │   ├── context/          React context
│   │   ├── lib/              API & utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── backend/
│   ├── main.py               FastAPI application
│   ├── requirements.txt      Python dependencies
│   ├── venv/                 Virtual environment
│   └── README.md
│
├── README.md                 (this file)
├── .gitignore
└── docker-compose.yml        (optional)
```

---

## API Endpoints (Backend)

### Maintenance Prediction
**POST** `/api/maintenance/predict`
```json
{
  "water_level_pct": 75,
  "temperature": 38,
  "flow_rate": 2.1,
  "pressure": 45
}
```

### Anomaly Detection
**POST** `/api/anomalies/detect`
```json
{
  "water_level_pct": 10,
  "temperature": 52,
  "flow_rate": 0.2,
  "pressure": 90
}
```

### System Health
**GET** `/health`
**GET** `/api/status/summary`

See full API docs at `http://localhost:8000/docs`

---

## Configuration

### Environment Variables (Optional)

Create `.env` files in each directory:

**`backend/.env`:**
```
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**`frontend/.env.local`:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

---

## Deployment

### Backend (FastAPI)
- **Recommended**: Render, Heroku, Railway, or DigitalOcean
- **Docker**: Included in `docker-compose.yml`

### Frontend (React)
- **Recommended**: Vercel, Netlify
- **Build**: `npm run build`

### Database
- **Supabase**: Free tier available at https://supabase.com

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "feat: add new feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

### Commit Convention
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `style:` formatting
- `refactor:` code restructuring

---

## Documentation

- [Backend Setup](./backend/README.md) - Detailed backend instructions
- [Frontend Setup](./frontend/README.md) - Detailed frontend instructions
- [GitHub Setup](./backend/GITHUB_SETUP.md) - Push to GitHub guide

---

## Docker (Optional)

Run both frontend and backend with Docker:

```bash
docker-compose up
```

---

## Troubleshooting

### Backend won't start
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt

# Check if port 8000 is free
netstat -an | grep 8000
```

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check if port 5173 is free
```

### Backend and Frontend can't communicate
- Ensure backend is running on `http://localhost:8000`
- Check CORS settings in `backend/main.py`
- Verify `VITE_API_URL` in frontend `.env.local`

---

## License

MIT License - feel free to use this project!

---

## Questions?

Check the individual README files in `frontend/` and `backend/` for detailed setup instructions.

**Happy coding!**
