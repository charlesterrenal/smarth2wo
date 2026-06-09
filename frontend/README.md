# SmartH2wo - Smart Water Dispenser Management System

 Complete IoT solution for smart water dispensers with **real-time monitoring**, **predictive maintenance**, and **payment processing**.

Consists of:
-  **Frontend Dashboard** - React + Vite + Tailwind CSS
-  **Backend API** - FastAPI with ML-powered analytics
-  **Database** - Supabase (PostgreSQL)
-  **Hardware** - ESP32 with sensor integration

---

## Tech Stack

| Layer        | Technology                                    |
|--------------|-----------------------------------------------|
| **Frontend** | React 18 + Vite + Tailwind CSS + Recharts    |
| **Backend**  | FastAPI + Python 3.9+ + scikit-learn         |
| **Database** | Supabase (PostgreSQL + Realtime)              |
| **Hardware** | ESP32 + Arduino                               |
| **ML/AI**    | Predictive maintenance + Anomaly detection    |
| **Deployment** | Vercel (frontend), Render/Heroku (backend)  |

---

##  Prerequisites

- **Node.js** 16+ (for frontend)
- **Python** 3.9+ (for backend)
- **Git** for version control
- **Supabase** account (free tier available)
- Optional: Docker for containerized deployment

---

##  Quick Start (Full Stack Setup)

### Option 1: Run Both Frontend & Backend (Recommended for Development)

#### Prerequisites

- **Node.js 16+** (Check with `node --version`)
- **npm** (comes with Node.js, check with `npm --version`)
- **Python 3.9+** (Check with `python --version`)
- **Git**

---

#### Step 1️⃣: Setup Backend (in one terminal)

```bash
cd smarth2wo-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server (runs on http://localhost:8000)
python main.py
```

** Backend running when you see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Keep this terminal open!**

---

#### Step 2️⃣: Setup Frontend (in a new terminal)

```bash
cd smarth2wo-dashboard

# Install Node dependencies
npm install

# Copy environment template (if .env.example exists)
# cp .env.example .env
# Edit .env with your Supabase credentials if needed

# Start development server (runs on http://localhost:5173)
npm run dev
```

** Dashboard ready when you see:**
```
Local:  http://localhost:5173
```

---

#### Step 3️⃣: Access the Full Stack

| Component | URL | Purpose |
|-----------|-----|---------|
|  Dashboard | http://localhost:5173 | Main UI for monitoring & management |
|  Backend Docs | http://localhost:8000/docs | Interactive API documentation |
|  ReDoc | http://localhost:8000/redoc | Alternative API docs |
|  Backend Health | http://localhost:8000/health | API health check |

---

### Backend Communication

The dashboard automatically connects to the backend at `http://localhost:8000`:
- Fetches sensor data
- Gets maintenance predictions
- Retrieves anomaly alerts
- Sends user transactions

---

#### Step 4: Setup Frontend

```bash
cd smarth2wo-dashboard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add Supabase credentials
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Start dev server (runs on http://localhost:5173)
npm run dev
```

#### Step 3: Setup Backend

```bash
cd smarth2wo-backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Start API server (runs on http://localhost:8000)
python main.py
# or with auto-reload:
# uvicorn main:app --reload
```

#### Step 4: Access the Dashboard

-  **Dashboard**: http://localhost:5173
-  **API Docs**: http://localhost:8000/docs
-  **API Health**: http://localhost:8000/health

---

##  Project Structure

```
smarth2wo/
├── smarth2wo-dashboard/          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Page components
│   │   ├── lib/                  # Utilities & API clients
│   │   ├── App.jsx               # Router setup
│   │   └── index.css             # Global styles
│   ├── package.json
│   ├── .env.example              # Environment template
│   └── README.md
│
└── smarth2wo-backend/            # Backend (FastAPI)
    ├── main.py                   # FastAPI application
    ├── requirements.txt          # Python dependencies
    ├── .env.example              # Environment template
    └── README.md
```

### Frontend Structure (Detailed)

```
src/
├── components/
│   ├── Sidebar.jsx              # Navigation (read-only)
│   ├── StatCard.jsx             # Reusable metric cards
│   └── PageHeader.jsx           # Page title bar
├── pages/
│   ├── Dashboard.jsx            # Home - System overview
│   ├── Transaction.jsx          # Payment transactions
│   ├── Analytics.jsx            # Water usage analytics
│   ├── Logs.jsx                 # System event logs
│   └── Settings.jsx             # System configuration
├── lib/
│   ├── supabase.js              # Supabase client
│   ├── maintenanceApi.js        # Backend API calls
│   └── mockData.js              # Demo data
└── App.jsx                      # Routes & layout
```

---

##  Backend API Endpoints

