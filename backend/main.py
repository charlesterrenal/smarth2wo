from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json
from datetime import datetime, timedelta
import random

app = FastAPI(
    title="SmartH2O Backend API",
    description="ML-powered water dispenser analytics and maintenance predictions",
    version="1.0.0"
)

# CORS middleware - allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Pydantic Models ============

class SensorData(BaseModel):
    water_level_pct: Optional[float] = None
    temperature: Optional[float] = None
    flow_rate: Optional[float] = None
    pressure: Optional[float] = None
    power_on: Optional[bool] = True

class MaintenancePrediction(BaseModel):
    days_remaining: int
    reason: str
    severity: str  # 'critical', 'high', 'medium', 'low'
    confidence: float

class Anomaly(BaseModel):
    type: str
    message: str
    severity: str  # 'critical', 'high', 'medium', 'low'
    timestamp: str

# ============ Helper Functions ============

def predict_maintenance(sensor_data: SensorData) -> MaintenancePrediction:
    """
    Simple ML-based maintenance prediction.
    In production, this would use trained ML models.
    """
    
    # Base prediction: healthy system
    days_remaining = 30
    reason = "Regular maintenance cycle"
    severity = "low"
    confidence = 0.85
    
    # Rules-based logic (simplified)
    if sensor_data.water_level_pct is not None:
        if sensor_data.water_level_pct < 20:
            days_remaining = 2
            reason = "Low water level - refill needed soon"
            severity = "high"
            confidence = 0.95
        elif sensor_data.water_level_pct < 40:
            days_remaining = 7
            reason = "Water level declining"
            severity = "medium"
            confidence = 0.80
    
    if sensor_data.temperature is not None and sensor_data.temperature > 45:
        days_remaining = min(days_remaining, 5)
        reason = "High temperature detected - cooling system check needed"
        severity = "high"
        confidence = 0.90
    
    if sensor_data.flow_rate is not None and sensor_data.flow_rate < 0.5:
        days_remaining = min(days_remaining, 10)
        reason = "Low flow rate - filter may need cleaning"
        severity = "medium"
        confidence = 0.75
    
    if sensor_data.pressure is not None and sensor_data.pressure > 80:
        days_remaining = min(days_remaining, 3)
        reason = "High pressure - safety check required"
        severity = "critical"
        confidence = 0.92
    
    return MaintenancePrediction(
        days_remaining=max(1, days_remaining),
        reason=reason,
        severity=severity,
        confidence=min(1.0, confidence)
    )

def detect_anomalies(sensor_data: SensorData) -> List[Anomaly]:
    """
    Detect anomalies in sensor data.
    Returns list of detected anomalies.
    """
    anomalies = []
    
    if not sensor_data.power_on:
        anomalies.append(Anomaly(
            type="Power Status",
            message="System is powered off",
            severity="low",
            timestamp=datetime.now().isoformat()
        ))
    
    if sensor_data.water_level_pct is not None:
        if sensor_data.water_level_pct > 100 or sensor_data.water_level_pct < 0:
            anomalies.append(Anomaly(
                type="Invalid Reading",
                message=f"Water level out of range: {sensor_data.water_level_pct}%",
                severity="critical",
                timestamp=datetime.now().isoformat()
            ))
        elif sensor_data.water_level_pct < 5:
            anomalies.append(Anomaly(
                type="Critical Low Level",
                message="Water tank is critically low",
                severity="critical",
                timestamp=datetime.now().isoformat()
            ))
    
    if sensor_data.temperature is not None:
        if sensor_data.temperature > 50:
            anomalies.append(Anomaly(
                type="Overheating",
                message=f"System temperature critical: {sensor_data.temperature}°C",
                severity="critical",
                timestamp=datetime.now().isoformat()
            ))
        elif sensor_data.temperature > 45:
            anomalies.append(Anomaly(
                type="High Temperature",
                message=f"System running hot: {sensor_data.temperature}°C",
                severity="high",
                timestamp=datetime.now().isoformat()
            ))
        elif sensor_data.temperature < 5:
            anomalies.append(Anomaly(
                type="Low Temperature",
                message=f"System temperature low: {sensor_data.temperature}°C",
                severity="medium",
                timestamp=datetime.now().isoformat()
            ))
    
    if sensor_data.pressure is not None and sensor_data.pressure > 100:
        anomalies.append(Anomaly(
            type="Pressure Alert",
            message=f"Pressure too high: {sensor_data.pressure} PSI",
            severity="critical",
            timestamp=datetime.now().isoformat()
        ))
    
    if sensor_data.flow_rate is not None and sensor_data.flow_rate < 0.1:
        anomalies.append(Anomaly(
            type="Low Flow",
            message=f"Flow rate critically low: {sensor_data.flow_rate} L/min",
            severity="high",
            timestamp=datetime.now().isoformat()
        ))
    
    return anomalies

# ============ Routes ============

@app.get("/")
def read_root():
    """Root endpoint - API is running"""
    return {
        "status": "ok",
        "message": "SmartH2O Backend API is running",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/maintenance/predict")
async def predict_maintenance_endpoint(sensor_data: SensorData):
    """
    Predict maintenance needs based on sensor data.
    
    Request body:
    - water_level_pct: Water tank level (0-100)
    - temperature: System temperature (°C)
    - flow_rate: Water flow rate (L/min)
    - pressure: System pressure (PSI)
    - power_on: Is system powered on (bool)
    
    Returns: Maintenance prediction with days_remaining, reason, severity, confidence
    """
    try:
        prediction = predict_maintenance(sensor_data)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/anomalies/detect")
async def detect_anomalies_endpoint(sensor_data: SensorData):
    """
    Detect anomalies in current sensor readings.
    
    Request body:
    - water_level_pct: Water tank level (0-100)
    - temperature: System temperature (°C)
    - flow_rate: Water flow rate (L/min)
    - pressure: System pressure (PSI)
    - power_on: Is system powered on (bool)
    
    Returns: List of detected anomalies with type, message, severity, timestamp
    """
    try:
        anomalies = detect_anomalies(sensor_data)
        return anomalies
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ Advanced endpoints (for future expansion) ============

@app.get("/api/status/summary")
def get_status_summary():
    """Get overall system status summary"""
    return {
        "status": "operational",
        "uptime_hours": 156,
        "last_maintenance": (datetime.now() - timedelta(days=15)).isoformat(),
        "next_maintenance": (datetime.now() + timedelta(days=15)).isoformat(),
        "total_transactions": random.randint(500, 1000),
        "total_revenue": round(random.uniform(5000, 15000), 2),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
