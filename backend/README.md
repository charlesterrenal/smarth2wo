# SmartH2wo Backend API

FastAPI-based backend service for the SmartH2wo water dispenser management system. Provides ML-powered maintenance predictions and anomaly detection.

## Features

- **Maintenance Prediction** - AI-driven maintenance scheduling based on sensor data
- **Anomaly Detection** - Real-time detection of system anomalies
- **Sensor Analytics** - Process and analyze water dispenser telemetry
- **CORS Enabled** - Seamless integration with frontend
- **Auto Documentation** - Swagger UI at `/docs`

## Quick Start

### Prerequisites

- **Python 3.9+** (Check with `python --version`)
- **pip** (comes with Python)
- **Git** (for cloning and pushing to GitHub)

### Installation & Setup

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/smarth2wo-backend.git
cd smarth2wo-backend
```

#### 2️⃣ Create Virtual Environment (Required)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

#### 3️⃣ Install Dependencies
```bash
pip install -r requirements.txt
```

> **Note**: `scikit-learn` / `numpy` / `pandas` are optional (see `requirements-ml.txt`). The API runs without them. If `pip` tries to compile packages and asks for Visual C++, use Python 3.12 or install only `requirements.txt` (not `requirements-ml.txt`).

#### 4️⃣ (Optional) Configure Environment
```bash
# Create .env file for environment variables (optional)
# cp .env.example .env
# Edit .env with your settings if needed
```

### Running the Server

**Every time you want to run the backend:**

```bash
# Navigate to backend directory
cd smarth2wo-backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Start the API server
python main.py
```

**Output should show:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Access the API:**
- 🌐 API Base: `http://localhost:8000`
- Interactive Docs (Swagger UI): `http://localhost:8000/docs`
- 🔍 Alternative Docs (ReDoc): `http://localhost:8000/redoc`

**For Development with Auto-Reload:**
```bash
uvicorn main:app --reload
```

## API Endpoints

### Health & Status

#### GET `/`
- **Description**: API status check
- **Response**: `{ "status": "ok", "message": "...", "docs": "/docs" }`

#### GET `/health`
- **Description**: Health check endpoint
- **Response**: `{ "status": "healthy", "timestamp": "..." }`

#### GET `/api/status/summary`
- **Description**: Overall system status summary
- **Response**: System metrics and statistics

### Maintenance & Anomalies

#### POST `/api/maintenance/predict`
- **Description**: Predict maintenance needs based on sensor data
- **Request Body**:
```json
{
  "water_level_pct": 75.5,
  "temperature": 38,
  "flow_rate": 2.1,
  "pressure": 45,
  "power_on": true
}
```
- **Response**:
```json
{
  "days_remaining": 30,
  "reason": "Regular maintenance cycle",
  "severity": "low",
  "confidence": 0.85
}
```

#### POST `/api/anomalies/detect`
- **Description**: Detect anomalies in sensor readings
- **Request Body**: Same as maintenance predict
- **Response**:
```json
[
  {
    "type": "High Temperature",
    "message": "System running hot: 45°C",
    "severity": "high",
    "timestamp": "2024-01-15T10:30:00"
  }
]
```

## Sensor Data Reference

All endpoints accept the following optional sensor parameters:

| Parameter | Type | Range | Unit | Description |
|-----------|------|-------|------|-------------|
| `water_level_pct` | float | 0-100 | % | Water tank fill percentage |
| `temperature` | float | -10-60 | °C | System temperature |
| `flow_rate` | float | 0-10 | L/min | Water flow rate |
| `pressure` | float | 0-100 | PSI | System pressure |
| `power_on` | bool | true/false | - | System power status |

## Development

### Project Structure
```
smarth2wo-backend/
├── main.py              # FastAPI application & endpoints
├── requirements.txt     # Python dependencies
├── .env                 # Local configuration (git-ignored)
├── .env.example         # Example configuration
├── venv/                # Virtual environment
└── README.md            # This file
```

### Adding New Endpoints

1. Define a Pydantic model for request/response
2. Create the endpoint function
3. Add docstring with description
4. Auto-documentation updates at `/docs`

Example:
```python
from pydantic import BaseModel

class MyRequest(BaseModel):
    param1: str
    param2: int

@app.post("/api/my-endpoint")
async def my_endpoint(request: MyRequest):
    """Description of what this endpoint does"""
    return {"result": "value"}
```

### Testing

Use the interactive Swagger UI:
```
http://localhost:8000/docs
```

Or test with curl:
```bash
curl -X POST "http://localhost:8000/api/maintenance/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "water_level_pct": 50,
    "temperature": 35,
    "flow_rate": 2.0,
    "pressure": 40,
    "power_on": true
  }'
```

## Frontend Integration

The frontend dashboard connects to this API at `http://localhost:8000`.

Key integration points:
- `/api/maintenance/predict` - Used on Dashboard for maintenance card
- `/api/anomalies/detect` - Used on Dashboard for alerts banner

## Dependencies

- **FastAPI** - Modern web framework for building APIs
- **Uvicorn** - ASGI web server
- **Pydantic** - Data validation using Python type hints
- **scikit-learn** - Machine learning (for future ML models)
- **pandas** - Data processing (for future analytics)
- **numpy** - Numerical computing

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_HOST` | `0.0.0.0` | Server host |
| `BACKEND_PORT` | `8000` | Server port |
| `DEBUG` | `True` | Debug mode |
| `ENVIRONMENT` | `development` | Environment type |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS |

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
netstat -ano | findstr :8000
# Kill the process
taskkill /PID <PID> /F
```

### Module Not Found
```bash
# Ensure virtual environment is activated
pip install -r requirements.txt
```

### CORS Errors
- Ensure `FRONTEND_URL` is in `.env`
- Check frontend is running on correct port
- Verify API is accessible at `http://localhost:8000`

## Production Deployment

### Using Gunicorn (Linux/macOS)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Using Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY main.py .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment-Specific Config
Update `.env` for production:
```
DEBUG=False
ENVIRONMENT=production
FRONTEND_URL=https://yourdomain.com
```

## Future Enhancements

- [ ] Database integration (PostgreSQL with Supabase)
- [ ] Advanced ML models for maintenance prediction
- [ ] Historical data analysis and trending
- [ ] Real-time WebSocket support for live sensor data
- [ ] User authentication and API keys
- [ ] Rate limiting and request throttling
- [ ] Logging and monitoring
- [ ] Unit and integration tests

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues, questions, or suggestions:
- 🐛 [Report a Bug](https://github.com/yourusername/smarth2wo-backend/issues)
- 💡 [Request a Feature](https://github.com/yourusername/smarth2wo-backend/issues)
- 📧 Contact: your-email@example.com

## Links

- [Dashboard Repository](https://github.com/yourusername/smarth2wo-dashboard)
- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [API Interactive Docs](http://localhost:8000/docs)
