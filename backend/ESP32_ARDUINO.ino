/*
  SmartH2wo ESP32 - Water Dispenser Hardware Controller
  
  PHASE 2: Full hardware integration
  
  This code controls:
  - 3 volume buttons (100ml, 500ml, 1000ml) + 2 payment buttons
  - 2.8" TFT SPI display (shows status, QR codes, coin progress)
  - 2-Channel 5V Relay: Pump (CH1) + Solenoid (CH2)
  - ZJ-S201 Flow Sensor (pulse counting via interrupt)
  - HC-SR04 Ultrasonic Sensor (water level measurement)
  - Allan 1239A Coin Acceptor (pulse via interrupt, NPN open-collector)
  - MQTT communication with backend (bidirectional)
  
  TEST_MODE = true: skips WiFi/MQTT/backend, simulates sensors with LED
  TEST_MODE = false: full production mode with all hardware
  
  Wiring (Phase 2 — boot-safe pin assignment):
  - Button 100ml:  GPIO 15 (moved off strapping pin 12)
  - Button 500ml:  GPIO 16 (moved off strapping pin 13)
  - Button 1000ml: GPIO 14
  - Button QR Pay: GPIO 25
  - Button Coin:   GPIO 32
  - Relay Pump:    GPIO 26 (Active LOW)
  - Relay Solenoid:GPIO 4  (Active LOW)
  - Flow Sensor:   GPIO 34 (input-only, ext 10kΩ pull-up to 3.3V)
  - HC-SR04 Trig:  GPIO 17
  - HC-SR04 Echo:  GPIO 35 (input-only, 1kΩ+2kΩ voltage divider)
  - Coin Acceptor: GPIO 36 (input-only, 10kΩ pull-up to 3.3V)
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
// Sensors and relays are skipped; LED on GPIO 26 simulates pump.
#define TEST_MODE false

// ===== WiFi Configuration =====
const char* WIFI_SSID_PRIMARY = "YOUR_SSID";
const char* WIFI_PASS_PRIMARY = "YOUR_PASSWORD";
const char* WIFI_SSID_FALLBACK = "SmartH2wo_Demo";  // Mobile Hotspot fallback for presentation
const char* WIFI_PASS_FALLBACK = "thesis2026";

// ===== Backend Configuration =====
String BACKEND_URL = "https://api.smarth2wo.tech";  // Starts with default
const char* BACKEND_URL_PRIMARY = "https://api.smarth2wo.tech"; // Public URL
const char* BACKEND_URL_FALLBACK = "http://192.168.137.1:8000"; // Use "http://172.20.10.2:8000" if connected to Phone hotspot instead

// ===== MQTT Configuration =====
const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "smarth2o-esp32";
const char* MQTT_DISPENSE_TOPIC = "smarth2o/dispense";
const char* MQTT_STATUS_TOPIC = "smarth2o/status";
const char* MQTT_SENSORS_TOPIC = "smarth2o/sensors";
const char* MQTT_CONTROL_TOPIC = "smarth2o/control";

// ===== Hardware Pins (Phase 2 — boot-safe) =====
// Buttons (reassigned off strapping pins)
const int BTN_100ML    = 15;   // Was GPIO 12 (boot strapping pin — unsafe)
const int BTN_250ML    = 16;   // Was GPIO 13 (JTAG pin — unsafe)
const int BTN_500ML    = 14;
const int BTN_QR_PAY   = 25;
const int BTN_COIN_PAY = 32;

// Actuators (relay module — active LOW)
const int RELAY_PUMP     = 26;  // Relay CH1: 12V DC water pump
const int RELAY_SOLENOID = 4;   // Relay CH2: 12V solenoid valve

// Sensors
const int FLOW_SENSOR_PIN = 34;  // ZJ-S201 pulse output (input-only, ext 10kΩ pull-up to 3.3V)
const int US_TRIG_PIN     = 17;  // HC-SR04 trigger
const int US_ECHO_PIN     = 35;  // HC-SR04 echo (input-only, voltage divider)
const int COIN_PULSE_PIN  = 22;  // Allan 1239A coin acceptor (moved to 22 to use internal pull-up)
const int COIN_INHIBIT_PIN = 19;  // Allan 1239A grey wire

void enableCoinAcceptor()  { digitalWrite(COIN_INHIBIT_PIN, HIGH); }
void disableCoinAcceptor() { digitalWrite(COIN_INHIBIT_PIN, LOW);  }

// LED for TEST_MODE only (same physical pin as RELAY_PUMP)
const int LED_PIN = 26;

// ===== Flow Sensor Calibration =====
// Set FLOW_SENSOR_ENABLED to false to use time-based dispensing instead.
// TIME-BASED MODE: Measure your pump's flow rate first!
//   1. Run pump for exactly 10 seconds into a measuring cup.
//   2. Note how many ml came out. Divide by 10 to get ml/sec.
//   3. Set PUMP_FLOW_RATE_ML_PER_SEC to that value.
#define FLOW_SENSOR_ENABLED false  // TIME-BASED MODE for reliable demo
const float FLOW_PULSES_PER_ML    = 0.45;   // Not used in time-based mode
const float PUMP_FLOW_RATE_ML_PER_SEC = 24.0; // CALIBRATED: 80ml/3.33s measured on 2026-06-17

// ===== Ultrasonic Calibration =====
// Measure the distance from sensor face to tank bottom (empty tank) in cm.
// Update this after physically mounting the sensor.
const float TANK_HEIGHT_CM = 45.0;  // CALIBRATED on-site
const float US_MIN_DISTANCE_CM = 3.0;  // Minimum valid reading (sensor dead zone)

// ===== Flow Sensor ISR Variables (volatile for interrupt safety) =====
volatile unsigned long flowPulseCount = 0;
volatile unsigned long lastFlowPulseTime = 0;

void IRAM_ATTR flowSensorISR() {
  unsigned long now = micros();
  // Debounce: ignore pulses faster than 5ms apart (filters out pump motor electrical noise)
  if (now - lastFlowPulseTime > 5000) {
    flowPulseCount++;
    lastFlowPulseTime = now;
  }
}

// ===== Coin Acceptor ISR Variables =====
volatile int coinPulseCount = 0;
volatile unsigned long lastCoinPulseTime = 0;

void IRAM_ATTR coinPulseISR() {
  unsigned long now = millis();
  // Debounce: ignore pulses faster than 20ms apart (allows fast coins)
  if (now - lastCoinPulseTime > 20) {
    coinPulseCount++;
    lastCoinPulseTime = now;
  }
}

// ===== Sensor State =====
float currentWaterLevelPct = 100.0;  // Last ultrasonic reading as percentage
float currentFlowRate = 0.0;         // L/min calculated from pulse frequency
bool systemPowerEnabled = true;      // Controlled via MQTT from dashboard
unsigned long lastSensorPublish = 0;  // Timer for periodic sensor MQTT publish
unsigned long lastUltrasonicRead = 0; // Timer for periodic ultrasonic reads
const unsigned long SENSOR_PUBLISH_INTERVAL = 10000;  // Publish every 10 seconds
const unsigned long ULTRASONIC_READ_INTERVAL = 5000;  // Read every 5 seconds

// ===== Global Objects =====
TFT_eSPI tft = TFT_eSPI();
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ===== Application State Machine =====
// Replaces the old isWaitingForPayment boolean with a proper state enum so
// the button handler can dispatch correctly per screen.
enum AppState {
  STATE_READY,            // payment method selector (QR or COIN)
  STATE_CHOOSE_VOLUME,    // QR path: pick a volume (was STATE_CHOOSE_PAYMENT)
  STATE_QR_PAYMENT,       // QR shown, waiting for webhook
  STATE_COIN_PAYMENT,     // coin-first: insert coins, then pick volume
  STATE_COIN_WARNING,     // partial credit warning before forfeit
  STATE_DISPENSING,       // dispensing water
  STATE_ERROR             // error, any button dismisses
};
AppState appState = STATE_READY;

// ===== State Variables =====
String currentTransactionId = "";
String currentCheckoutUrl = "";
int currentVolumeMl = 0;
int currentPricePesos = 0;
int coinCredit = 0;                  // pesos accumulated in current coin transaction
unsigned long qrDisplayTimeout = 0;  // QR auto-cancel deadline
unsigned long testDispenseAt = 0;    // TEST_MODE only: when to auto-dispense (QR sim)
unsigned long qrShownAt = 0;         // when the QR first appeared (for cancel lockout)
unsigned long chooseTimeoutAt = 0;   // CHOOSE_PAYMENT auto-cancel deadline
unsigned long coinTimeoutAt = 0;     // COIN_PAYMENT -> COIN_WARNING deadline
unsigned long warnTimeoutAt = 0;     // COIN_WARNING -> forfeit deadline

const unsigned long QR_DISPLAY_DURATION   = 300000; // 5 min QR timeout (plenty of time for GCash/Maya)
const unsigned long TEST_AUTO_PAY_DELAY   = 5000;   // 5s TEST_MODE auto-pay (QR)
const unsigned long CANCEL_LOCKOUT_MS     = 1200;   // 1.2s lockout after screen change
                                                    // (prevents the press that opened a
                                                    // screen from immediately closing it)
const unsigned long CHOOSE_TIMEOUT_MS     = 15000;  // 15s on payment-select screen
const unsigned long COIN_TIMEOUT_MS       = 60000;  // 60s primary wait for coins
const unsigned long COIN_WARNING_MS       = 30000;  // +30s extension before forfeit

unsigned long screenShownAt = 0;     // generic "current screen entered at" timestamp
                                     // (used by the cancel lockout for non-QR screens too)

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nSmartH2wo ESP32 Starting...");
  Serial.println(TEST_MODE ? ">>> TEST MODE <<<" : ">>> PRODUCTION MODE <<<");
  
  // Initialize button pins
  pinMode(BTN_100ML,    INPUT_PULLUP);
  pinMode(BTN_250ML,    INPUT_PULLUP);
  pinMode(BTN_500ML,    INPUT_PULLUP);
  pinMode(BTN_QR_PAY,   INPUT_PULLUP);
  pinMode(BTN_COIN_PAY, INPUT_PULLUP);
  
  if (TEST_MODE) {
    // TEST_MODE: use LED on the relay pin for visual feedback
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
  } else {
    // PRODUCTION: initialize relay pins (HIGH = relay OFF for active-low modules)
    pinMode(RELAY_PUMP, OUTPUT);
    digitalWrite(RELAY_PUMP, HIGH);      // Pump OFF
    pinMode(RELAY_SOLENOID, OUTPUT);
    digitalWrite(RELAY_SOLENOID, HIGH);  // Solenoid OFF
    
    // Flow sensor interrupt (using the external physical 10k resistor!)
    pinMode(FLOW_SENSOR_PIN, INPUT);
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowSensorISR, FALLING);
    
    // HC-SR04 ultrasonic
    pinMode(US_TRIG_PIN, OUTPUT);
    digitalWrite(US_TRIG_PIN, LOW);
    pinMode(US_ECHO_PIN, INPUT);         // Voltage divider on echo line
    
    // Coin acceptor interrupt
    pinMode(COIN_PULSE_PIN, INPUT_PULLUP); // Using ESP32's built-in internal resistor!
    attachInterrupt(digitalPinToInterrupt(COIN_PULSE_PIN), coinPulseISR, FALLING);
    
    // Coin Acceptor Inhibit Pin
    pinMode(COIN_INHIBIT_PIN, OUTPUT);
    disableCoinAcceptor();
    
    Serial.println("Hardware initialized: relays, flow sensor, ultrasonic, coin acceptor");
  }
  
  // Initialize display
  initDisplay();
  displayStartup();

  if (TEST_MODE) {
    Serial.println("*** TEST_MODE enabled: Simulating Actuators, but USING real WiFi/MQTT ***");
    delay(800);
  }

  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1024); // Large buffer: dispense JSON + sensor payloads
  connectMQTT();
  
  // Take initial ultrasonic reading
  currentWaterLevelPct = readWaterLevel();
  Serial.printf("Initial water level: %.1f%%\n", currentWaterLevelPct);
  
  displayReady();
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

  unsigned long now = millis();

  // === Process coin acceptor pulses (production only) ===
  // ISR increments coinPulseCount; we process it here in the main loop
  // to avoid calling display/MQTT functions inside an ISR.
  if (!TEST_MODE && coinPulseCount > 0) {
    noInterrupts();
    int pulsesToProcess = coinPulseCount;
    coinPulseCount = 0;
    interrupts();
    
    // Each pulse = 1 peso (configure on coin slot via DIP switches)
    if (appState == STATE_COIN_PAYMENT || appState == STATE_COIN_WARNING) {
      for (int i = 0; i < pulsesToProcess; i++) {
        addCoinCredit(1);
      }
    } else {
      // Hardware Test: If they drop a coin while in the main menu, print it so they know it works!
      Serial.printf("TEST: Coin dropped! (Pulses: %d). You must select a volume first to pay.\n", pulsesToProcess);
    }
  }

  // === Periodic ultrasonic reading (production only) ===
  if (!TEST_MODE && (now - lastUltrasonicRead >= ULTRASONIC_READ_INTERVAL)) {
    lastUltrasonicRead = now;
    // Only read when not dispensing (pump vibration can interfere)
    if (appState != STATE_DISPENSING) {
      currentWaterLevelPct = readWaterLevel();
    }
  }

  // === Periodic sensor data publishing via MQTT (production only) ===
  if (!TEST_MODE && (now - lastSensorPublish >= SENSOR_PUBLISH_INTERVAL)) {
    lastSensorPublish = now;
    publishSensorData();
  }

  // === State machine timeouts ===
  switch (appState) {
    case STATE_QR_PAYMENT:
      // Timeout QR if no payment made within the window
      if (now > qrDisplayTimeout) {
        Serial.println("QR display timed out - returning to READY");
        resetTransactionState();
        displayReady();
      }
      break;

    case STATE_CHOOSE_VOLUME:
      // Auto-cancel back to READY if the user walks away
      if (now > chooseTimeoutAt) {
        Serial.println("Payment select timed out - returning to READY");
        resetTransactionState();
        displayReady();
      }
      break;

    case STATE_COIN_PAYMENT:
      // Primary timeout: move into "still waiting / warning" state
      if (now > coinTimeoutAt) {
        Serial.println("Coin payment slow - showing warning");
        appState = STATE_COIN_WARNING;
        warnTimeoutAt = now + COIN_WARNING_MS;
        screenShownAt = now;
        displayCoinMode();
      }
      break;

    case STATE_COIN_WARNING:
      // Extension expired - forfeit any partial credit and return to READY
      if (now > warnTimeoutAt) {
        if (coinCredit > 0) {
          Serial.printf("Coin credit forfeited: P%d (timeout)\n", coinCredit);
        }
        resetTransactionState();
        displayReady();
      }
      break;

    default:
      break;
  }

  delay(50);
}

// ===== UI Theme =====
// RGB565 colors matched to dash.smarth2wo.tech design language.
// Dashboard uses dark navy bg, electric cyan accent, emerald green for success.
#define COL_BG        0x0862   // #0B1220 deep navy background
#define COL_BG_ALT    0x0C44   // #111827 card surface
#define COL_CARD      0x10A3   // #172033 elevated card
#define COL_HEADER    0x0862   // same as BG (no contrast header)
#define COL_PRIMARY   0x067F   // #06B6D4 cyan (dashboard --color-cyan)
#define COL_BLUE      0x25DB   // #2563EB dashboard --color-blue
#define COL_SUCCESS   0x0753   // #10B981 emerald (dashboard --color-green)
#define COL_WARNING   0xFC60   // #F97316 orange (dashboard --color-warning)
#define COL_ERROR     0xF8C4   // #EF4444 red (dashboard --color-danger)
#define COL_TEXT      0xFFFF   // #FFFFFF white
#define COL_MUTED     0xCE59   // #CBD5E1 secondary text
#define COL_DIM       0x9492   // #94A3B8 muted text
#define COL_BORDER    0x18C4   // #172033 subtle borders
#define COL_ACCENT_BG 0x0902   // #0F1724 slightly lighter surface

// ===== Display Functions =====
void initDisplay() {
  tft.init();
  tft.setRotation(3);   // landscape inverted (flipped 180 degrees)
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

// Branded top nav bar — matches the dashboard sidebar header strip.
// Left: water-drop + brand text. Right: status pill.
void uiHeader(const char* brand, const char* status, uint16_t statusColor) {
  // Full-width solid header bar
  tft.fillRect(0, 0, tft.width(), 36, COL_ACCENT_BG);
  // Bottom border line — dashboard uses a thin subtle border
  tft.drawFastHLine(0, 36, tft.width(), COL_BORDER);
  // Cyan left-edge accent stripe (like active sidebar item)
  tft.fillRect(0, 0, 3, 36, COL_PRIMARY);

  // Water-drop icon (teardrop shape)
  int dx = 20, dy = 18;
  tft.fillTriangle(dx, dy - 9, dx - 5, dy + 2, dx + 5, dy + 2, COL_PRIMARY);
  tft.fillCircle(dx, dy + 3, 6, COL_PRIMARY);
  // Inner shine highlight
  tft.fillCircle(dx - 2, dy, 2, 0xC7DF);

  // Brand text — bold white
  tft.setTextFont(4);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, COL_ACCENT_BG);
  tft.setTextDatum(ML_DATUM);
  tft.drawString(brand, 34, 18);

  // Status pill (rounded badge, matching dashboard stat chip)
  int statusW = strlen(status) * 7 + 20;
  int statusX = tft.width() - statusW - 10;
  tft.fillRoundRect(statusX, 9, statusW, 18, 9, statusColor);
  tft.setTextFont(2);
  tft.setTextColor(COL_BG, statusColor);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(status, statusX + statusW / 2, 18);

  tft.setTextDatum(TL_DATUM);
}

// Decorative water-drop icon centered at (cx, cy) with outer radius r.
void uiWaterDrop(int cx, int cy, int r, uint16_t color) {
  // Teardrop body
  tft.fillTriangle(cx - r, cy + r/3, cx + r, cy + r/3, cx, cy - r, color);
  tft.fillCircle(cx, cy + r/3, r * 3/4, color);
  // Inner shine (2 overlapping circles)
  tft.fillCircle(cx - r/4, cy, r/5 + 1, 0xC7DF);
  tft.fillCircle(cx - r/4 + 1, cy, r/6, COL_TEXT);
}

// Horizontal progress bar with rounded ends.
void uiProgressBar(int x, int y, int w, int h, float pct,
                   uint16_t fillColor, uint16_t trackColor) {
  tft.fillRoundRect(x, y, w, h, h/2, trackColor);
  int fillW = (int)(pct * (w - 2));
  if (fillW > 0) {
    tft.fillRoundRect(x + 1, y + 1, fillW, h - 2, (h-2)/2, fillColor);
  }
}

// Volume selection card row — dashboard-style: dark card, left cyan bar, icon, label+price.
void uiVolumeRow(int y, const char* volume, const char* price, const char* icon, uint16_t accent) {
  const int x = 14;
  const int w = tft.width() - 28;
  const int h = 52;
  const int r = 10;

  // Card base
  tft.fillRoundRect(x, y, w, h, r, COL_CARD);
  // Subtle border
  tft.drawRoundRect(x, y, w, h, r, COL_BORDER);
  // Left accent bar (like active nav item in dashboard sidebar)
  tft.fillRoundRect(x, y, 4, h, 2, accent);

  // Volume icon circle badge
  int badgeX = x + 26, badgeY = y + h/2;
  tft.fillCircle(badgeX, badgeY, 14, COL_ACCENT_BG);
  tft.drawCircle(badgeX, badgeY, 14, accent);
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(accent, COL_ACCENT_BG);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(icon, badgeX, badgeY);

  // Volume label — white, prominent
  tft.setTextFont(4);
  tft.setTextColor(COL_TEXT, COL_CARD);
  tft.setTextDatum(ML_DATUM);
  tft.drawString(volume, x + 50, y + h/2 - 8);

  // Price badge — cyan background, dark text
  int priceW = strlen(price) * 8 + 16;
  int priceX = x + w - priceW - 12;
  tft.fillRoundRect(priceX, y + h/2 - 10, priceW, 20, 4, accent);
  tft.setTextFont(2);
  tft.setTextColor(COL_BG, accent);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(price, priceX + priceW/2, y + h/2);

  tft.setTextDatum(TL_DATUM);
}

// --- Screens ---------------------------------------------------------------

void displayStartup() {
  tft.fillScreen(COL_BG);

  // Full-width cyan top accent strip
  tft.fillRect(0, 0, tft.width(), 4, COL_PRIMARY);

  // Large water drop centered
  uiWaterDrop(tft.width()/2, 88, 36, COL_PRIMARY);

  // App name — large, white
  tft.setTextFont(4);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextDatum(TC_DATUM);
  tft.drawString("SmartH2wo", tft.width()/2, 140);

  // Tagline — muted
  tft.setTextFont(2);
  tft.setTextColor(COL_MUTED, COL_BG);
  tft.drawString("Smart Water Dispenser", tft.width()/2, 166);

  // Loading indicator — cyan dots
  tft.setTextColor(COL_DIM, COL_BG);
  tft.drawString("Connecting...", tft.width()/2, 200);

  // Three loading dots
  int cy = 220, cx = tft.width()/2;
  tft.fillRoundRect(cx - 20, cy - 3, 10, 6, 3, COL_PRIMARY);
  tft.fillRoundRect(cx - 5,  cy - 3, 10, 6, 3, COL_BORDER);
  tft.fillRoundRect(cx + 10, cy - 3, 10, 6, 3, COL_BORDER);

  tft.setTextDatum(TL_DATUM);
}

void displayReady() {
  appState      = STATE_READY;
  screenShownAt = millis();

  tft.fillScreen(COL_BG);
  uiHeader("SmartH2wo", TEST_MODE ? "TEST" : "LIVE", TEST_MODE ? COL_WARNING : COL_SUCCESS);

  tft.setTextFont(2);
  tft.setTextColor(COL_DIM, COL_BG);
  tft.setTextDatum(TL_DATUM);
  tft.drawString("How would you like to pay?", 17, 46);

  const int cx = 14, cw = tft.width() - 28, ch = 60, cr = 10;
  
  // Card 1: QR Pay
  tft.fillRoundRect(cx, 62, cw, ch, cr, COL_CARD);
  tft.drawRoundRect(cx, 62, cw, ch, cr, COL_BORDER);
  tft.fillRoundRect(cx, 62, 4, ch, 2, COL_BLUE);
  tft.fillRoundRect(cx + 14, 72, 40, 40, 6, COL_BLUE);
  tft.setTextFont(4); tft.setTextColor(COL_TEXT, COL_BLUE);
  tft.setTextDatum(MC_DATUM); tft.drawString("QR", cx + 34, 92);
  tft.setTextFont(4); tft.setTextColor(COL_TEXT, COL_CARD);
  tft.setTextDatum(ML_DATUM); tft.drawString("QR PH Payment", cx + 64, 78);
  tft.setTextFont(2); tft.setTextColor(COL_DIM, COL_CARD);
  tft.drawString("GCash, Maya, Bank Apps", cx + 64, 100);
  tft.fillRoundRect(cx + cw - 58, 78, 44, 18, 9, COL_BLUE);
  tft.setTextFont(2); tft.setTextColor(COL_BG, COL_BLUE);
  tft.setTextDatum(MC_DATUM); tft.drawString("QR BTN", cx + cw - 36, 87);

  // Card 2: Coin Pay
  tft.fillRoundRect(cx, 130, cw, ch, cr, COL_CARD);
  tft.drawRoundRect(cx, 130, cw, ch, cr, COL_BORDER);
  tft.fillRoundRect(cx, 130, 4, ch, 2, COL_SUCCESS);
  tft.fillRoundRect(cx + 14, 140, 40, 40, 6, COL_SUCCESS);
  tft.setTextFont(4); tft.setTextColor(COL_BG, COL_SUCCESS);
  tft.setTextDatum(MC_DATUM); tft.drawString("P", cx + 34, 160);
  tft.setTextFont(4); tft.setTextColor(COL_TEXT, COL_CARD);
  tft.setTextDatum(ML_DATUM); tft.drawString("Coin Payment", cx + 64, 146);
  tft.setTextFont(2); tft.setTextColor(COL_DIM, COL_CARD);
  tft.drawString("Insert exact coins", cx + 64, 168);
  tft.fillRoundRect(cx + cw - 64, 146, 50, 18, 9, COL_SUCCESS);
  tft.setTextFont(2); tft.setTextColor(COL_BG, COL_SUCCESS);
  tft.setTextDatum(MC_DATUM); tft.drawString("COIN BTN", cx + cw - 39, 155);

  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  uiCenterText("100ml - P1  |  250ml - P5  |  500ml - P10", tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);
  tft.setTextDatum(TL_DATUM);
}

void displayChooseVolume() {
  tft.fillScreen(COL_BG);
  uiHeader("SmartH2wo", "QR PAY", COL_PRIMARY);
  tft.setTextFont(2);
  tft.setTextColor(COL_DIM, COL_BG);
  tft.setTextDatum(TL_DATUM);
  tft.drawString("SELECT VOLUME", 17, 46);

  uiVolumeRow(62,  "100 ml",  "P1",  "1", COL_PRIMARY);
  uiVolumeRow(120, "250 ml",  "P5",  "2.5", COL_PRIMARY);
  uiVolumeRow(178, "500 ml",  "P10", "5", COL_PRIMARY);

  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  uiCenterText("QR BTN = Back  |  COIN BTN = Switch to Coins", tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);
  tft.setTextDatum(TL_DATUM);
}

void displayCoinMode() {
  tft.fillScreen(COL_BG);
  uiHeader("COIN PAYMENT", "COIN", COL_SUCCESS);

  int cx = 14, cw = tft.width() - 28, ch = 48, cr = 8;
  
  // Big credit readout
  char amount[24];
  snprintf(amount, sizeof(amount), "Credit: P%d", coinCredit);
  uiCenterText(amount, 54, 4, 1, COL_TEXT, COL_BG);

  // Draw 3 tiers
  int yTiers[3] = {84, 136, 188};
  int vols[3] = {100, 250, 500};
  int prices[3] = {1, 5, 10};

  for(int i=0; i<3; i++) {
    bool unlocked = (coinCredit >= prices[i]);
    uint16_t cardColor = unlocked ? COL_CARD : COL_BG_ALT;
    uint16_t accent = unlocked ? COL_SUCCESS : COL_BORDER;
    
    tft.fillRoundRect(cx, yTiers[i], cw, ch, cr, cardColor);
    tft.drawRoundRect(cx, yTiers[i], cw, ch, cr, COL_BORDER);
    tft.fillRoundRect(cx, yTiers[i], 4, ch, 2, accent);
    
    // Icon badge
    tft.fillCircle(cx + 26, yTiers[i] + ch/2, 14, COL_ACCENT_BG);
    tft.drawCircle(cx + 26, yTiers[i] + ch/2, 14, accent);
    tft.setTextFont(2); tft.setTextSize(1);
    tft.setTextColor(accent, COL_ACCENT_BG);
    tft.setTextDatum(MC_DATUM); 
    tft.drawString(unlocked ? "!" : "?", cx + 26, yTiers[i] + ch/2);

    // Label
    tft.setTextFont(4);
    tft.setTextColor(unlocked ? COL_TEXT : COL_DIM, cardColor);
    tft.setTextDatum(ML_DATUM);
    char vStr[16]; snprintf(vStr, sizeof(vStr), "%d ml", vols[i]);
    tft.drawString(vStr, cx + 50, yTiers[i] + ch/2 - 8);

    // Right side hint
    tft.setTextFont(2);
    tft.setTextDatum(MR_DATUM);
    if(unlocked) {
      tft.setTextColor(COL_SUCCESS, cardColor);
      char pStr[16]; snprintf(pStr, sizeof(pStr), "P%d (READY)", prices[i]);
      tft.drawString(pStr, cx + cw - 10, yTiers[i] + ch/2);
    } else {
      tft.setTextColor(COL_DIM, cardColor);
      char pStr[16]; snprintf(pStr, sizeof(pStr), "P%d more", prices[i] - coinCredit);
      tft.drawString(pStr, cx + cw - 10, yTiers[i] + ch/2);
    }
  }

  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  uiCenterText("Insert coins or press QR to cancel", tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);
  tft.setTextDatum(TL_DATUM);
}

void displayNotEnough(int shortAmount) {
  tft.fillRoundRect(40, 80, 240, 80, 10, COL_ERROR);
  tft.drawRoundRect(40, 80, 240, 80, 10, COL_TEXT);
  tft.setTextFont(4); tft.setTextColor(COL_TEXT, COL_ERROR);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("NOT ENOUGH", tft.width()/2, 106);
  
  char buf[32]; snprintf(buf, sizeof(buf), "Insert P%d more", shortAmount);
  tft.setTextFont(2);
  tft.drawString(buf, tft.width()/2, 136);
  tft.setTextDatum(TL_DATUM);
}

void displayProcessing() {
  tft.fillScreen(COL_BG);
  uiHeader("SmartH2wo", "WAIT", COL_WARNING);

  // Pulsing water drop
  uiWaterDrop(tft.width()/2, 100, 30, COL_WARNING);

  uiCenterText("Processing...", 150, 4, 1, COL_TEXT, COL_BG);
  uiCenterText("Generating checkout...", 182, 2, 1, COL_MUTED, COL_BG);
}

void displayQRMessage() {
  tft.fillScreen(COL_BG);

  // Header with price
  char headerText[40];
  snprintf(headerText, sizeof(headerText), "SCAN TO PAY  P%d", currentPricePesos);
  uiHeader(headerText, TEST_MODE ? "TEST" : "PAY", COL_PRIMARY);

  uiCenterText("Scan QR code below with any e-wallet app", 50, 2, 1, COL_TEXT, COL_BG);
  uiCenterText("Payment link:", 70, 2, 1, COL_MUTED, COL_BG);
  uiCenterText(currentCheckoutUrl.c_str(), 90, 2, 1, COL_PRIMARY, COL_BG);

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
  tft.drawString(TEST_MODE ? "Auto-pay in ~5s" : "Any button to cancel",
                 tft.width() - 10, footerY + 13);
  tft.setTextDatum(TL_DATUM);
}

void displayDispensing() {
  tft.fillScreen(COL_BG);
  uiHeader("SmartH2wo", "ACTIVE", COL_SUCCESS);

  // Success ring with water drop inside
  int cx = tft.width()/2, cy = 96;
  tft.fillCircle(cx, cy, 36, COL_SUCCESS);
  tft.fillCircle(cx, cy, 30, COL_BG);
  // Inner water drop
  uiWaterDrop(cx, cy, 18, COL_SUCCESS);

  // DISPENSING label
  uiCenterText("DISPENSING", 146, 4, 1, COL_SUCCESS, COL_BG);

  // Volume readout
  char vol[24];
  snprintf(vol, sizeof(vol), "%d ml", currentVolumeMl);
  uiCenterText(vol, 172, 4, 1, COL_TEXT, COL_BG);

  // Animated progress bar (full � could track flow sensor in future)
  uiProgressBar((tft.width() - 240)/2, 204, 240, 10, 1.0f, COL_SUCCESS, COL_BORDER);

  // Footer
  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  uiCenterText("Please wait...", tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);
}

void displayError(String message) {
  tft.fillScreen(COL_BG);

  // Error header bar with icon
  tft.fillRect(0, 0, tft.width(), 36, 0x6000);  // dark red header
  tft.fillRect(0, 0, 3, 36, COL_ERROR);          // left red stripe
  tft.drawFastHLine(0, 36, tft.width(), COL_ERROR);
  tft.setTextFont(4); tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, 0x6000);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("Error", tft.width()/2, 18);

  // Error X icon in a ring
  int cx = tft.width()/2, cy = 102;
  tft.fillCircle(cx, cy, 30, COL_ERROR);
  tft.fillCircle(cx, cy, 24, COL_BG);
  tft.drawCircle(cx, cy, 30, COL_ERROR);
  // X lines (3px thick each direction)
  for (int t = -1; t <= 1; t++) {
    tft.drawLine(cx - 12, cy - 12 + t, cx + 12, cy + 12 + t, COL_ERROR);
    tft.drawLine(cx - 12, cy + 12 + t, cx + 12, cy - 12 + t, COL_ERROR);
  }

  uiCenterText(message.c_str(), 150, 2, 1, COL_MUTED, COL_BG);

  // Retry chip
  int chipW = 160, chipH = 22;
  int chipX = (tft.width() - chipW) / 2;
  tft.fillRoundRect(chipX, 190, chipW, chipH, 11, COL_BORDER);
  tft.setTextFont(2); tft.setTextColor(COL_DIM, COL_BORDER);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("Press any button to retry", chipX + chipW/2, 201);
  tft.setTextDatum(TL_DATUM);
}

// ===== WiFi Functions =====
void connectWiFi() {
  Serial.print("Connecting to PRIMARY WiFi: ");
  Serial.println(WIFI_SSID_PRIMARY);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID_PRIMARY, WIFI_PASS_PRIMARY);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nPRIMARY WiFi connected!");
    BACKEND_URL = BACKEND_URL_PRIMARY;
  } else {
    Serial.println("\nPRIMARY WiFi failed! Switching to FALLBACK WiFi (Mobile Hotspot)...");
    WiFi.disconnect();
    delay(1000);
    
    Serial.print("Connecting to FALLBACK WiFi: ");
    Serial.println(WIFI_SSID_FALLBACK);
    WiFi.begin(WIFI_SSID_FALLBACK, WIFI_PASS_FALLBACK);
    
    attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nFALLBACK WiFi connected!");
      BACKEND_URL = BACKEND_URL_PRIMARY; // Use live production server
    } else {
      Serial.println("\nALL WiFi connections failed!");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Using Backend URL: ");
    Serial.println(BACKEND_URL);
  }
}

// ===== MQTT Functions =====
void connectMQTT() {
  Serial.print("Connecting to MQTT: ");
  Serial.println(MQTT_SERVER);
  
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    // Use a unique client ID each boot to avoid ghost session collisions
    // Make it static so the memory stays valid as long as the program runs,
    // since some MQTT libraries might store the pointer.
    static String clientId = String(MQTT_CLIENT_ID) + "-" + String(millis());
    // LWT (Last Will and Testament): If the ESP32 loses power or WiFi drops,
    // the broker will publish this payload to tell the backend it died.
    const char* lwtPayload = "{\"power_on\":false,\"water_level_pct\":0,\"flow_rate\":0}";
    if (mqttClient.connect(clientId.c_str(), MQTT_SENSORS_TOPIC, 1, false, lwtPayload)) {
      Serial.println("MQTT connected! Client: " + clientId);
      // Subscribe at QoS 1 to match the backend's publish QoS (prevents drops)
      mqttClient.subscribe(MQTT_DISPENSE_TOPIC, 1);
      mqttClient.subscribe(MQTT_CONTROL_TOPIC, 1);
      Serial.println("Subscribed to MQTT topics (QoS 1)");
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
    // Received dispense signal from backend (triggered by PayMongo webhook)
    DynamicJsonDocument doc(256);
    deserializeJson(doc, payload, length);
    
    String transactionId = doc["transaction_id"] | "";
    int volumeMl = doc["volume_ml"] | 0;
    
    // If backend didn't send volume_ml, fall back to what the user selected
    if (volumeMl <= 0) volumeMl = currentVolumeMl;
    
    Serial.println("Dispense signal received!");
    Serial.printf("Transaction: %s  Volume: %d ml\n", transactionId.c_str(), volumeMl);
    
    // Store transaction ID for status publishing
    if (transactionId.length() > 0) currentTransactionId = transactionId;
    
    // Show dispensing screen immediately before starting the pump
    appState = STATE_DISPENSING;
    displayDispensing();
    delay(300); // brief moment so the screen is visible before pump noise starts
    
    // Trigger pump
    dispensePump(volumeMl);
  } else if (topicStr == MQTT_CONTROL_TOPIC) {
    DynamicJsonDocument doc(256);
    deserializeJson(doc, payload, length);
    if (doc.containsKey("power_on")) {
      systemPowerEnabled = doc["power_on"];
      Serial.printf("Power state updated via MQTT: %s\n", systemPowerEnabled ? "ON" : "OFF");
      if (!systemPowerEnabled && appState != STATE_READY && appState != STATE_DISPENSING) {
        resetTransactionState();
      }
    }
  }
}

// ===== Sensor Functions =====
float readWaterLevel() {
  digitalWrite(US_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(US_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(US_TRIG_PIN, LOW);
  
  long duration = pulseIn(US_ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return currentWaterLevelPct; // timeout/error, keep previous
  
  // Speed of sound is ~343 m/s = 0.0343 cm/us
  float distanceCm = (duration * 0.0343) / 2.0;
  
  if (distanceCm < US_MIN_DISTANCE_CM) distanceCm = US_MIN_DISTANCE_CM;
  if (distanceCm > TANK_HEIGHT_CM) distanceCm = TANK_HEIGHT_CM;
  
  // Calculate percentage (distance is from top to water surface)
  float waterHeight = TANK_HEIGHT_CM - distanceCm;
  float pct = (waterHeight / (TANK_HEIGHT_CM - US_MIN_DISTANCE_CM)) * 100.0;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

void publishSensorData() {
  DynamicJsonDocument doc(256);
  doc["water_level_pct"] = currentWaterLevelPct;
  doc["flow_rate"] = currentFlowRate;
  doc["power_on"] = systemPowerEnabled;
  
  String jsonStr;
  serializeJson(doc, jsonStr);
  mqttClient.publish(MQTT_SENSORS_TOPIC, jsonStr.c_str());
  Serial.printf("Published sensors: Level=%.1f%%, Flow=%.2f L/min, Power=%s\n", 
                currentWaterLevelPct, currentFlowRate, systemPowerEnabled ? "ON" : "OFF");
}

void publishStatus(String status, String message) {
  DynamicJsonDocument doc(256);
  doc["transaction_id"] = currentTransactionId;
  doc["status"] = status;
  doc["message"] = message;
  doc["volume_ml"] = currentVolumeMl;
  doc["amount_pesos"] = currentPricePesos;
  
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  mqttClient.publish(MQTT_STATUS_TOPIC, jsonStr.c_str());
}

// ===== State & Button Helpers =====
void resetTransactionState() {
  appState              = STATE_READY;
  currentCheckoutUrl    = "";
  currentTransactionId  = "";
  currentVolumeMl       = 0;
  currentPricePesos     = 0;
  coinCredit            = 0;
  qrDisplayTimeout      = 0;
  qrShownAt             = 0;
  testDispenseAt        = 0;
  chooseTimeoutAt       = 0;
  coinTimeoutAt         = 0;
  warnTimeoutAt         = 0;
  screenShownAt         = 0;
  disableCoinAcceptor();
}

void cancelCheckout(const char* reason) {
  resetTransactionState();
  displayReady();
}

bool buttonPressed(int pin) {
  if (digitalRead(pin) != LOW) return false;
  delay(20);
  return digitalRead(pin) == LOW;
}

void waitForRelease() {
  while (digitalRead(BTN_100ML)   == LOW ||
         digitalRead(BTN_250ML)   == LOW ||
         digitalRead(BTN_500ML)   == LOW ||
         digitalRead(BTN_QR_PAY)  == LOW ||
         digitalRead(BTN_COIN_PAY) == LOW) {
    delay(10);
  }
  delay(30);  // extra tail debounce
}

bool pastLockout() {
  return screenShownAt > 0 && (millis() - screenShownAt) > CANCEL_LOCKOUT_MS;
}

void handleReadyButtons() {
  if (buttonPressed(BTN_QR_PAY))   { startQRPath();   waitForRelease(); return; }
  if (buttonPressed(BTN_COIN_PAY)) { startCoinMode(); waitForRelease(); return; }
}

void handleChooseVolumeButtons() {
  if (!pastLockout()) return;
  if (buttonPressed(BTN_100ML))  { startQRCheckout(100, 1);  waitForRelease(); return; }
  if (buttonPressed(BTN_250ML))  { startQRCheckout(250, 5);  waitForRelease(); return; }
  if (buttonPressed(BTN_500ML))  { startQRCheckout(500, 10); waitForRelease(); return; }
  if (buttonPressed(BTN_QR_PAY))   { resetTransactionState(); displayReady(); waitForRelease(); return; }
  if (buttonPressed(BTN_COIN_PAY)) { startCoinMode(); waitForRelease(); return; }
}

void handleQrButtons() {
  if (!pastLockout()) return;
  if (buttonPressed(BTN_100ML)  || buttonPressed(BTN_250ML)  ||
      buttonPressed(BTN_500ML)  || buttonPressed(BTN_QR_PAY) ||
      buttonPressed(BTN_COIN_PAY)) {
    cancelCheckout("user pressed during QR");
    waitForRelease();
  }
}

void handleCoinButtons() {
  if (!pastLockout()) return;

  if (buttonPressed(BTN_100ML))  { tryCoinDispense(100, 1);  waitForRelease(); return; }
  if (buttonPressed(BTN_250ML))  { tryCoinDispense(250, 5);  waitForRelease(); return; }
  if (buttonPressed(BTN_500ML))  { tryCoinDispense(500, 10); waitForRelease(); return; }

  if (buttonPressed(BTN_QR_PAY) || buttonPressed(BTN_COIN_PAY)) {
    cancelCheckout("user cancelled coin mode");
    waitForRelease();
  }
}

void handleErrorButtons() {
  if (buttonPressed(BTN_100ML)  || buttonPressed(BTN_250ML)  ||
      buttonPressed(BTN_500ML)  || buttonPressed(BTN_QR_PAY) ||
      buttonPressed(BTN_COIN_PAY)) {
    resetTransactionState();
    displayReady();
    waitForRelease();
  }
}

void checkButtons() {
  switch (appState) {
    case STATE_READY:          handleReadyButtons();         break;
    case STATE_CHOOSE_VOLUME:  handleChooseVolumeButtons();  break;
    case STATE_QR_PAYMENT:     handleQrButtons();            break;
    case STATE_COIN_PAYMENT:
    case STATE_COIN_WARNING:   handleCoinButtons();          break;
    case STATE_ERROR:          handleErrorButtons();         break;
    case STATE_DISPENSING:     break;
  }
}

void startQRPath() {
  appState        = STATE_CHOOSE_VOLUME;
  chooseTimeoutAt = millis() + CHOOSE_TIMEOUT_MS;
  screenShownAt   = millis();
  displayChooseVolume();
}

void startQRCheckout(int volumeMl, int pricePesos) {
  currentVolumeMl = volumeMl;
  currentPricePesos = pricePesos;
  appState = STATE_QR_PAYMENT;
  qrDisplayTimeout = millis() + QR_DISPLAY_DURATION;
  currentCheckoutUrl = "";
  currentTransactionId = "";
  displayProcessing();

  if (WiFi.status() != WL_CONNECTED) {
    displayError("WiFi disconnected");
    appState = STATE_ERROR;
    screenShownAt = millis();
    return;
  }

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/payments/create-checkout";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);
  doc["volume_ml"]    = currentVolumeMl;
  doc["amount_pesos"] = currentPricePesos;
  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<128> filter;
    filter["transaction_id"] = true;
    filter["checkout_url"]   = true;
    DynamicJsonDocument responseDoc(1024);
    DeserializationError err = deserializeJson(responseDoc, response, DeserializationOption::Filter(filter));

    if (err) {
      displayError("Bad server reply");
      appState = STATE_ERROR;
      screenShownAt = millis();
    } else {
      currentTransactionId = responseDoc["transaction_id"].as<String>();
      currentCheckoutUrl   = responseDoc["checkout_url"].as<String>();
      displayQRMessage();
      screenShownAt = millis();
      qrShownAt     = millis();
      publishStatus("waiting_payment", "QR code displayed");
    }
  } else {
    displayError("Connection failed");
    appState = STATE_ERROR;
    screenShownAt = millis();
  }
  http.end();
}

void startCoinMode() {
  appState          = STATE_COIN_PAYMENT;
  coinCredit        = 0;
  currentVolumeMl   = 0;
  currentPricePesos = 0;
  coinTimeoutAt     = millis() + COIN_TIMEOUT_MS;
  screenShownAt     = millis();
  enableCoinAcceptor();
  displayCoinMode();
}

void tryCoinDispense(int volumeMl, int pricePesos) {
  if (coinCredit < pricePesos) {
    displayNotEnough(pricePesos - coinCredit);
    delay(1200);
    displayCoinMode();
    return;
  }
  disableCoinAcceptor();
  currentVolumeMl   = volumeMl;
  currentPricePesos = pricePesos;
  int excess = coinCredit - pricePesos;
  if (excess > 0) Serial.printf("Excess: P%d\n", excess);
  publishStatus("paid_coin", "Coin payment complete");
  dispensePump(volumeMl);
}

void addCoinCredit(int pesos) {
  if (appState != STATE_COIN_PAYMENT && appState != STATE_COIN_WARNING) return;
  coinCredit += pesos;
  if (appState == STATE_COIN_WARNING) {
    appState = STATE_COIN_PAYMENT;
    warnTimeoutAt = 0;
  }
  coinTimeoutAt = millis() + COIN_TIMEOUT_MS;
  screenShownAt = millis();
  displayCoinMode();
}

// ===== Pump Function =====
void dispensePump(int volumeMl) {
  appState = STATE_DISPENSING;
  displayDispensing();
  if (!TEST_MODE) publishStatus("dispensing", "Dispensing started");

  Serial.printf("Dispense start - Target %dml\\n", volumeMl);

  if (TEST_MODE) {
    unsigned long durationMs = max(500, volumeMl / 2);
    digitalWrite(LED_PIN, HIGH);
    delay(durationMs);
    digitalWrite(LED_PIN, LOW);
  } else {
    // PRODUCTION: Dispense water using either flow sensor or time-based mode
    
    // 1. Open Solenoid first (always)
    digitalWrite(RELAY_SOLENOID, LOW); // Active LOW
    delay(200); // 200ms to let solenoid fully open
    
    // 2. Start Pump
    digitalWrite(RELAY_PUMP, LOW); // Active LOW
    
    // ANTI-NOISE HACK: Wait 400ms for the motor's electrical startup spike to finish,
    // and for the water to actually reach the sensor, before we start counting pulses!
    delay(400); 
    
    unsigned long startDispenseTime = millis();

#if FLOW_SENSOR_ENABLED
    // ---- FLOW SENSOR MODE ----
    noInterrupts();
    flowPulseCount = 0; // Reset count AFTER the noise spike
    interrupts();
    
    float targetPulses = volumeMl * FLOW_PULSES_PER_ML;
    unsigned long lastFlowCheck = millis();
    unsigned long localPulseCount = 0;
    
    while (true) {
      noInterrupts();
      localPulseCount = flowPulseCount;
      interrupts();
      
      if (localPulseCount >= targetPulses) {
        Serial.println("Flow target reached!");
        break;
      }
      if (millis() - startDispenseTime > 60000) {
        Serial.println("Dispense safety timeout! Tank empty or sensor error.");
        break;
      }
      if (millis() - lastFlowCheck >= 1000) {
        Serial.printf("DEBUG Pulses: %lu / %.1f\n", localPulseCount, targetPulses);
        lastFlowCheck = millis();
      }
      delay(10);
    }
    float actualMl = localPulseCount / FLOW_PULSES_PER_ML;
    Serial.printf("Dispensed ~%.1fml (flow sensor)\n", actualMl);

#else
    // ---- TIME-BASED MODE (fallback while flow sensor is being debugged) ----
    unsigned long dispenseMs = (unsigned long)((volumeMl / PUMP_FLOW_RATE_ML_PER_SEC) * 1000);
    Serial.printf("TIME MODE: Dispensing %dml for %lums\n", volumeMl, dispenseMs);
    
    while (millis() - startDispenseTime < dispenseMs) {
      delay(10); // Just wait the calculated duration
    }
    Serial.printf("TIME MODE: Done. Ran for %lums\n", dispenseMs);
#endif

    // 3. Stop Pump first
    digitalWrite(RELAY_PUMP, HIGH); // Turn OFF
    currentFlowRate = 0.0;
    
    // 4. Close Solenoid after a short delay
    delay(200);
    digitalWrite(RELAY_SOLENOID, HIGH); // Turn OFF
  }

  Serial.println("Dispense complete");
  if (!TEST_MODE) publishStatus("complete", "Water dispensed");

  delay(1500);
  resetTransactionState();
  displayReady();
}
