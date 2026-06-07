# SmartH2WO Machine Learning Module

This directory contains the machine learning pipeline for predictive maintenance and anomaly detection. We have transitioned from hard-coded heuristics to dynamic AI models capable of analyzing live IoT sensor data.

## Architecture & Features

The module uses lightweight `scikit-learn` algorithms (running entirely on CPU) combined into two predictors:

1. **Maintenance Predictor:** Uses a `RandomForestRegressor` and `RandomForestClassifier` to estimate exact `days_remaining` until maintenance and categorize severity (`low`, `medium`, `high`, `critical`).
2. **Anomaly Detector:** Uses an `IsolationForest` to spot sensor outliers in real-time, and a `RandomForestClassifier` to diagnose specific hardware faults (e.g., `Overheating`, `Pressure Alert`).

Both models require 4 mandatory snapshot inputs from the ESP32: `water_level_pct`, `temperature`, `flow_rate`, and `pressure`.

## Generating Data & Training

Due to physical time constraints, the models are trained on synthetic data based on the AI4I Predictive Maintenance dataset format, algorithmically simulating a 30-day hardware lifecycle.

1. **Generate Synthetic Data (~43k rows):**
   ```bash
   python -m ml.generate_training_data
   ```
2. **Train the Models:**
   ```bash
   python -m ml.train_models
   ```
   This generates `maintenance_model.joblib` and `anomaly_model.joblib` in the `models/` directory.

## Inference & Fallbacks

The FastAPI server initializes `MaintenancePredictor` and `AnomalyDetector` globally at startup to cache the `.joblib` models in memory. 

- **Endpoints:** The ESP32 hits `POST /api/maintenance/predict` and `POST /api/anomalies/detect` every minute.
- **Fail-safe Fallback:** To guarantee 100% hardware uptime, if the `.joblib` files are missing or crash, the API seamlessly falls back to the old, hard-coded rule-based heuristics.

## Limitations
- **Stateless Analysis:** The models analyze an exact snapshot in time; they do not retain a time-series memory of past minutes.
- **Synthetic Blindspots:** You may experience false alarms until the model is eventually fine-tuned on real hardware data.
