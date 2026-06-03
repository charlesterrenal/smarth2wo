# Next Steps: Transitioning SmartH2WO ML to Live Hardware

This guide outlines the critical next steps for your thesis project to transition the predictive maintenance and anomaly detection systems from simulated (synthetic) data to live, physical hardware.

---

## 📋 Action Items Checklist

### 1. Merge the ML Branch
- [ ] Create a Pull Request on GitHub from `feature/ml-predictive-maintenance` to `main`.
- [ ] Review modifications in `backend/main.py` and merge the branch to keep your repository unified.

### 2. Configure Live Logging from physical ESP32
- [ ] Flash the Arduino code `backend/ESP32_ARDUINO.ino` onto your ESP32 board.
- [ ] Connect the ZJ-S201 flow sensor, ultrasonic transducer, pressure transducer, and temperature sensors.
- [ ] Verify that the ESP32 successfully calls the backend endpoints (`/api/maintenance/predict` and `/api/anomalies/detect`) on a regular cadence (e.g., once per minute).
- [ ] Verify that incoming sensor payloads are being correctly inserted into the Supabase `sensor_history` table.

### 3. Transition ML Training from CSV to Supabase Database
Once you have accumulated a couple of weeks to a month of real-world sensor logs in the `sensor_history` table, you should retrain your models on real data instead of simulated CSV data:
- [ ] Open `backend/ml/train_models.py`.
- [ ] Replace the CSV-loading block:
  ```python
  df = pd.read_csv(csv_path)
  ```
  with a database query fetching all history from Supabase:
  ```python
  # Example code snippet to query Supabase
  response = supabase.table("sensor_history").select("*").order("created_at", desc=False).execute()
  df = pd.DataFrame(response.data)
  ```
- [ ] Run `python -m ml.train_models` to retrain and save the models (`.joblib` files) based on the live operational signatures of your dispenser.

### 4. Deploy Backend to Production
- [ ] Deploy the FastAPI backend code to hosting services (e.g., Render, AWS EC2, or Heroku).
- [ ] Add your production environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`) to the hosting dashboard.

### 5. Verify Real-time Alerts
- [ ] Ensure that email alerts are working by setting a valid `RESEND_API_KEY` in your production environment.
- [ ] Confirm that when the ML model predicts critical anomalies (e.g. system overheating or dry runs) or low days remaining, email notifications are instantly dispatched to stakeholders.
