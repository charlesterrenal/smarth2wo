"""
MQTT Service for SmartH2wo - Communicates with ESP32
Publishes dispense signals and receives sensor data
"""

import paho.mqtt.client as mqtt
import json
import os
from dotenv import load_dotenv

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "test.mosquitto.org")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

# MQTT Topics
TOPIC_DISPENSE = "smarth2o/dispense"
TOPIC_STATUS = "smarth2o/status"
TOPIC_SENSORS = "smarth2o/sensors"
TOPIC_CONTROL = "smarth2o/control"

# Global MQTT client
mqtt_client = None


def init_mqtt():
    """Initialize MQTT connection"""
    global mqtt_client
    
    try:
        mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id="smarth2o-backend")
        
        if MQTT_USERNAME and MQTT_PASSWORD:
            mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        
        mqtt_client.on_connect = on_connect
        mqtt_client.on_message = on_message
        mqtt_client.on_disconnect = on_disconnect
        
        mqtt_client.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
        
        print(f"MQTT initialized asynchronously - Broker: {MQTT_BROKER}:{MQTT_PORT}")
        return True
    except Exception as e:
        print(f"MQTT connection failed: {e}")
        mqtt_client = None
        return False


def on_connect(client, userdata, flags, rc):
    """Called when MQTT client connects"""
    if rc == 0:
        print("MQTT Connected successfully")
        client.subscribe(TOPIC_STATUS)
        client.subscribe(TOPIC_SENSORS)
    else:
        print(f"MQTT Connection failed with code {rc}")


def on_message(client, userdata, msg):
    """Called when MQTT message received"""
    try:
        payload = json.loads(msg.payload.decode())
        print(f"MQTT Message received on {msg.topic}: {payload}")
        
        if msg.topic == TOPIC_STATUS:
            print(f"ESP32 Status: {payload}")
        elif msg.topic == TOPIC_SENSORS:
            print(f"Sensor Data: {payload}")
            
            # Forward data to the ML endpoints so it is processed, logged, and emails are sent
            try:
                import requests
                port = os.getenv("BACKEND_PORT", "8000")
                base_url = f"http://127.0.0.1:{port}"
                
                print("Forwarding sensor data to ML pipeline...")
                # Note: We do NOT pass simulate=True here, because we want the DB logs and emails to fire!
                requests.post(f"{base_url}/api/maintenance/predict", json=payload, timeout=5)
                requests.post(f"{base_url}/api/anomalies/detect", json=payload, timeout=5)
            except Exception as req_err:
                print(f"Failed to forward MQTT data to ML API: {req_err}")
                
    except json.JSONDecodeError:
        print(f"Could not decode MQTT message: {msg.payload}")


def on_disconnect(client, userdata, rc):
    """Called when MQTT client disconnects"""
    if rc != 0:
        print(f"MQTT Unexpected disconnection: {rc}")
    else:
        print("MQTT Disconnected cleanly")


def publish_dispense(transaction_id: str, volume_ml: int, amount_pesos: float):
    """
    Signal ESP32 to dispense water
    
    Args:
        transaction_id: Unique transaction ID
        volume_ml: Volume to dispense in milliliters
        amount_pesos: Payment amount
    """
    if not mqtt_client:
        print("MQTT not connected - cannot publish dispense signal")
        return False
    
    payload = {
        "transaction_id": transaction_id,
        "volume_ml": volume_ml,
        "amount_pesos": amount_pesos
    }
    
    try:
        mqtt_client.publish(TOPIC_DISPENSE, json.dumps(payload), qos=1)
        print(f"Dispense signal sent: {volume_ml}ml for transaction {transaction_id}")
        return True
    except Exception as e:
        print(f"Failed to publish dispense signal: {e}")
        return False


def publish_power_status(power_on: bool):
    """
    Signal ESP32 to turn hardware power relay ON or OFF.
    """
    if not mqtt_client:
        print("MQTT not connected - cannot publish power status signal")
        return False
    
    payload = {
        "power_on": power_on
    }
    
    try:
        mqtt_client.publish(TOPIC_CONTROL, json.dumps(payload), qos=1)
        print(f"Power control signal sent: {'ON' if power_on else 'OFF'}")
        return True
    except Exception as e:
        print(f"Failed to publish power control signal: {e}")
        return False


def is_connected():
    """Check if MQTT is connected"""
    return mqtt_client is not None and mqtt_client.is_connected()


def disconnect():
    """Disconnect MQTT"""
    global mqtt_client
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        mqtt_client = None
