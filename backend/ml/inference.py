import os
import joblib
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional, Union

# Import preprocessing
from ml.feature_engineering import preprocess_features, FEATURE_NAMES

class MaintenancePredictor:
    def __init__(self, model_dir: Optional[str] = None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
            
        self.model_path = os.path.join(model_dir, "maintenance_model.joblib")
        self.regressor = None
        self.classifier = None
        self.impute_values = None
        self.is_loaded = False
        
        self.load_model()
        
    def load_model(self):
        try:
            if os.path.exists(self.model_path):
                data = joblib.load(self.model_path)
                self.regressor = data["regressor"]
                self.classifier = data["classifier"]
                self.impute_values = data.get("impute_values")
                self.is_loaded = True
                print(f"ML SUCCESS: MaintenancePredictor model loaded from {self.model_path}")
            else:
                print(f"ML WARNING: Maintenance model file not found at {self.model_path}. Using fallback rules.")
        except Exception as e:
            print(f"ML ERROR: Failed to load Maintenance model: {e}. Using fallback rules.")
            self.is_loaded = False
            
    def predict(self, sensor_data: Union[Dict[str, Any], Any]) -> Optional[Dict[str, Any]]:
        if not self.is_loaded:
            return None
            
        try:
            # 1. Preprocess features (handles missing values using training medians)
            X = preprocess_features(sensor_data, self.impute_values)
            
            # 2. Perform regression for days remaining
            days_pred = self.regressor.predict(X)[0]
            days_remaining = max(1, int(round(days_pred)))
            
            # 3. Perform classification for severity
            severity = self.classifier.predict(X)[0]
            
            # 4. Compute confidence (class probability of predicted severity)
            probs = self.classifier.predict_proba(X)[0]
            classes = self.classifier.classes_
            class_idx = np.where(classes == severity)[0][0]
            confidence = float(probs[class_idx])
            
            # 5. Generate human-readable reason based on feature deviations
            X_arr = X.values if hasattr(X, "values") else X
            water_level = X_arr[0][0]
            temp = X_arr[0][1]
            flow = X_arr[0][2]
            pressure = X_arr[0][3]
            
            reasons = []
            if water_level < 20:
                reasons.append("low water level")
            elif water_level < 40:
                reasons.append("declining water level")
                
            if temp > 45:
                reasons.append("high system temperature")
                
            if flow < 0.5:
                reasons.append("low flow rate (potential filter clogging)")
                
            if pressure > 80:
                reasons.append("high operating pressure")
                
            if reasons:
                reason = "ML Prediction - Sensor deviations detected: " + ", ".join(reasons)
            else:
                reason = "ML Prediction - All sensor readings within normal bounds"
                
            return {
                "days_remaining": days_remaining,
                "reason": reason,
                "severity": severity,
                "confidence": round(confidence, 4)
            }
        except Exception as e:
            print(f"ML ERROR: Exception during maintenance prediction: {e}")
            return None


class AnomalyDetector:
    def __init__(self, model_dir: Optional[str] = None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
            
        self.model_path = os.path.join(model_dir, "anomaly_model.joblib")
        self.detector = None
        self.classifier = None
        self.impute_values = None
        self.is_loaded = False
        
        self.load_model()
        
    def load_model(self):
        try:
            if os.path.exists(self.model_path):
                data = joblib.load(self.model_path)
                self.detector = data["detector"]
                self.classifier = data["classifier"]
                self.impute_values = data.get("impute_values")
                self.is_loaded = True
                print(f"ML SUCCESS: AnomalyDetector model loaded from {self.model_path}")
            else:
                print(f"ML WARNING: Anomaly model file not found at {self.model_path}. Using fallback rules.")
        except Exception as e:
            print(f"ML ERROR: Failed to load Anomaly model: {e}. Using fallback rules.")
            self.is_loaded = False
            
    def predict(self, sensor_data: Union[Dict[str, Any], Any]) -> Optional[List[Dict[str, Any]]]:
        if not self.is_loaded:
            return None
            
        try:
            # Check power status first (separate categorical rule, not in numeric features)
            power_on = True
            if isinstance(sensor_data, dict):
                power_on = sensor_data.get("power_on", True)
            else:
                power_on = getattr(sensor_data, "power_on", True)
                
            anomalies = []
            if not power_on:
                anomalies.append({
                    "type": "Power Status",
                    "message": "System is powered off",
                    "severity": "low",
                    "timestamp": datetime.now().isoformat()
                })
                return anomalies
                
            # 1. Preprocess features
            X = preprocess_features(sensor_data, self.impute_values)
            
            # 2. Detect anomaly presence (Isolation Forest predicts -1 for anomalies)
            is_anomaly_pred = self.detector.predict(X)[0]
            
            if is_anomaly_pred == -1:
                # 3. Classify anomaly type
                anomaly_type = self.classifier.predict(X)[0]
                
                # If classifier says "none", but Isolation Forest says anomaly, we treat it as generic anomaly
                if anomaly_type == "none":
                    anomalies.append({
                        "type": "System Anomaly",
                        "message": "ML detected anomalous sensor pattern",
                        "severity": "medium",
                        "timestamp": datetime.now().isoformat()
                    })
                else:
                    # Map types to descriptions and severity
                    X_arr = X.values if hasattr(X, "values") else X
                    mapping = {
                        "overheating": {
                            "type": "Overheating",
                            "message": f"ML detected critical system temperature: {X_arr[0][1]}°C",
                            "severity": "critical" if X_arr[0][1] > 50 else "high"
                        },
                        "low_water": {
                            "type": "Critical Low Level",
                            "message": f"ML detected critically low water tank level: {X_arr[0][0]}%",
                            "severity": "critical"
                        },
                        "high_pressure": {
                            "type": "Pressure Alert",
                            "message": f"ML detected critical pressure spike: {X_arr[0][3]} PSI",
                            "severity": "critical"
                        },
                        "low_flow": {
                            "type": "Low Flow",
                            "message": f"ML detected flow rate drop: {X_arr[0][2]} L/min",
                            "severity": "high"
                        },
                        "sensor_fault": {
                            "type": "Invalid Reading",
                            "message": "ML detected sensor fault / invalid reading outlier",
                            "severity": "medium"
                        }
                    }
                    
                    details = mapping.get(anomaly_type, {
                        "type": "System Anomaly",
                        "message": f"ML detected anomaly type: {anomaly_type}",
                        "severity": "medium"
                    })
                    
                    anomalies.append({
                        "type": details["type"],
                        "message": details["message"],
                        "severity": details["severity"],
                        "timestamp": datetime.now().isoformat()
                    })
                    
            return anomalies
        except Exception as e:
            print(f"ML ERROR: Exception during anomaly detection: {e}")
            return None
