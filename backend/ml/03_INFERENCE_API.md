# Inference & API Integration

This document explains how the FastAPI backend actively uses the trained Machine Learning models to evaluate live sensor data coming from the ESP32.

## How the Models are Loaded

When you start the FastAPI server (`python -m uvicorn main:app`), the code globally initializes the predictor wrapper classes found in `backend/ml/inference.py`:

```python
from ml.inference import MaintenancePredictor, AnomalyDetector

# Initialize ML Predictors globally at startup
maintenance_predictor = MaintenancePredictor()
anomaly_detector = AnomalyDetector()
```

When initialized, these classes look inside the `backend/ml/models/` folder and attempt to load the serialized `.joblib` binary files into memory. This ensures that the heavy lifting of loading the model only happens once at startup, rather than every time a sensor payload arrives.

---

## Endpoint Execution

The ESP32 hits two primary endpoints every minute:
1. `POST /api/maintenance/predict`
2. `POST /api/anomalies/detect`

Inside these endpoints, the backend takes the JSON payload (water level, temp, flow rate, pressure) and passes it directly to the `.predict()` methods of our ML classes.

```python
# Inside main.py
ml_res = maintenance_predictor.predict(sensor_data)
```

If the model flags a critical issue, the backend immediately triggers an email alert and updates the Supabase dashboard logs.

---

## The Rule-Based Fallback Strategy

> [!IMPORTANT]  
> What happens if the `maintenance_model.joblib` file is accidentally deleted, or the model crashes due to missing data? **The system will not go down.**

To ensure 100% uptime for the IoT dispenser, a strict **Rule-Based Fallback** mechanism is hard-coded into the endpoints.

If the `.joblib` files fail to load (`is_loaded == False`), or if the `.predict()` method throws an exception, the endpoint seamlessly falls back to the old, hard-coded heuristics functions (`predict_maintenance()` and `detect_anomalies()`).

```python
# Try ML prediction first
ml_res = None
if maintenance_predictor.is_loaded:
    ml_res = maintenance_predictor.predict(sensor_data)
    
if ml_res is not None:
    # Use the ML output
    prediction = MaintenancePrediction(**ml_res)
    print("ML SUCCESS: Predicted maintenance...")
else:
    # Safely fallback to the old hard-coded rules
    prediction = predict_maintenance(sensor_data)
    print("ML FALLBACK: Using rule-based maintenance prediction.")
```

This hybrid architecture guarantees that your hardware will always receive a response and your dashboard will never break, even if the ML side of the project encounters an error.
