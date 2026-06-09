from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json
from datetime import datetime, timedelta, timezone
import random
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
# I-load ang mga variables mula sa .env file
load_dotenv()

from supabase import create_client, Client
from paymongo_service import create_checkout_session, handle_webhook, CreatePaymentRequest
from mqtt_service import init_mqtt, publish_dispense, disconnect as mqtt_disconnect
from email_service import init_email_service, send_transaction_alert, send_water_level_alert, send_maintenance_due_alert, send_anomaly_alert, send_power_status_alert
from ml.inference import MaintenancePredictor, AnomalyDetector

# Initialize ML Predictors
maintenance_predictor = MaintenancePredictor()
anomaly_detector = AnomalyDetector()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("STARTUP EVENT: Initializing MQTT...")
    init_mqtt()
    print("STARTUP EVENT: Initializing Email Service...")
    init_email_service(supabase)
    print("=" * 60)
    try:
        yield
    finally:
        print("Shutting down MQTT...")
        mqtt_disconnect()


app = FastAPI(
    title="SmartH2wo Backend API",
    description="ML-powered water dispenser analytics and maintenance predictions",
    version="1.0.0",
    lifespan=lifespan
)

# === SUPABASE CLIENT INITIALIZATION ===
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Optional[Client] = None
if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase credentials missing inside .env file! Running without DB persistence.")
else:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"WARNING: Failed to connect to Supabase client: {e}")

# CORS middleware - allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NOTE: lifecycle handled by `lifespan` context manager above (replaces deprecated on_event handlers)

# ============ Pydantic Models ============

class SensorData(BaseModel):
    water_level_pct: Optional[float] = None
    flow_rate: Optional[float] = None
    power_on: Optional[bool] = None

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
    days_remaining = 30
    reason = "Regular maintenance cycle"
    severity = "low"
    confidence = 0.85
    
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
    
    
    if sensor_data.flow_rate is not None and sensor_data.flow_rate < 0.5:
        days_remaining = min(days_remaining, 10)
        reason = "Low flow rate - filter may need cleaning"
        severity = "medium"
        confidence = 0.75
    
    return MaintenancePrediction(
        days_remaining=max(1, days_remaining),
        reason=reason,
        severity=severity,
        confidence=min(1.0, confidence)
    )

