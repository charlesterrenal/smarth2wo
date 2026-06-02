/*
  SmartH2wo ESP32 - Water Dispenser Hardware Controller
  
  TEST MODE: Uses LED instead of pump
  
  This code controls:
  - 3 physical buttons (100ml, 500ml, 1000ml)
  - 2.8" TFT SPI display (shows status)
  - LED output (GPIO 26) - toggles when "dispensing"
  - MQTT communication with backend
  
  When ready for production:
  1. Replace LED_PIN with PUMP_PIN
  2. Connect relay/MOSFET to GPIO 26
  3. Update dispensePump() to use actual timing
  See ESP32_MQTT_GUIDE.md for details
  
  Wiring:
  - Button 100ml: GPIO 12
  - Button 500ml: GPIO 13
  - Button 1000ml: GPIO 14
  - LED output (testing): GPIO 26
    (Replace with pump relay/MOSFET for production)
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
#include <qrcode.h>   // Library Manager: "QRCode" by Richard Moore (ricmoo)

// ===== Test Mode =====
// When true, the ESP32 will NOT call the backend or PayMongo.
// Button press -> fake QR shown on TFT -> auto "dispense" after 5s.
// Use this to validate hardware (buttons + TFT + LED) before wiring up the cloud.
#define TEST_MODE true

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
const int LED_PIN = 26;  // LED for testing (swap to PUMP_PIN when adding pump)

// ===== Global Objects =====
TFT_eSPI tft = TFT_eSPI();
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ===== State Variables =====
String currentTransactionId = "";
String currentCheckoutUrl = "";
int currentVolumeMl = 0;
int currentPricePesos = 0;
bool isWaitingForPayment = false;
unsigned long qrDisplayTimeout = 0;
unsigned long testDispenseAt = 0;  // TEST_MODE only: when to auto-dispense
const unsigned long QR_DISPLAY_DURATION = 60000;  // 60 seconds
const unsigned long TEST_AUTO_PAY_DELAY  = 5000;  // TEST_MODE: 5s "scan + pay" simulation

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nSmartH2wo ESP32 Starting...");
  
  // Initialize pins
  pinMode(BTN_100ML, INPUT_PULLUP);
  pinMode(BTN_500ML, INPUT_PULLUP);
  pinMode(BTN_1000ML, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize display
  initDisplay();
  displayStartup();

  if (TEST_MODE) {
    Serial.println("*** TEST_MODE enabled: skipping WiFi + MQTT + backend ***");
    delay(800);
    displayReady();
    return;
  }

  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();
  displayReady();
}

// ===== Main Loop =====
void loop() {
  if (!TEST_MODE) {
    // Maintain WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }
    // Maintain MQTT connection
    if (!mqttClient.connected()) {
      connectMQTT();
    }
    mqttClient.loop();
  }

  // Check button presses
  checkButtons();

  // TEST_MODE: simulate the customer scanning + paying after a short delay
  if (TEST_MODE && isWaitingForPayment && testDispenseAt > 0 && millis() > testDispenseAt) {
    testDispenseAt = 0;
    Serial.println("TEST_MODE: simulated payment confirmed -> dispense");
    dispensePump(currentVolumeMl);
    return;
  }

  // Timeout QR display if no payment made
  if (isWaitingForPayment && millis() > qrDisplayTimeout) {
    isWaitingForPayment = false;
    testDispenseAt = 0;
    displayReady();
  }

  delay(50);
}

// ===== UI Theme =====
// RGB565 colors. Calm dark theme with cyan/blue accents.
#define COL_BG        0x0841   // near-black with hint of blue (#080A18)
#define COL_BG_ALT    0x1082   // slightly lighter bg (#101030)
#define COL_CARD      0x1965   // card surface (#1A2D30)
#define COL_HEADER    0x18E3   // top bar (#182030)
#define COL_PRIMARY   0x05FF   // cyan accent (#00C0FF)
#define COL_ACCENT    0x441F   // bright blue (#4080FF)
#define COL_SUCCESS   0x2FE5   // lime green (#30FF30)
#define COL_WARNING   0xFD20   // amber (#FFA800)
#define COL_ERROR     0xF986   // soft red (#FF3030)
#define COL_TEXT      0xFFFF   // white
#define COL_MUTED     0x8C71   // light gray
#define COL_DIM       0x52AA   // dim gray

// ===== Display Functions =====
void initDisplay() {
  tft.init();
  tft.setRotation(1);   // landscape, 320 x 240
  tft.fillScreen(COL_BG);
  tft.setTextColor(COL_TEXT, COL_BG);
}

// --- Small UI primitives ---------------------------------------------------

// Centered text helper. Resets datum to TL after drawing.
void uiCenterText(const char* text, int y, uint8_t font, uint8_t size,
                  uint16_t fg, uint16_t bg) {
  tft.setTextFont(font);
  tft.setTextSize(size);
  tft.setTextColor(fg, bg);
  tft.setTextDatum(TC_DATUM);
  tft.drawString(text, tft.width() / 2, y);
  tft.setTextDatum(TL_DATUM);
}

// Branded top status bar with a status pill on the right.
void uiHeader(const char* brand, const char* status, uint16_t statusBg) {
  tft.fillRect(0, 0, tft.width(), 30, COL_HEADER);
  tft.drawFastHLine(0, 30, tft.width(), COL_PRIMARY);

  // Small water-drop logo on the left
  int dx = 14, dy = 15;
  tft.fillTriangle(dx, dy - 8, dx - 5, dy + 1, dx + 5, dy + 1, COL_PRIMARY);
  tft.fillCircle(dx, dy + 3, 5, COL_PRIMARY);

  // Brand text
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, COL_HEADER);
  tft.setTextDatum(ML_DATUM);
  tft.drawString(brand, 26, 15);

  // Status pill
  int statusW = strlen(status) * 7 + 18;
  int statusX = tft.width() - statusW - 8;
  tft.fillRoundRect(statusX, 6, statusW, 18, 4, statusBg);
  tft.setTextColor(COL_BG, statusBg);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(status, statusX + statusW / 2, 15);

  tft.setTextDatum(TL_DATUM);
}

// Decorative water-drop icon at (cx, cy) with given outer radius.
void uiWaterDrop(int cx, int cy, int r, uint16_t color) {
  tft.fillTriangle(cx - r, cy + r/3,
                   cx + r, cy + r/3,
                   cx,     cy - r,        color);
  tft.fillCircle(cx, cy + r/3, r * 3/4, color);
  // little highlight
  tft.fillCircle(cx - r/3, cy, 2, COL_TEXT);
}

// One row in the volume list on the READY screen.
// Minimalist: subtle card, small accent dot, volume left, price right.
void uiVolumeRow(int y, const char* volume, const char* price, uint16_t accent) {
  const int x = 16;
  const int w = tft.width() - 32;
  const int h = 48;

  // Soft card with thin border
  tft.fillRoundRect(x, y, w, h, 8, COL_CARD);
  tft.drawRoundRect(x, y, w, h, 8, COL_BG_ALT);

  // Tiny colored indicator dot on the left
  tft.fillCircle(x + 16, y + h/2, 4, accent);

  // Volume (left, white)
  tft.setTextFont(4);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, COL_CARD);
  tft.setTextDatum(ML_DATUM);
  tft.drawString(volume, x + 32, y + h/2);

  // Price (right, accent color)
  tft.setTextColor(accent, COL_CARD);
  tft.setTextDatum(MR_DATUM);
  tft.drawString(price, x + w - 16, y + h/2);

  tft.setTextDatum(TL_DATUM);
}

// --- Screens ---------------------------------------------------------------

void displayStartup() {
  tft.fillScreen(COL_BG);
  uiWaterDrop(tft.width()/2, 75, 28, COL_PRIMARY);

  uiCenterText("SmartH2wo", 125, 4, 1, COL_TEXT, COL_BG);
  uiCenterText("Smart Water Dispenser", 158, 2, 1, COL_MUTED, COL_BG);
  uiCenterText("Starting up...", 195, 2, 1, COL_DIM, COL_BG);
}

void displayReady() {
  tft.fillScreen(COL_BG);

  uiHeader("SmartH2wo",
           TEST_MODE ? "TEST" : "ONLINE",
           TEST_MODE ? COL_WARNING : COL_SUCCESS);

  // Quiet section title
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_MUTED, COL_BG);
  tft.setTextDatum(TL_DATUM);
  tft.drawString("Choose your volume", 18, 42);

  // Three options as a clean vertical list
  uiVolumeRow(64,  "100 ml",  "P2",  COL_PRIMARY);
  uiVolumeRow(120, "500 ml",  "P10", COL_PRIMARY);
  uiVolumeRow(176, "1000 ml", "P20", COL_PRIMARY);

  // Footer hint
  uiCenterText("Press a physical button to start",
               tft.height() - 14, 2, 1, COL_DIM, COL_BG);
}

void displayProcessing() {
  tft.fillScreen(COL_BG);
  uiHeader("SmartH2wo", "WAIT", COL_WARNING);

  uiWaterDrop(tft.width()/2, 90, 26, COL_WARNING);

  uiCenterText("PROCESSING", 140, 4, 1, COL_TEXT, COL_BG);
  uiCenterText("Generating QR code...", 175, 2, 1, COL_MUTED, COL_BG);

  // simple 3-dot progress
  int cy = 205, cx = tft.width()/2;
  tft.fillCircle(cx - 14, cy, 3, COL_PRIMARY);
  tft.fillCircle(cx,      cy, 3, COL_MUTED);
  tft.fillCircle(cx + 14, cy, 3, COL_DIM);
}

// Render the given text/URL as a real scannable QR on the TFT at (x0, y0).
// Uses ricmoo/QRCode. Version 6 (41x41) at ECC LOW comfortably holds typical
// PayMongo checkout URLs (~90 chars). Bump version up if your URL is longer.
void drawQRCode(const String& text, int x0, int y0, int scale = 4) {
  const uint8_t qrVersion = 6;
  const uint8_t qrEcc     = ECC_LOW;

  QRCode qr;
  uint8_t qrData[qrcode_getBufferSize(qrVersion)];
  qrcode_initText(&qr, qrData, qrVersion, qrEcc, text.c_str());

  const int qrPx = qr.size * scale;

  // White rounded card behind the QR for nicer presentation + quiet zone
  tft.fillRoundRect(x0 - scale * 2, y0 - scale * 2,
                    qrPx + scale * 4, qrPx + scale * 4, 6, TFT_WHITE);

  for (uint8_t y = 0; y < qr.size; y++) {
    for (uint8_t x = 0; x < qr.size; x++) {
      uint16_t color = qrcode_getModule(&qr, x, y) ? TFT_BLACK : TFT_WHITE;
      tft.fillRect(x0 + x * scale, y0 + y * scale, scale, scale, color);
    }
  }
}

// Draw one numbered step in the instructions list.
void uiStep(int num, int y, const char* line1, const char* line2,
            int textX, uint16_t bg) {
  // Numbered circle badge
  int badgeX = textX;
  int badgeY = y + 8;
  tft.fillCircle(badgeX, badgeY, 8, COL_PRIMARY);
  char nbuf[3];
  snprintf(nbuf, sizeof(nbuf), "%d", num);
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_BG, COL_PRIMARY);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(nbuf, badgeX, badgeY);

  // Step text (lines wrapped manually so we control layout)
  tft.setTextColor(COL_TEXT, bg);
  tft.setTextDatum(TL_DATUM);
  tft.setTextFont(2);
  tft.drawString(line1, badgeX + 14, y);
  if (line2 && line2[0]) {
    tft.setTextColor(COL_MUTED, bg);
    tft.drawString(line2, badgeX + 14, y + 14);
  }
}

void displayQRMessage() {
  tft.fillScreen(COL_BG);

  // Header with price
  char headerText[40];
  snprintf(headerText, sizeof(headerText), "SCAN TO PAY  P%d", currentPricePesos);
  uiHeader(headerText, TEST_MODE ? "TEST" : "PAY", COL_PRIMARY);

  // Decide what to encode in the QR
  String qrPayload;
  if (currentCheckoutUrl.length() > 0) {
    qrPayload = currentCheckoutUrl;          // real PayMongo URL
  } else {
    // TEST_MODE fallback - any URL works for verifying scanability
    qrPayload = "https://smarth2wo.test/pay/" + String(currentVolumeMl) + "ml";
  }

  // QR on the LEFT (scale 4 = 164px, plus white quiet zone)
  const int qrX = 14, qrY = 42;
  drawQRCode(qrPayload, qrX, qrY, 4);

  // Instructions on the RIGHT
  const int rightX = qrX + 41*4 + 14;   // QR pixel-width + gap

  // "QR PH" badge so users know it's universal
  tft.fillRoundRect(rightX, 38, 42, 16, 3, COL_PRIMARY);
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_BG, COL_PRIMARY);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("QR PH", rightX + 21, 46);

  // Section title beside the badge
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("How to pay", rightX + 48, 46);

  // Steps: scan -> PayMongo -> save QR PH -> upload to bank app -> pay
  uiStep(1,  68,  "Scan QR with",  "camera app",   rightX + 8, COL_BG);
  uiStep(2,  104, "Pick QR Ph,",   "save image",   rightX + 8, COL_BG);
  uiStep(3,  140, "Upload to",     "ewallet/bank", rightX + 8, COL_BG);
  uiStep(4,  176, "Pay & wait",    "for water",    rightX + 8, COL_BG);

  // Footer band
  int footerY = tft.height() - 26;
  tft.fillRect(0, footerY, tft.width(), 26, COL_BG_ALT);
  tft.drawFastHLine(0, footerY, tft.width(), COL_PRIMARY);

  // Volume left
  char vol[16];
  snprintf(vol, sizeof(vol), "%d ml", currentVolumeMl);
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_PRIMARY, COL_BG_ALT);
  tft.setTextDatum(ML_DATUM);
  tft.drawString(vol, 10, footerY + 13);

  // Hint right
  tft.setTextColor(COL_MUTED, COL_BG_ALT);
  tft.setTextDatum(MR_DATUM);
  tft.drawString(TEST_MODE ? "Auto-pay in ~5s" : "GCash, Maya, BPI, BDO...",
                 tft.width() - 10, footerY + 13);

  tft.setTextDatum(TL_DATUM);
}

void displayDispensing() {
  tft.fillScreen(COL_BG);
  uiHeader("SmartH2wo", "ACTIVE", COL_SUCCESS);

  uiWaterDrop(tft.width()/2, 80, 32, COL_SUCCESS);

  uiCenterText("DISPENSING", 130, 4, 1, COL_SUCCESS, COL_BG);

  // Volume readout
  char vol[24];
  snprintf(vol, sizeof(vol), "%d ml", currentVolumeMl);
  uiCenterText(vol, 165, 4, 1, COL_TEXT, COL_BG);

  // Progress bar (full at start; could animate later)
  int barW = 240, barH = 8;
  int barX = (tft.width() - barW) / 2;
  int barY = 205;
  tft.drawRoundRect(barX, barY, barW, barH, 3, COL_DIM);
  tft.fillRoundRect(barX + 1, barY + 1, barW - 2, barH - 2, 2, COL_SUCCESS);

  uiCenterText("Please wait...", 220, 2, 1, COL_MUTED, COL_BG);
}

void displayError(String message) {
  tft.fillScreen(COL_BG);

  // Red header bar
  tft.fillRect(0, 0, tft.width(), 30, COL_ERROR);
  tft.drawFastHLine(0, 30, tft.width(), COL_TEXT);
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, COL_ERROR);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("! ERROR", tft.width()/2, 15);
  tft.setTextDatum(TL_DATUM);

  // X icon in a circle
  int cx = tft.width()/2, cy = 90;
  tft.fillCircle(cx, cy, 28, COL_ERROR);
  tft.fillCircle(cx, cy, 23, COL_BG);
  for (int t = -1; t <= 1; t++) {
    tft.drawLine(cx - 11, cy - 11 + t, cx + 11, cy + 11 + t, COL_ERROR);
    tft.drawLine(cx - 11, cy + 11 + t, cx + 11, cy - 11 + t, COL_ERROR);
  }

  uiCenterText(message.c_str(), 145, 4, 1, COL_TEXT, COL_BG);
  uiCenterText("Press any button to retry", 200, 2, 1, COL_MUTED, COL_BG);
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
  if (isWaitingForPayment) return;

  isWaitingForPayment   = true;
  currentVolumeMl       = volumeMl;
  currentPricePesos     = pricePesos;
  currentCheckoutUrl    = "";
  currentTransactionId  = "";
  qrDisplayTimeout      = millis() + QR_DISPLAY_DURATION;

  displayProcessing();

  Serial.printf("Creating checkout - Volume: %dml, Price: P%d\n", volumeMl, pricePesos);

  // ----- TEST_MODE: don't call backend, just fake a QR + auto-dispense -----
  if (TEST_MODE) {
    currentTransactionId = "TEST-" + String(millis());
    Serial.println("TEST_MODE: skipping HTTP, showing fake QR");
    displayQRMessage();
    testDispenseAt = millis() + TEST_AUTO_PAY_DELAY;
    return;
  }

  // ----- Live mode: call backend -----
  if (WiFi.status() != WL_CONNECTED) {
    displayError("WiFi disconnected");
    isWaitingForPayment = false;
    return;
  }

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/payments/create-checkout";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);
  doc["volume_ml"]   = volumeMl;
  doc["amount_pesos"] = pricePesos;
  String payload;
  serializeJson(doc, payload);

  Serial.println("Sending request...");
  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("Response: " + response);

    // We only care about the small string fields; ignore the big base64 blob.
    // Use a filter so the QR PNG base64 doesn't blow up RAM.
    StaticJsonDocument<128> filter;
    filter["transaction_id"] = true;
    filter["checkout_url"]   = true;

    DynamicJsonDocument responseDoc(1024);
    DeserializationError err = deserializeJson(
      responseDoc, response, DeserializationOption::Filter(filter));

    if (err) {
      Serial.print("JSON parse error: ");
      Serial.println(err.c_str());
      displayError("Bad server reply");
      isWaitingForPayment = false;
    } else {
      currentTransactionId = responseDoc["transaction_id"].as<String>();
      currentCheckoutUrl   = responseDoc["checkout_url"].as<String>();
      Serial.println("Transaction ID: " + currentTransactionId);
      Serial.println("Checkout URL:   " + currentCheckoutUrl);

      displayQRMessage();
      publishStatus("waiting_payment", "QR code displayed");
    }
  } else {
    Serial.printf("HTTP error: %d\n", httpCode);
    displayError("Connection failed");
    isWaitingForPayment = false;
  }

  http.end();
}

// ===== Pump Function =====
void dispensePump(int volumeMl) {
  displayDispensing();
  if (!TEST_MODE) publishStatus("dispensing", "LED activated (testing)");

  Serial.printf("Dispense start - simulating %dml with LED\n", volumeMl);

  // Crude volume-proportional timing so 1000ml feels longer than 100ml.
  // ~2ml per millisecond -> 100ml=500ms, 500ml=2500ms, 1000ml=5000ms.
  // Replace with calibrated pump timing in production.
  unsigned long durationMs = max(500, volumeMl / 2);

  digitalWrite(LED_PIN, HIGH);
  delay(durationMs);
  digitalWrite(LED_PIN, LOW);

  Serial.println("Dispense complete");
  if (!TEST_MODE) publishStatus("complete", "Water dispensed (LED test)");

  isWaitingForPayment = false;
  currentCheckoutUrl  = "";
  currentTransactionId = "";
  testDispenseAt = 0;
  delay(1500);
  displayReady();
}