All API calls return JSON. See [Backend README](./smarth2wo-backend/README.md) for full documentation.

### Maintenance Prediction
```
POST /api/maintenance/predict
Request: { water_level_pct, temperature, flow_rate, pressure, power_on }
Response: { days_remaining, reason, severity, confidence }
```

### Anomaly Detection
```
POST /api/anomalies/detect
Request: { water_level_pct, temperature, flow_rate, pressure, power_on }
Response: [{ type, message, severity, timestamp }]
```

### Health Check
```
GET /health
Response: { status, timestamp }
```

Full interactive API documentation available at `http://localhost:8000/docs`

---

## ️ Development Workflow

### Getting Started (For All Groupmates)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/smarth2wo-dashboard.git
cd smarth2wo-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in the Supabase credentials (ask Charles for these):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Team Assignments

| Member   | Responsibility                               |
|----------|----------------------------------------------|
| Charles  | Backend API, Supabase setup, ESP32 integration, DevOps |
| Member 2 | Dashboard (overview + maintenance)           |
| Member 3 | Transaction & Logs pages                     |
| Member 4 | Analytics & Settings pages                   |

---

##  Git Workflow

We use a **feature-branch** strategy:

```
main      production-ready code (deployed to Vercel)
dev       integration branch (latest working code)
feature/xxx  your working branches
```

### Daily Development

```bash
# 1. Start fresh with latest dev
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/add-water-chart

# 3. Make changes & commit
git add .
git commit -m "feat: add water consumption chart"

# 4. Push & create Pull Request
git push origin feature/add-water-chart
#  Open PR: feature/add-water-chart  dev on GitHub

# 5. After PR approved & merged
git checkout dev
git pull origin dev
```

**Important**: Never commit directly to `main` or `dev`. Always use feature branches + Pull Requests.

---

## ️ Database Setup (Supabase)

### For Charles (Setup Only)

1. Go to https://supabase.com  create new project named `smarth2wo`
2. Go to **SQL Editor**  Run contents of `supabase_schema.sql`
3. Go to **Database > Replication**  Enable Realtime for:
   - `transactions` table
   - `logs` table
   - `sensor_status` table
4. Go to **Settings > API**  Copy credentials into `.env`
5. Share credentials with team (privately, not in repo)

### For Everyone Else

- Ask Charles for:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Add them to your `.env` file

---

## 🤖 Backend API Integration

The frontend automatically calls backend API for ML features:

### Dashboard Maintenance Card
Calls `/api/maintenance/predict` to show maintenance needs:
```javascript
import { getMaintenancePrediction } from '../lib/maintenanceApi'

// In Dashboard component
useEffect(() => {
  const prediction = await getMaintenancePrediction(sensorData)
  setMaintenancePrediction(prediction)
}, [sensorData])
```

### Dashboard Anomalies Banner
Calls `/api/anomalies/detect` to show system alerts:
```javascript
import { getAnomalies } from '../lib/maintenanceApi'

useEffect(() => {
  const anomalies = await getAnomalies(sensorData)
  setAnomalies(anomalies)
}, [sensorData])
```

**Backend stops  Graceful fallback**: If API is down, frontend shows mock data (no crashes).

---

## Connecting Supabase (Per Page)

Each page has `TODO` comments. Look for:

```js
// TODO: Replace mock data with Supabase queries
```

### Example: Transactions Page

**Before (Mock Data)**
```jsx
const [transactions] = useState(mockTransactions)
```

**After (Real Data from Supabase)**
```jsx
const [transactions, setTransactions] = useState([])

useEffect(() => {
  supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) console.error(error)
      setTransactions(data ?? [])
    })
}, [])
```

---

##  Project Structure (Detailed)

```
src/
├── components/
│   ├── Sidebar.jsx       Navigation (shared, do not edit without discussion)
│   ├── StatCard.jsx      Reusable card component (shared)
│   └── PageHeader.jsx    Page title component (shared)
├── pages/
│   ├── Dashboard.jsx     System overview & predictions (Member 2)
│   ├── Transaction.jsx   Payment history (Member 3)
│   ├── Analytics.jsx     Water usage stats (Member 4)
│   ├── Logs.jsx          System event logs (Member 3)
│   └── Settings.jsx      Configuration (Member 4)
├── lib/
│   ├── supabase.js       Supabase client (do not edit)
│   ├── maintenanceApi.js  Backend API calls (Charles only)
│   └── mockData.js       Development mock data
├── hooks/                Custom React hooks (for future use)
├── App.jsx               Routing & layout
├── index.css             Global styles & CSS variables
└── main.jsx              Entry point
```

---

##  Deployment

### Frontend (Vercel)

1. Push to `main` branch
2. Go to https://vercel.com  Import GitHub repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Vercel auto-deploys on every push to `main`

