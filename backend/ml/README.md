# SmartH2WO Machine Learning Documentation

This directory contains the machine learning pipeline for SmartH2WO. We transition predictive maintenance and anomaly detection from hard-coded heuristics to trained scikit-learn models.

## 📁 Directory Structure

```text
backend/ml/
├── data/
│   └── training_data.csv          # Simulated sensor history dataset
├── models/
│   ├── anomaly_model.joblib       # Serialized models for anomaly detection
│   └── maintenance_model.joblib   # Serialized models for maintenance prediction
├── __init__.py
├── feature_engineering.py          # Unified data cleaning & imputation
├── generate_training_data.py       # Synthetic data generation tool
├── train_models.py                # Model training & validation script
└── inference.py                   # Prediction wrappers and API loaders
```

---

## ⚙️ Architecture & Model Design

Rather than serving models on a separate server, the scikit-learn pipeline is hosted directly inside our existing FastAPI service. This is highly compute-efficient and keeps maintenance overhead low.

### 1. Feature Engineering & Preprocessing
* **Features Used:** `water_level_pct`, `temperature`, `flow_rate`, `pressure`.
* **Imputation Strategy:** Any missing (`None` / `NaN`) fields in incoming real-time requests are automatically imputed using the **median values** calculated from the training dataset.

### 2. Models Trained
* **Model A: Maintenance Predictor**
  * **Days Remaining Regressor (`RandomForestRegressor`):** Predicts the number of remaining days before maintenance is required.
  * **Severity Classifier (`RandomForestClassifier`):** Classifies maintenance urgency into `low`, `medium`, `high`, or `critical`.
* **Model B: Anomaly Detector**
  * **Isolation Forest (`IsolationForest`):** An unsupervised outlier detector calibrated using training contamination statistics to identify abnormal system states.
  * **Anomaly Type Classifier (`RandomForestClassifier`):** A classifier that runs only when `IsolationForest` reports an anomaly, categorizing the issue into `overheating`, `low_water`, `high_pressure`, `low_flow`, or `sensor_fault`.

---

## 📈 Model Performance Metrics

The models were trained on 30 days of simulated 1-minute cadence sensor data (~43,200 samples) with a 20% test validation split:

* **Maintenance Regressor:** $R^2 \approx 96.3\%$, Mean Squared Error (MSE) $\approx 0.12$.
* **Maintenance Severity Classifier:** Accuracy $\approx 90.0\%$.
* **Anomaly Unsupervised Detector (IsolationForest):** Accuracy $\approx 98.9\%$, Anomaly F1-Score $\approx 0.85$.
* **Anomaly Type Classifier:** Accuracy $\approx 99.9\%$.

---

## 🖥️ API Integration & Fallback Strategy

The models are integrated inside the FastAPI routes in `backend/main.py`.

* **Model Execution:** Endpoint calls `/api/maintenance/predict` and `/api/anomalies/detect` route inputs through the ML models when loaded.
* **Heuristics Fallback:** If the `.joblib` files are missing or if prediction fails for any reason, the system **automatically falls back to the original rule-based logic**, ensuring 100% service uptime.

---

## 🚀 How to Retrain the Models

1. **Activate Environment:**
   ```bash
   cd backend
   .\venv\Scripts\Activate.ps1
   ```
2. **(Optional) Regenerate Training Data:**
   ```bash
   python -m ml.generate_training_data
   ```
3. **Train & Save Models:**
   ```bash
   python -m ml.train_models
   ```
   This will output the validation scores and update the serialized `.joblib` files inside `backend/ml/models/`.
