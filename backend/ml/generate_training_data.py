import pandas as pd
import numpy as np
import os
import random
from datetime import datetime, timedelta

def generate_data(num_days=30, freq_minutes=1):
    total_rows = num_days * 24 * 60 // freq_minutes
    print(f"Generating {total_rows} rows of synthetic sensor data ({num_days} days @ 1 reading/{freq_minutes}min)...")

    # Time series index
    start_time = datetime.now() - timedelta(days=num_days)
    timestamps = [start_time + timedelta(minutes=i*freq_minutes) for i in range(total_rows)]
    
    # Initialize arrays
    water_level = np.zeros(total_rows)
    flow_rate = np.zeros(total_rows)
    power_on = np.ones(total_rows, dtype=bool)
    
    # Labels
    maint_days = np.zeros(total_rows, dtype=int)
    maint_severity = np.full(total_rows, "low", dtype=object)
    is_anomaly = np.zeros(total_rows, dtype=bool)
    anomaly_type = np.full(total_rows, "none", dtype=object)

    # Scenarios distribution roughly based on plan
    # Let's construct it in chunks to simulate continuous time series.
    # We will simulate cycles of normal operation, degrading, and maintenance recovery.
    
    current_idx = 0
    cycle_length_days = 7 # Maintenance cycle roughly every 7-10 days
    
    while current_idx < total_rows:
        # Determine this cycle's length
        cycle_rows = min(random.randint(5, 10) * 24 * 60 // freq_minutes, total_rows - current_idx)
        
        # Base values for normal operation
        base_water = 80.0
        base_flow = 2.5
        
        for i in range(cycle_rows):
            idx = current_idx + i
            progress = i / cycle_rows # 0.0 to 1.0 (start to end of cycle)
            
            # 1. Normal continuous simulation with noise
            # Water level slowly depletes and gets refilled
            if i % (12 * 60) == 0:  # Refill every 12 hours approx
                base_water = random.uniform(80.0, 100.0)
            base_water -= random.uniform(0.01, 0.05) # Consume water
            water_level[idx] = base_water + random.normalvariate(0, 1)
            
            # Flow rate degrades over the cycle (filter clogging)
            current_base_flow = base_flow - (progress * 2.0) # Drops from 2.5 down to ~0.5
            flow_rate[idx] = current_base_flow + random.normalvariate(0, 0.1)
            
            # Calculate Maintenance Labels
            days_left = max(1, int((1.0 - progress) * 7)) # Roughly 7 days max
            maint_days[idx] = days_left
            
            if days_left <= 1:
                maint_severity[idx] = "critical"
            elif days_left <= 2:
                maint_severity[idx] = "high"
            elif days_left <= 4:
                maint_severity[idx] = "medium"
            else:
                maint_severity[idx] = "low"
            
            # 2. Inject Anomalies randomly
            # Low water / dry run (1% chance)
            if random.random() < 0.01:
                water_level[idx] = random.uniform(0.0, 15.0)
                flow_rate[idx] = random.uniform(0.0, 0.1)
                is_anomaly[idx] = True
                anomaly_type[idx] = "low_water"
                
            # Low flow despite good filter (1% chance)
            elif random.random() < 0.01 and progress < 0.5:
                flow_rate[idx] = random.uniform(0.0, 0.2)
                is_anomaly[idx] = True
                anomaly_type[idx] = "low_flow"
                
            # Sensor fault / outlier (0.5% chance)
            elif random.random() < 0.005:
                fault_type = random.choice(["water", "flow"])
                if fault_type == "water":
                    water_level[idx] = random.choice([-50, 200, np.nan])
                elif fault_type == "flow":
                    flow_rate[idx] = random.choice([-5, 50, np.nan])
                is_anomaly[idx] = True
                anomaly_type[idx] = "sensor_fault"

        # Advance index by cycle length
        current_idx += cycle_rows

    # Create DataFrame
    df = pd.DataFrame({
        "timestamp": timestamps,
        "water_level_pct": water_level,
        "flow_rate": flow_rate,
        "power_on": power_on,
        "maintenance_days_remaining": maint_days,
        "maintenance_severity": maint_severity,
        "is_anomaly": is_anomaly,
        "anomaly_type": anomaly_type
    })

    # Ensure data directory exists
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    # Save to CSV
    csv_path = os.path.join(data_dir, "training_data.csv")
    df.to_csv(csv_path, index=False)
    print(f"Dataset successfully saved to {csv_path}")

if __name__ == "__main__":
    generate_data()
