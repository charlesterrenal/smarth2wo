/*
  SmartH2O ESP32 - Water Dispenser Hardware Controller
  
  This code controls:
  - 3 physical buttons (100ml, 500ml, 1000ml)
  - 2.8" TFT SPI display (shows QR codes)
  - Water pump/valve (GPIO output)
  - MQTT communication with backend
  
  Wiring:
  - Button 100ml: GPIO 12
  - Button 500ml: GPIO 13
  - Button 1000ml: GPIO 14
  - Pump output: GPIO 26
  - TFT SPI: MOSI(23), CLK(18), CS(5), DC(27), RST(33)
  
  Before uploading:
  1. Install libraries: TFT_eSPI, PubSubClient, ArduinoJson
  2. Configure WiFi and backend URL below
  3. Update TFT_eSPI User_Setup.h for your display
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TFT_eSPI.h>

// ===== WiFi Configuration =====
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

// ===== Backend Configuration =====
const char* BACKEND_URL = "http://192.168.x.x:8000";  // Change to your backend IP

// ===== MQTT Configuration =====
const char* MQTT_SERVER = "test.mosquitto.org";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "smarth2o-esp32";
const char* MQTT_DISPENSE_TOPIC = "smarth2o/dispense";
const char* MQTT_STATUS_TOPIC = "smarth2o/status";

// ===== Hardware Pins =====
const int BTN_100ML = 12;
const int BTN_500ML = 13;
const int BTN_1000ML = 14;
const int PUMP_PIN = 26;

// ===== Global Objects =====
TFT_eSPI tft = TFT_eSPI();
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ===== State Variables =====
String currentTransactionId = "";
bool isWaitingForPayment = false;
unsigned long qrDisplayTimeout = 0;
const unsigned long QR_DISPLAY_DURATION = 60000;  // 60 seconds

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nSmartH2O ESP32 Starting...");
  
  // Initialize pins
  pinMode(BTN_100ML, INPUT_PULLUP);
  pinMode(BTN_500ML, INPUT_PULLUP);
  pinMode(BTN_1000ML, INPUT_PULLUP);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);
  
  // Initialize display
  initDisplay();
  displayStartup();
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();
}

// ===== Main Loop =====
void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  
  // Check button presses
  checkButtons();
  
  // Timeout QR display if no payment made
  if (isWaitingForPayment && millis() > qrDisplayTimeout) {
    isWaitingForPayment = false;
    displayReady();
  }
  
  delay(50);
}

// ===== Display Functions =====
void initDisplay() {
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
}

void displayStartup() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 60);
  tft.println("SmartH2O");
  tft.setTextSize(1);
  tft.setCursor(20, 100);
  tft.println("Connecting...");
}

void displayReady() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(0x07E0);  // Green
  tft.setTextSize(2);
  tft.setCursor(30, 60);
  tft.println("READY");
  tft.setTextSize(1);
  tft.setTextColor(TFT_WHITE);
  tft.setCursor(10, 100);
  tft.println("Press any button:");
  tft.setCursor(10, 120);
  tft.println("100ml - 2 pesos");
  tft.setCursor(10, 140);
  tft.println("500ml - 10 pesos");
  tft.setCursor(10, 160);
  tft.println("1000ml - 20 pesos");
}

void displayProcessing() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(0xFBE0);  // Yellow
  tft.setTextSize(2);
  tft.setCursor(30, 80);
  tft.println("Processing...");
  tft.setTextSize(1);
  tft.setTextColor(TFT_WHITE);
  tft.setCursor(20, 120);
  tft.println("Creating QR Code");
}

void displayQRMessage() {
  // In a real implementation, you would decode the base64 QR and display it
  // For now, show instruction
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 60);
  tft.println("Scan QR");
  tft.setTextSize(1);
  tft.setCursor(20, 100);
  tft.println("Check dashboard");
  tft.setCursor(20, 120);
  tft.println("for QR code");
  tft.setCursor(20, 160);
  tft.println("Transaction ID:");
  tft.setCursor(20, 180);
  tft.println(currentTransactionId.substring(0, 20));
}

void displayDispensing() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(0x07E0);  // Green
  tft.setTextSize(3);
  tft.setCursor(40, 80);
  tft.println("Dispensing");
  tft.setTextSize(2);
  tft.setTextColor(TFT_WHITE);
  tft.setCursor(20, 140);
  tft.println("Water flowing...");
}

void displayError(String message) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(0xF800);  // Red
  tft.setTextSize(2);
  tft.setCursor(20, 60);
  tft.println("ERROR");
  tft.setTextSize(1);
  tft.setTextColor(TFT_WHITE);
  tft.setCursor(10, 100);
  tft.println(message);
  tft.setCursor(10, 160);
  tft.println("Press button to retry");
}

// ===== WiFi Functions =====
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

// ===== MQTT Functions =====
void connectMQTT() {
  Serial.print("Connecting to MQTT: ");
  Serial.println(MQTT_SERVER);
  
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("MQTT connected!");
      mqttClient.subscribe(MQTT_DISPENSE_TOPIC);
      Serial.println("Subscribed to dispense topic");
      return;
    }
    Serial.print(".");
    delay(500);
    attempts++;
  }
  
  if (!mqttClient.connected()) {
    Serial.println("MQTT connection failed");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parse MQTT message from backend
  String topicStr = String(topic);
  
  if (topicStr == MQTT_DISPENSE_TOPIC) {
    // Received dispense signal
    DynamicJsonDocument doc(256);
    deserializeJson(doc, payload, length);
    
    String transactionId = doc["transaction_id"];
    int volumeMl = doc["volume_ml"];
    
    Serial.println("Dispense signal received!");
    Serial.print("Volume: ");
    Serial.println(volumeMl);
    
    // Trigger pump
    dispensePump(volumeMl);
  }
}

void publishStatus(String status, String message) {
  DynamicJsonDocument doc(256);
  doc["transaction_id"] = currentTransactionId;
  doc["status"] = status;
  doc["message"] = message;
  
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  mqttClient.publish(MQTT_STATUS_TOPIC, jsonStr.c_str());
}

// ===== Button Functions =====
void checkButtons() {
  if (digitalRead(BTN_100ML) == LOW) {
    delay(20);  // Debounce
    if (digitalRead(BTN_100ML) == LOW) {
      createCheckout(100, 2);
      delay(500);  // Prevent multiple triggers
    }
  }
  
  if (digitalRead(BTN_500ML) == LOW) {
    delay(20);
    if (digitalRead(BTN_500ML) == LOW) {
      createCheckout(500, 10);
      delay(500);
    }
  }
  
  if (digitalRead(BTN_1000ML) == LOW) {
    delay(20);
    if (digitalRead(BTN_1000ML) == LOW) {
      createCheckout(1000, 20);
      delay(500);
    }
  }
}

// ===== Payment Functions =====
void createCheckout(int volumeMl, int pricePesos) {
  if (!isWaitingForPayment) {
    isWaitingForPayment = true;
    qrDisplayTimeout = millis() + QR_DISPLAY_DURATION;
    
    displayProcessing();
    
    Serial.println("Creating checkout...");
    Serial.print("Volume: ");
    Serial.print(volumeMl);
    Serial.print("ml, Price: ");
    Serial.println(pricePesos);
    
    if (WiFi.status() != WL_CONNECTED) {
      displayError("WiFi disconnected");
      isWaitingForPayment = false;
      return;
    }
    
    HTTPClient http;
    String url = String(BACKEND_URL) + "/api/payments/create-checkout";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    DynamicJsonDocument doc(256);
    doc["volume_ml"] = volumeMl;
    doc["amount_pesos"] = pricePesos;
    
    String payload;
    serializeJson(doc, payload);
    
    Serial.println("Sending request...");
    int httpCode = http.POST(payload);
    
    if (httpCode == 200) {
      String response = http.getString();
      Serial.println("Response: " + response);
      
      DynamicJsonDocument responseDoc(1024);
      deserializeJson(responseDoc, response);
      
      currentTransactionId = responseDoc["transaction_id"].as<String>();
      String qrCodeBase64 = responseDoc["qr_code_base64"].as<String>();
      
      Serial.println("Transaction ID: " + currentTransactionId);
      Serial.println("QR received!");
      
      displayQRMessage();
      publishStatus("waiting_payment", "QR code displayed");
      
    } else {
      Serial.print("HTTP error: ");
      Serial.println(httpCode);
      displayError("Connection failed");
      isWaitingForPayment = false;
    }
    
    http.end();
  }
}

// ===== Pump Function =====
void dispensePump(int volumeMl) {
  displayDispensing();
  publishStatus("dispensing", "Pump started");
  
  // Calculate pump duration based on flow rate
  // Adjust PUMP_ML_PER_SECOND based on your pump specifications
  const float PUMP_ML_PER_SECOND = 10.0;  // Adjust for your pump
  int durationMs = (int)(volumeMl / PUMP_ML_PER_SECOND * 1000);
  
  Serial.print("Pump for ");
  Serial.print(durationMs);
  Serial.println("ms");
  
  // Turn pump on
  digitalWrite(PUMP_PIN, HIGH);
  delay(durationMs);
  digitalWrite(PUMP_PIN, LOW);
  
  Serial.println("Pump stopped");
  publishStatus("complete", "Water dispensed successfully");
  
  isWaitingForPayment = false;
  delay(2000);
  displayReady();
}