def detect_anomalies(sensor_data: SensorData) -> List[Anomaly]:
    anomalies = []
    
    if sensor_data.power_on is False:
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
    return {
        "status": "ok",
        "message": "SmartH2wo Backend API is running",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/maintenance/predict")
async def predict_maintenance_endpoint(sensor_data: SensorData, simulate: bool = False):
    try:
        # Try ML prediction first
        ml_res = None
        if maintenance_predictor.is_loaded:
            ml_res = maintenance_predictor.predict(sensor_data)
            
        if ml_res is not None:
            prediction = MaintenancePrediction(**ml_res)
            print(f"ML SUCCESS: Predicted maintenance remaining: {prediction.days_remaining} days (severity: {prediction.severity})")
        else:
            prediction = predict_maintenance(sensor_data)
            print("ML FALLBACK: Using rule-based maintenance prediction.")
        if supabase and not simulate:
            # Debounce maintenance logs: Only log if the exact same reason hasn't been logged today
            should_log = True
            try:
                today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                existing = supabase.table("logs").select("id").ilike(
                    "event", f"%{prediction.reason}%"
                ).gte("created_at", today_start).limit(1).execute()
                should_log = len(existing.data) == 0
            except Exception as check_err:
                print(f"Daily log check error (non-critical): {check_err}")
                should_log = True
            
            if should_log:
                supabase.table("logs").insert({
                    "event": f"Maintenance Prediction: {prediction.reason} (Days remaining: {prediction.days_remaining})",
                    "status": "scheduled",
                    "volume_ml": int(sensor_data.flow_rate * 1000) if sensor_data.flow_rate else 0
                }).execute()
            
            # Send email alert if maintenance is urgent
            if prediction.severity in ["high", "critical"]:
                send_maintenance_due_alert(prediction.days_remaining, prediction.reason, prediction.severity)
            
            # Send water level alert if low
            if sensor_data.water_level_pct is not None:
                if sensor_data.water_level_pct < 10:
                    send_water_level_alert(sensor_data.water_level_pct, status="critical")
                elif sensor_data.water_level_pct < 20:
                    send_water_level_alert(sensor_data.water_level_pct, status="warning")
        
        return prediction
    except Exception as e:
        print(f"Database Error in Predict Endpoint: {e}")
        return predict_maintenance(sensor_data)

@app.post("/api/anomalies/detect")
async def detect_anomalies_endpoint(sensor_data: SensorData, simulate: bool = False):
    try:
        # Try ML anomaly detection first
        ml_res = None
        if anomaly_detector.is_loaded:
            ml_res = anomaly_detector.predict(sensor_data)
            
        if ml_res is not None:
            anomalies = [Anomaly(**a) for a in ml_res]
            print(f"ML SUCCESS: Detected {len(anomalies)} anomalies using model.")
        else:
            anomalies = detect_anomalies(sensor_data)
            print("ML FALLBACK: Using rule-based anomaly detection.")
        if supabase and not simulate:
            # Check previous state for Power ON/OFF transitions
            try:
                prev_status_res = supabase.table("sensor_status").select("power_on").eq("id", 1).execute()
                if prev_status_res.data and sensor_data.power_on is not None:
                    prev_power = prev_status_res.data[0].get("power_on")
                    
                    if prev_power is not None and prev_power != sensor_data.power_on:
                        # State changed! Log the transition
                        status_str = "ON" if sensor_data.power_on else "OFF"
                        log_status = "success" if sensor_data.power_on else "error"
                        supabase.table("logs").insert({
                            "event": f"System Powered {status_str}",
                            "status": log_status,
                            "volume_ml": 0
                        }).execute()
                        # Send email alert
                        send_power_status_alert(sensor_data.power_on)
            except Exception as e:
                print(f"Failed to check previous power state: {e}")

            update_data = {"updated_at": datetime.now().isoformat()}
            if sensor_data.water_level_pct is not None:
                update_data["water_level_pct"] = int(sensor_data.water_level_pct)
            if sensor_data.power_on is not None:
                update_data["power_on"] = sensor_data.power_on
                
            supabase.table("sensor_status").update(update_data).eq("id", 1).execute()
            
            # Record historical sensor data for ML and analytics
            try:
                supabase.table("sensor_history").insert({
                    "water_level_pct": sensor_data.water_level_pct,
                    "flow_rate": sensor_data.flow_rate,
                    "power_on": sensor_data.power_on if sensor_data.power_on is not None else True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
            except Exception as hist_err:
                print(f"Failed to record sensor history: {hist_err}")
                
            if anomalies:
                for anomaly in anomalies:
                    # Cooldown logic: Check if this specific anomaly was already logged in the last hour
                    try:
                        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                        existing_log = supabase.table("logs").select("id").ilike(
                            "event", f"%{anomaly.type}%"
                        ).gte("created_at", one_hour_ago).limit(1).execute()
                        
                        already_logged_recently = len(existing_log.data) > 0
                    except Exception as check_err:
                        print(f"Daily log check error (non-critical): {check_err}")
                        already_logged_recently = False

                    # Only insert the log and send the email if we haven't seen it recently
                    if not already_logged_recently:
                        supabase.table("logs").insert({
                            "event": f"ANOMALY TRIGGERED - Type: {anomaly.type} | Msg: {anomaly.message}",
                            "status": "warning",
                            "volume_ml": int(sensor_data.flow_rate * 1000) if sensor_data.flow_rate else 0
                        }).execute()
                        
                        # Send email alert for high/critical anomalies
                        if anomaly.severity in ["critical", "high"]:
                            send_anomaly_alert(anomaly.type, anomaly.message, anomaly.severity)
                    else:
                        print(f"Anomaly {anomaly.type} suppressed (already logged recently).")
        return anomalies
    except Exception as e:
        print(f"Database Error in Anomaly Endpoint: {e}")
        return detect_anomalies(sensor_data)



# ============ Payment Routes (PayMongo QR Code) ============

@app.post("/api/payments/create-checkout")
async def create_payment_checkout(request: CreatePaymentRequest):
    """
    Create a dynamic QR code payment session for water dispenser
    
    Returns QR code (base64) to display on ESP32 TFT screen
    """
    try:
        checkout = create_checkout_session(request)
        
        # Log transaction to Supabase as pending
        if supabase:
            supabase.table("transactions").insert({
                "customer": request.customer_email,
                "volume_ml": request.volume_ml,
                "price": request.amount_pesos,
                "payment_method": "qr",
                "created_at": datetime.now().isoformat()
            }).execute()
            
            # Log event to system logs
            try:
                supabase.table("logs").insert({
                    "event": "Transaction created",
                    "status": "scheduled",
                    "message": f"QR code generated for {request.volume_ml}ml at P{request.amount_pesos}",
                    "volume_ml": request.volume_ml,
                    "payment_method": "qr",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
            except Exception as log_err:
                print(f"Logging error (non-critical): {log_err}")
        
        return checkout
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/payments/webhook")
async def handle_payment_webhook(payload: dict):
    """
    Handle PayMongo webhook for payment confirmation
    
    Called when customer completes GCash payment
    Updates transaction status and signals ESP32 to dispense
    """
    print("=" * 60)
    print("WEBHOOK RECEIVED FROM PAYMONGO")
    print(f"Event type: {payload.get('type', 'unknown')}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("=" * 60)
    
    try:
        result = handle_webhook(payload)
        
        if result.get("success"):
            transaction_id = result.get("transaction_id")
            
            # Update transaction status in Supabase
            if supabase:
                supabase.table("transactions").update({
                    "payment_method": result.get("payment_method", "qr")
                }).eq("id", transaction_id).execute()
                
                # Log payment event
                try:
                    supabase.table("logs").insert({
                        "event": "Payment received",
                        "status": "success",
                        "message": f"Payment confirmed for {result.get('volume_ml')}ml - P{result.get('amount_pesos')}",
                        "volume_ml": result.get("volume_ml"),
                        "payment_method": result.get("payment_method", "qr"),
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }).execute()
                except Exception as log_err:
                    print(f"Logging error (non-critical): {log_err}")
                
                # Send transaction email alert
                send_transaction_alert(
                    transaction_id=transaction_id,
                    customer_email=result.get("customer_email", "unknown@example.com"),
                    volume_ml=result.get("volume_ml", 0),
                    price=result.get("amount_pesos", 0)
                )
            
            # Signal ESP32 to dispense water via MQTT
            publish_dispense(
                transaction_id=transaction_id,
                volume_ml=result.get("volume_ml"),
                amount_pesos=result.get("amount_pesos")
            )
            
            return {
                "success": True,
                "message": result.get("message"),
                "transaction_id": transaction_id,
                "should_dispense": True
            }
        else:
            # Log failed payment
            if supabase:
                try:
                    supabase.table("logs").insert({
                        "event": "Payment failed",
                        "status": "error",
                        "message": result.get("message"),
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }).execute()
                except Exception as log_err:
                    print(f"Logging error (non-critical): {log_err}")
            
            return {
                "success": False,
                "message": result.get("message"),
                "should_dispense": False
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

@app.get("/api/payments/status/{transaction_id}")
async def check_payment_status(transaction_id: str):
    """Check status of a payment transaction"""
    try:
        if not supabase:
            return {"status": "unknown", "message": "Database not configured"}
        
        response = supabase.table("transactions").select("*").eq(
            "id", transaction_id
        ).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        transaction = response.data[0]
        return {
            "transaction_id": transaction_id,
            "volume_ml": transaction.get("volume_ml"),
            "price": transaction.get("price"),
            "created_at": transaction.get("created_at")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/sensors/power")
async def update_power_status(data: SensorData):
    try:
        if data.power_on is None:
            raise HTTPException(status_code=400, detail="power_on must be provided")
            
        if supabase:
            supabase.table("sensor_status").update({"power_on": data.power_on}).eq("id", 1).execute()
        
        # Send email alert
        from email_service import send_power_status_alert
        send_power_status_alert(data.power_on)
        
        return {"status": "success", "power_on": data.power_on}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)