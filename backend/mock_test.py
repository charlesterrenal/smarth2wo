import requests
import time
import sys

# Toggle this using option 5 in the menu
BASE_URL = "https://api.smarth2wo.tech"

def send_mock_data(water, flow, power=True):
    payload = {
        "water_level_pct": water,
        "flow_rate": flow,
        "power_on": power
    }
    
    # 1. Trigger Maintenance Prediction
    try:
        res = requests.post(f"{BASE_URL}/api/maintenance/predict", json=payload)
        print(f"  [Maintenance API] Status: {res.status_code}")
        if res.status_code == 200:
            print(f"  -> {res.json().get('reason', 'Unknown')} ({res.json().get('severity', 'unknown')})")
    except Exception as e:
        print(f"  [Maintenance API] Error: {e}")
        
    # 2. Trigger Anomaly Detection
    try:
        res = requests.post(f"{BASE_URL}/api/anomalies/detect", json=payload)
        print(f"  [Anomaly API] Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            if data:
                print(f"  -> Anomaly Detected: {data[0].get('type')} ({data[0].get('severity')})")
            else:
                print("  -> System Normal (No anomalies)")
    except Exception as e:
        print(f"  [Anomaly API] Error: {e}")

def run_menu():
    global BASE_URL
    while True:
        print("\n" + "="*55)
        print(" 💧 SmartH2wo Defense Presentation Mock Tool 💧 ")
        print("="*55)
        print(f"Targeting API: {BASE_URL}")
        print("\nSelect a scenario to trigger on the live dashboard:")
        print("  1. Normal Operation (Green Status)")
        print("  2. Minor Water Leak / Low Flow (Yellow Warning)")
        print("  3. Water Tank Empty (Red Critical Alert)")
        print("  4. Sensor Disconnected / No Flow (Red Anomaly)")
        print("  5. Toggle Target (Production vs Localhost)")
        print("  0. Exit")
        
        choice = input("\nEnter choice (0-5): ")
        
        if choice == "1":
            print("\n>> Simulating Normal Operation (85% water, 2.5 L/min flow)...")
            send_mock_data(85.0, 2.5)
        elif choice == "2":
            print("\n>> Simulating Minor Leak (75% water, 1.1 L/min flow)...")
            send_mock_data(75.0, 1.1)
        elif choice == "3":
            print("\n>> Simulating Tank Empty (5% water, 0.05 L/min flow)...")
            send_mock_data(5.0, 0.05)
        elif choice == "4":
            print("\n>> Simulating Sensor Disconnect (100% water, 0.0 L/min flow)...")
            send_mock_data(100.0, 0.0)
        elif choice == "5":
            if "127.0.0.1" in BASE_URL:
                BASE_URL = "https://api.smarth2wo.tech"
            else:
                BASE_URL = "http://127.0.0.1:8000"
            print(f"\n>> Switched target URL to: {BASE_URL}")
        elif choice == "0":
            print("Exiting...")
            sys.exit(0)
        else:
            print("Invalid choice.")
            
        print("\nAction dispatched! Check your emails and the Frontend Dashboard.")
        time.sleep(1)

if __name__ == "__main__":
    run_menu()