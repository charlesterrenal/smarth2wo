import requests
import time

# Turo sa local server mo
ANOMALY_URL = "http://127.0.0.1:8000/api/anomalies/detect"
MAINTENANCE_URL = "http://127.0.0.1:8000/api/maintenance/predict"

def send_mock_data(water, temp, flow, press, description):
    payload = {
        "water_level_pct": water,
        "temperature": temp,
        "flow_rate": flow,
        "pressure": press,
        "power_on": True
    }
    print(f"\n[Sending: {description}]")
    print(f" -> Temp: {temp}°C | Water: {water}% | Flow: {flow} L/min | Pressure: {press} PSI")
    
    try:
        res_maint = requests.post(MAINTENANCE_URL, json=payload)
        print(f"    Maintenance Response: {res_maint.status_code}")
    except Exception as e:
        print(f"    Maintenance Error: {e}")
        
    try:
        res_anomaly = requests.post(ANOMALY_URL, json=payload)
        print(f"    Anomaly Response: {res_anomaly.status_code}")
    except Exception as e:
        print(f"    Anomaly Error: {e}")

# =========================================================================
# DEFINED SCENARIOS TABLE
# =========================================================================
def run_scenario(choice):
    print("--- SmartH2wo Scenario Switcher Started ---")
    
    if choice == "A":
        send_mock_data(
            water=75.0, 
            temp=55.0, 
            flow=1.8, 
            press=105.0, 
            description="CRITICAL ALERT TEST (OVERHEATING & HIGH PRESSURE)"
        )
    elif choice == "B":
        send_mock_data(
            water=3.0,        # 3% na lang, kritikal!
            temp=28.0,        # Normal na init
            flow=0.05,        # Halos walang tumutulong tubig
            press=90.0,       # Mataas na pressure para sa kaunting tubig
            description="CRITICAL DRY RUN TEST (LOW WATER LEVEL ALERT)"
        )
    elif choice == "C":
        send_mock_data(
            water=90.0,       # Puno ang tank
            temp=25.0,        # Normal temp
            flow=0.0,         # Walang agos kahit naka-on
            press=5.0,        # Bagsak ang pressure (Leakage signature)
            description="SYSTEM FAILURE TEST (LEAKAGE / NO FLOW DETECTION)"
        )
    elif choice == "D":
        send_mock_data(
            water=85.0,       # 85% Water capacity
            temp=24.5,        # Malamig at normal na makina
            flow=2.5,         # Swabeng agos ng tubig (2.5 L/min)
            press=45.0,       # Normal operating pressure (45 PSI)
            description="SYSTEM RECOVERY TEST (BACK TO NORMAL OPERATION)"
        )
    else:
        print("Maling choice! Pili ka lang sa A, B, C, o D.")
        return

    print("\n--- Simulation Sent! Go ahead and refresh your Frontend Dashboard now. ---")

# =========================================================================
# CONTROLLER TO SELECT SCENARIO
# =========================================================================
# Palitan lang ang titik sa loob ng panaklong ( ) para magpalit ng sitwasyon:
# "A" = Overheating/High Pressure (Pula)
# "B" = Dry Run / Low Water (Pula)
# "C" = Leakage / No Flow (Pula)
# "D" = Recovery / Ligtas State (Berde)

run_scenario("A")