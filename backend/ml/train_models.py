import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.ensemble import IsolationForest
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report

# Import feature metadata and fallbacks from the feature engineering module
from ml.feature_engineering import FEATURE_NAMES, DEFAULT_FALLBACKS

def main():
    print("=" * 60)
    print("SMARTH2WO ML TRAINING PIPELINE (PHASE 3)")
    print("=" * 60)
    
    # 1. Load data
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "ml", "data", "training_data.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training data not found at {csv_path}. Please run generate_training_data first.")
        
    print(f"Loading training data from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded {df.shape[0]} rows and {df.shape[1]} columns.")
    
    # 2. Impute/Clean NaN values in features
    # Calculate median values for features
    impute_values = {}
    for col in FEATURE_NAMES:
        median_val = df[col].median()
        if pd.isna(median_val):
            median_val = DEFAULT_FALLBACKS[col]
        impute_values[col] = float(median_val)
        df[col] = df[col].fillna(median_val)
        print(f"  Feature '{col}' median: {impute_values[col]}")
        
    # Features matrix X
    X = df[FEATURE_NAMES]
    
    # 3. Train Model A: Maintenance Predictor
    # Target 1: Days remaining (Regression)
    # Target 2: Severity (Classification)
    y_maint_days = df["maintenance_days_remaining"]
    y_maint_sev = df["maintenance_severity"]
    
    print("\n--- Training Model A: Maintenance Predictor ---")
    
    # Split train/test
    X_train, X_test, y_days_train, y_days_test, y_sev_train, y_sev_test = train_test_split(
        X, y_maint_days, y_maint_sev, test_size=0.2, random_state=42
    )
    
    # Regressor
    print("Training RandomForestRegressor for maintenance days remaining...")
    maint_reg = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    maint_reg.fit(X_train, y_days_train)
    y_days_pred = maint_reg.predict(X_test)
    mse = mean_squared_error(y_days_test, y_days_pred)
    r2 = r2_score(y_days_test, y_days_pred)
    print(f"  Regressor Evaluation:")
    print(f"    Mean Squared Error (MSE): {mse:.4f}")
    print(f"    R-squared (R2): {r2:.4f}")
    
    # Classifier
    print("Training RandomForestClassifier for maintenance severity...")
    maint_clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    maint_clf.fit(X_train, y_sev_train)
    y_sev_pred = maint_clf.predict(X_test)
    sev_acc = accuracy_score(y_sev_test, y_sev_pred)
    print(f"  Classifier Evaluation:")
    print(f"    Accuracy: {sev_acc:.4f}")
    print("    Classification Report:")
    print(classification_report(y_sev_test, y_sev_pred))
    
    # Save Model A Dict
    models_dir = os.path.join(base_dir, "ml", "models")
    os.makedirs(models_dir, exist_ok=True)
    maint_model_path = os.path.join(models_dir, "maintenance_model.joblib")
    print(f"Saving Maintenance Predictor Model to: {maint_model_path}")
    joblib.dump({
        "regressor": maint_reg,
        "classifier": maint_clf,
        "impute_values": impute_values,
        "feature_names": FEATURE_NAMES
    }, maint_model_path)
    
    # 4. Train Model B: Anomaly Detector
    # Detector: IsolationForest
    # Classifier: RandomForestClassifier for anomaly_type
    y_is_anomaly = df["is_anomaly"]
    y_anomaly_type = df["anomaly_type"]
    
    print("\n--- Training Model B: Anomaly Detector ---")
    
    # We'll use the train/test split for validation
    X_train_b, X_test_b, y_anom_train, y_anom_test, y_type_train, y_type_test = train_test_split(
        X, y_is_anomaly, y_anomaly_type, test_size=0.2, random_state=42
    )
    
    # Calculate contamination rate from training data
    contamination_rate = float(y_anom_train.mean())
    print(f"Calculated anomaly contamination rate: {contamination_rate:.4%}")
    
    # Isolation Forest
    print("Training IsolationForest...")
    anomaly_detector = IsolationForest(contamination=contamination_rate, random_state=42, n_jobs=-1)
    anomaly_detector.fit(X_train_b)
    
    # Evaluate Isolation Forest
    # Predicts 1 for normal, -1 for anomaly
    iforest_preds = anomaly_detector.predict(X_test_b)
    # Map to boolean (True for anomaly, False for normal)
    iforest_is_anomaly = iforest_preds == -1
    detector_acc = accuracy_score(y_anom_test, iforest_is_anomaly)
    print(f"  Detector Evaluation (IsolationForest vs Labels):")
    print(f"    Accuracy: {detector_acc:.4f}")
    print("    Classification Report:")
    print(classification_report(y_anom_test, iforest_is_anomaly))
    
    # Classifier for anomaly_type
    print("Training RandomForestClassifier for anomaly type classification...")
    anomaly_classifier = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    anomaly_classifier.fit(X_train_b, y_type_train)
    y_type_pred = anomaly_classifier.predict(X_test_b)
    type_acc = accuracy_score(y_type_test, y_type_pred)
    print(f"  Classifier Evaluation:")
    print(f"    Accuracy: {type_acc:.4f}")
    print("    Classification Report:")
    print(classification_report(y_type_test, y_type_pred))
    
    # Save Model B Dict
    anomaly_model_path = os.path.join(models_dir, "anomaly_model.joblib")
    print(f"Saving Anomaly Detector Model to: {anomaly_model_path}")
    joblib.dump({
        "detector": anomaly_detector,
        "classifier": anomaly_classifier,
        "impute_values": impute_values,
        "feature_names": FEATURE_NAMES
    }, anomaly_model_path)
    
    print("\n" + "=" * 60)
    print("MODEL TRAINING COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
