# Quick Start Guide - SmartH2wo Monorepo

Get the entire project running in **5 minutes**!

---

## Prerequisites

- **Node.js 16+** - [Download](https://nodejs.org/)
- **Python 3.9+** - [Download](https://www.python.org/)
- **Git** - [Download](https://git-scm.com/)

**Verify installations:**
```bash
node --version
npm --version
python --version
git --version
```

---

## Option 1: Run Everything (Easiest)

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
# or: source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Setup Supabase credentials
cp .env.example .env
# Edit .env and fill in SUPABASE_URL, SUPABASE_ANON_KEY, etc.

python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install

# Setup Supabase credentials
cp .env.example .env.local
# Edit .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# (Get these from https://app.supabase.com → Settings → API)
# NOTE: Use the "anon" public key, NOT the secret key

npm run dev
```

**Access:**
- Dashboard: http://localhost:5173
- API Docs: http://localhost:8000/docs

**Note**: Get Supabase credentials from https://app.supabase.com → Your Project → Settings → API

---

## Project Structure

```
smarth2wo-monorepo/
│
├── frontend/              📱 React Dashboard
│   ├── src/
│   │   ├── components/    Reusable UI components
│   │   ├── pages/         Page components
│   │   ├── lib/           API & utilities
│   │   └── context/       State management
│   ├── package.json
│   └── vite.config.js
│
├── backend/               🔧 FastAPI Backend
│   ├── main.py            Main FastAPI app
│   ├── requirements.txt    Python dependencies
│   └── venv/              Virtual environment
│
├── README.md              Full documentation
├── GITHUB_SETUP.md        GitHub setup guide
└── .gitignore             Git ignore rules
```

---

## Backend Only
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with Supabase credentials

python main.py
```

**Backend runs on:** `http://localhost:8000`

### Frontend Only
```bash
cd frontend
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials

npm run dev
```

**Frontend runs on:** `http://localhost:5173`

---

## Key Commands

### Backend
```bash
# Activate environment
source backend/venv/bin/activate  # macOS/Linux
backend\venv\Scripts\activate     # Windows

# Run server
cd backend && python main.py

# With auto-reload (development)
uvicorn main:app --reload

# Check dependencies
pip list

# Add new package
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

# Add new package
npm install package-name
```

---

## API Endpoints

All backend endpoints start with `http://localhost:8000`

### Health & Status
- `GET /` - API info
- `GET /health` - Health check
- `GET /api/status/summary` - System summary

### Maintenance
- `POST /api/maintenance/predict` - Predict maintenance needs
- `POST /api/anomalies/detect` - Detect anomalies

**Full API docs:** http://localhost:8000/docs

---

## 🐳 Docker (Optional)

Run both services with Docker:

```bash
docker-compose up
```

---

## 🤝 Contributing

1. **Clone repository:**
   ```bash
   git clone https://github.com/USERNAME/smarth2wo.git
   cd smarth2wo-monorepo
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make changes & commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push & create Pull Request:**
   ```bash
   git push origin feature/your-feature
   ```

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Ensure venv is activated
# Windows:
backend\venv\Scripts\activate
# macOS/Linux:
source backend/venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Check port 8000 is free
netstat -an | grep 8000
```

### Frontend won't start
```bash
# Clear and reinstall
rm -rf frontend/node_modules
rm frontend/package-lock.json
npm install

# Check port 5173 is free
```

### Communication errors
- Ensure both are running
- Check backend is on `http://localhost:8000`
- Check frontend can reach backend (CORS settings)

---

## 📖 Full Documentation

- **Main README:** [README.md](./README.md)
- **Backend Details:** [backend/README.md](./backend/README.md)
- **Frontend Details:** [frontend/README.md](./frontend/README.md)
- **GitHub Setup:** [GITHUB_SETUP.md](./GITHUB_SETUP.md)

---

## Next Steps

1. Run backend: `python main.py`
2. Run frontend: `npm run dev`
3. Visit: http://localhost:5173
4. Check API: http://localhost:8000/docs
5. Push to GitHub (see [GITHUB_SETUP.md](./GITHUB_SETUP.md))

---

**Happy coding!**

Got questions? Check the individual README files or GitHub Issues.
