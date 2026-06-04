# Training Guide

This document explains how to generate the synthetic dataset and train the Machine Learning models. 

> [!NOTE]
> Because we do not have historical failure data from the physical ESP32 dispenser yet, we rely entirely on synthetic data (based on the AI4I Predictive Maintenance dataset format) to train the models.

## Prerequisites
Ensure your Python virtual environment is activated and your dependencies are installed.

**For Git Bash (Windows):**
```bash
cd backend
source venv/Scripts/activate
pip install -r requirements-ml.txt
```

**For PowerShell (Windows):**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements-ml.txt
```

---

## Step 1: Generate the Synthetic Dataset

Before you can train the model, you need a dataset to train it on. We have provided a script that generates ~43,000 rows of minute-by-minute sensor readings containing various simulated anomalies and maintenance degradation curves.

Run the data generator:
```bash
python -m ml.generate_training_data
```

**Verification:**
Check the `backend/ml/data/` folder. You should see a large file named `training_data.csv`.

---

## Step 2: Train the Models

Once the CSV is generated, you can feed it into the `scikit-learn` pipeline to generate your trained models.

Run the training script:
```bash
python -m ml.train_models
```

This script will:
1. Load the CSV into memory.
2. Train the Maintenance Regressor & Classifier.
3. Train the Anomaly IsolationForest & Classifier.
4. Output the mathematical evaluation scores (Accuracy, MSE, R-squared) directly to your terminal.

**Verification:**
Check the `backend/ml/models/` folder. You should now see two serialized binary files:
* `maintenance_model.joblib`
* `anomaly_model.joblib`

These `.joblib` files are your "Brain". The backend API will load these files into RAM to make predictions on live data.
