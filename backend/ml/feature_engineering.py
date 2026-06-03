import numpy as np
import pandas as pd
from typing import Union, Dict, Any

# Feature names in the exact order they were used during training
FEATURE_NAMES = ["water_level_pct", "temperature", "flow_rate", "pressure"]

# Hardcoded absolute fallback values if model metadata is not loaded
DEFAULT_FALLBACKS = {
    "water_level_pct": 80.0,
    "temperature": 25.0,
    "flow_rate": 2.5,
    "pressure": 45.0
}

def preprocess_features(sensor_data: Union[Dict[str, Any], Any], impute_values: Dict[str, float] = None) -> pd.DataFrame:
    """
    Extracts, imputes, and formats sensor features for ML model predictions.
    
    Args:
        sensor_data: A dictionary or an object (e.g. Pydantic SensorData) containing sensor readings.
        impute_values: A dictionary containing default values for imputation of missing values (NaN/None).
        
    Returns:
        A pandas DataFrame of shape (1, 4) containing:
        [water_level_pct, temperature, flow_rate, pressure]
    """
    features = []
    
    for field in FEATURE_NAMES:
        val = None
        if isinstance(sensor_data, dict):
            val = sensor_data.get(field)
        else:
            val = getattr(sensor_data, field, None)
            
        # Handle NaN/None
        if val is None or (isinstance(val, (float, int)) and np.isnan(val)):
            if impute_values and field in impute_values:
                val = impute_values[field]
            else:
                val = DEFAULT_FALLBACKS[field]
        
        features.append(float(val))
        
    # Return as DataFrame with correct column names to avoid warnings
    return pd.DataFrame([features], columns=FEATURE_NAMES)