### Backend (Render/Railway/Heroku)

1. Push to backend repo's `main` branch
2. Go to hosting provider  Import GitHub repo
3. Add environment variables from `.env`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
5. Deploy

See [Backend README](./smarth2wo-backend/README.md) for detailed deployment instructions.

---

##  ESP32 Hardware Integration

The ESP32 posts transaction data directly to Supabase:

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* supabaseUrl = "https://YOUR_PROJECT.supabase.co/rest/v1/transactions";
const char* supabaseKey = "YOUR_ANON_KEY";

void logTransaction(int volume_ml, float price, String payment_method) {
  HTTPClient http;
  http.begin(supabaseUrl);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["volume_ml"]      = volume_ml;
  doc["price"]          = price;
  doc["payment_method"] = payment_method;
  doc["created_at"]     = getCurrentTimestamp();

  String body;
  serializeJson(doc, body);
  int httpCode = http.POST(body);
  
  http.end();
}
```

---

##  API Documentation

### Frontend Integration
- See `src/lib/maintenanceApi.js` for all backend API calls
- API calls are wrapped with error handling (fallback to mock data)

### Backend API Reference
- Full documentation: [Backend README](./smarth2wo-backend/README.md)
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

##  Troubleshooting

### Frontend Won't Start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend Connection Error
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not, start it:
cd smarth2wo-backend
python main.py
```

### Supabase Connection Issue
- Verify `.env` has correct credentials
- Check Supabase project is active
- Ensure your IP isn't blocked (Supabase firewall)

### Port Already in Use
```bash
# Find & kill process using port 5173 (frontend)
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or port 8000 (backend)
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

---

##  Commit Message Guidelines

Keep commits **atomic** and **descriptive**:

```bash
#  Good
git commit -m "feat: add water level chart to dashboard"
git commit -m "fix: prevent API errors when backend is down"
git commit -m "style: update card shadows and remove border radius"

#  Bad
git commit -m "updates"
git commit -m "fix stuff"
git commit -m "WIP"
```

**Format**: `<type>: <description>`
- `feat:` - New feature
- `fix:` - Bug fix
- `style:` - CSS/styling changes
- `refactor:` - Code restructuring
- `docs:` - Documentation
- `test:` - Tests

---

##  Theme & Design

The dashboard uses **Atom Grey dark mode** with:
- **Primary Colors**: Blue (#0052CC), Green (#00A651), Yellow (#FFA500)
- **Neutral**: Atom Grey (#282C34 bg, #ABB2BF text)
- **CSS Variables**: Defined in `src/index.css` for easy customization

All cards have:
- **Sharp corners** (0px border-radius)
- **Subtle shadows** (0 4px 16px rgba(0,0,0,0.12))
- **Smooth transitions** (0.4s page animations)
- **Mobile-responsive** layouts

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes & test locally
4. Commit: `git commit -m "feat: your feature"`
5. Push: `git push origin feature/your-feature`
6. Create Pull Request on GitHub
7. Wait for review & merge

### Code Style
- Use ES6+ syntax
- Add comments for complex logic
- Keep components under 200 lines (split if larger)
- Test on mobile (responsive design!)

---

##  Resources

- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org)
- [Supabase Docs](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [React Router](https://reactrouter.com)

---

##  Support & Questions

-  **Bug Report**: [Open an Issue](https://github.com/YOUR_USERNAME/smarth2wo-dashboard/issues)
-  **Feature Request**: [Discussions](https://github.com/YOUR_USERNAME/smarth2wo-dashboard/discussions)
-  **Email**: your-email@example.com
-  **Slack/Team Chat**: (add channel link here)

---

##  License

This project is licensed under the **MIT License** - see LICENSE file for details.

---

##  Team Info

**Project**: SmartH2wo - IoT Water Dispenser Management System  
**Org**: [Your Organization/School]  
**Year**: 2024-2025  
**Members**: Charles, Member 2, Member 3, Member 4

---

##  Key Features

 **Dashboard Features**:
- Real-time water level monitoring
- Predictive maintenance scheduling
- Transaction history & revenue tracking
- Water consumption analytics
- System anomaly alerts
- Coin & QR payment support
- Responsive mobile design
- Dark mode (Atom Grey theme)
- Event logging & audit trail
- System settings & configuration

---

##  Security Notes

- Never commit `.env` files (use `.env.example`)
- Supabase credentials are environment variables (not hardcoded)
- API calls use error handling for graceful degradation
- No sensitive data in version control

---

##  Next Steps

- [ ] Complete all page implementations
- [ ] Connect all pages to Supabase
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to cloud
- [ ] Setup CI/CD pipeline
- [ ] Add unit tests
- [ ] Performance optimization
- [ ] Security audit

---


