# Machine Learning Overview

This document provides a high-level overview of the Machine Learning architecture used in the SmartH2WO backend for predictive maintenance and anomaly detection.

## Goal
To transition from rigid, hard-coded rule-based heuristics to a dynamic, AI-powered system capable of analyzing live IoT sensor data from the ESP32 water dispenser.

## Model Architecture

We utilize four lightweight `scikit-learn` models combined into two main "Predictors". 

### 1. Maintenance Predictor (Model A)
Analyzes current sensor telemetry to determine the health of the physical dispenser.
* **Exact Time Prediction:** Uses a `RandomForestRegressor` to estimate the exact number of `days_remaining` until the machine requires maintenance.
* **Urgency Categorization:** Uses a `RandomForestClassifier` to determine the severity of the maintenance need (`low`, `medium`, `high`, `critical`).

### 2. Anomaly Detector (Model B)
Constantly monitors for sudden, dangerous spikes or drops in data.
* **Anomaly Detection:** Uses an `IsolationForest` (highly effective for spotting outliers) to determine if the current sensor reading is completely abnormal.
* **Fault Diagnosis:** When an anomaly is flagged, it passes through a `RandomForestClassifier` to diagnose exactly what type of failure is occurring (e.g., `Overheating`, `Pressure Alert`, `Critical Low Level`).

---

## Features & Inputs

The models expect **4 mandatory inputs** representing a snapshot in time from the ESP32:
1. `water_level_pct` (%)
2. `temperature` (°C)
3. `flow_rate` (L/min)
4. `pressure` (PSI)

Because these are standard scikit-learn algorithms, they do not require a heavy GPU. They run purely on CPU, making them incredibly cheap and easy to host directly inside a FastAPI web server without external Microservices.

---

## Limitations

It is important to understand the constraints of this specific architecture:

> [!WARNING]
> **No Time-Series Context (Amnesia)**
> Random Forests and Isolation Forests are *stateless*. The model only analyzes the exact snapshot in time it was given. It does not "remember" the temperature from 5 minutes ago. It strictly answers: *"Is this exact reading, right now, dangerous?"* 

> [!CAUTION]
> **Synthetic Blindspots**
> Due to time constraints, this model is trained entirely on a CSV (the AI4I Predictive Maintenance Dataset format). Because it has never seen real-world data from your specific ZJ-S201 flow sensor or ESP32, it does not know the unique hardware "quirks" of your dispenser. You may experience false alarms in production until the model is eventually fine-tuned on real hardware data.

> [!IMPORTANT]
> **Strict Sensor Dependency**
> The model requires all 4 sensor variables. If a physical sensor disconnects, the backend is forced to plug in a "median" fallback value to prevent mathematical crashes, which significantly degrades prediction accuracy.
