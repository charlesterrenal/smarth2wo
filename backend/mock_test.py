import requests
import time

# Turo sa local server mo
ANOMALY_URL = "http://127.0.0.1:8000/api/anomalies/detect"
MAINTENANCE_URL = "http://127.0.0.1:8000/api/maintenance/predict"

print("--- SmartH2O Scenario Switcher Started ---")

def send_mock_data(water, temp, flow, press, description):
    payload = {
        "water_level_pct": water,
        "temperature": temp,
        "flow_rate": flow,
        "pressure": press,
        "power_on": True
    }
    print(f"\n[Sending: {description}] Temp: {temp}°C, Water: {water}%, Pressure: {press} PSI")
    
    try:
        res_maint = requests.post(MAINTENANCE_URL, json=payload)
        print(f"   Maintenance Response: {res_maint.status_code}")
    except Exception as e:
        print(f"   Error: {e}")
        
    try:
        res_anomaly = requests.post(ANOMALY_URL, json=payload)
        print(f"   Anomaly Response: {res_anomaly.status_code}")
    except Exception as e:
        print(f"   Error: {e}")

# =========================================================================
# SYSTEM TEST SCENARIO
# =========================================================================

# Tinanggal na natin ang kasunod na Normal script para HINDI ma-overwrite.
# Ito ay magpapadala ng high temperature at high pressure para mag-pula ang UI.

send_mock_data(
    water=75.0, 
    temp=55.0, 
    flow=1.8, 
    press=105.0, 
    description="CRITICAL ALERT TEST (OVERHEATING & HIGH PRESSURE)"
)

print("\n--- Simulation Sent! Go ahead and refresh your Frontend Dashboard now. ---")