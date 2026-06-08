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

### 3. Train Models using the AI4I Dataset
Due to time constraints for collecting real-world failure data, the model will be strictly trained on the AI4I Predictive Maintenance CSV dataset. The live ESP32 hardware will only be used for *inference* (real-time predictions).
- [x] Ensure you are in the `backend` directory.
- [x] Run `python -m ml.train_models` to process the CSV dataset and generate the trained model files.
- [x] Verify that the `.joblib` model files are created in your backend folder. Your backend API will load these pre-trained models to evaluate the incoming live ESP32 sensor data.

### 4. Deploy Backend to Production
- [ ] Deploy the FastAPI backend code to hosting services (e.g., Render, AWS EC2, or Heroku).
- [ ] Add your production environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`) to the hosting dashboard.

### 5. Verify Real-time Alerts
- [ ] Ensure that email alerts are working by setting a valid `RESEND_API_KEY` in your production environment.
- [ ] Confirm that when the ML model predicts critical anomalies (e.g. system overheating or dry runs) or low days remaining, email notifications are instantly dispatched to stakeholders.
