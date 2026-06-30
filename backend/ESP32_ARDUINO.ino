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
const int COIN_INHIBIT_PIN = 19;  // Allan 1239A grey (inhibit) wire

// Inhibit = HIGH means REJECT coins (active-high inhibit for most Allan units).
// If coins still pass through when they shouldn't, swap HIGH<->LOW below.
void enableCoinAcceptor()  { digitalWrite(COIN_INHIBIT_PIN, LOW);  }  // LOW = Relay ON (passes 12V to NO)
void disableCoinAcceptor() { digitalWrite(COIN_INHIBIT_PIN, HIGH); }  // HIGH = Relay OFF (cuts 12V to NO)

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
  STATE_READY,            // main menu: pick a volume
  STATE_CHOOSE_PAYMENT,   // volume picked, asking QR or Coin
  STATE_QR_PAYMENT,       // QR shown, waiting for webhook (or TEST timer)
  STATE_COIN_PAYMENT,     // showing "Insert coins" progress screen
  STATE_COIN_WARNING,     // partial credit, gentle warning before forfeit
  STATE_DISPENSING,       // dispensing in progress (LED on)
  STATE_ERROR             // error screen, returns to READY on any press
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

    // Inhibit pin: start with coins REJECTED (disabled at boot)
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
      // Ignore pulses within the first 1000ms of entering the screen to avoid turn-on noise
      if (millis() - screenShownAt > 1000) {
        for (int i = 0; i < pulsesToProcess; i++) {
          addCoinCredit(1);
        }
      } else {
        Serial.printf("Ignored %d startup noise pulse(s)\n", pulsesToProcess);
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

    case STATE_CHOOSE_PAYMENT:
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
        displayCoinWarning();
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
  // Always anchor on STATE_READY when this screen is drawn.
  appState      = STATE_READY;
  screenShownAt = millis();

  tft.fillScreen(COL_BG);

  uiHeader("SmartH2wo",
           TEST_MODE ? "TEST" : "LIVE",
           TEST_MODE ? COL_WARNING : COL_SUCCESS);

  // Section label — muted, small, like dashboard section headers
  tft.setTextFont(2);
  tft.setTextColor(COL_DIM, COL_BG);
  tft.setTextDatum(TL_DATUM);
  tft.drawString("SELECT VOLUME", 17, 46);

  // Three volume cards stacked
  uiVolumeRow(62,  "100 ml",  "P2",  "1", COL_PRIMARY);
  uiVolumeRow(120, "250 ml",  "P5",  "2.5", COL_PRIMARY);
  uiVolumeRow(178, "500 ml",  "P10", "5", COL_PRIMARY);

  // Footer hint bar
  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  uiCenterText("Press a button to begin",
               tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);
}

void displayProcessing() {
  tft.fillScreen(COL_BG);
  uiHeader("SmartH2wo", "WAIT", COL_WARNING);

  // Pulsing water drop
  uiWaterDrop(tft.width()/2, 100, 30, COL_WARNING);

  uiCenterText("Processing...", 150, 4, 1, COL_TEXT, COL_BG);
  uiCenterText("Generating checkout...", 182, 2, 1, COL_MUTED, COL_BG);

  // Animated dots (3 staggered pills)
  int cy = 212, cx = tft.width()/2;
  tft.fillRoundRect(cx - 22, cy - 3, 12, 6, 3, COL_PRIMARY);
  tft.fillRoundRect(cx - 5,  cy - 3, 12, 6, 3, COL_DIM);
  tft.fillRoundRect(cx + 12, cy - 3, 12, 6, 3, COL_BORDER);
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

// ----- Payment-method picker (after a volume is selected) -----

// Single payment-method row (icon + label + which button to press).
void uiPaymentRow(int y, const char* icon, const char* label,
                  const char* hint, uint16_t accent) {
  const int x = 16;
  const int w = tft.width() - 32;
  const int h = 56;

  tft.fillRoundRect(x, y, w, h, 8, COL_CARD);
  tft.drawRoundRect(x, y, w, h, 8, COL_BG_ALT);

  // Accent stripe
  tft.fillRect(x + 1, y + 1, 4, h - 2, accent);

  // Icon badge (text-based for simplicity)
  tft.fillRoundRect(x + 14, y + 12, 32, 32, 4, accent);
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_BG, accent);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(icon, x + 30, y + 28);

  // Label
  tft.setTextFont(4);
  tft.setTextColor(COL_TEXT, COL_CARD);
  tft.setTextDatum(ML_DATUM);
  tft.drawString(label, x + 56, y + 20);

  // Hint (which button to press)
  tft.setTextFont(2);
  tft.setTextColor(COL_MUTED, COL_CARD);
  tft.drawString(hint, x + 56, y + 42);

  tft.setTextDatum(TL_DATUM);
}

void displayChoosePayment() {
  tft.fillScreen(COL_BG);

  char hdr[32];
  snprintf(hdr, sizeof(hdr), "%d ml - P%d", currentVolumeMl, currentPricePesos);
  uiHeader(hdr, "PAY", COL_PRIMARY);

  // Section label
  tft.setTextFont(2);
  tft.setTextColor(COL_DIM, COL_BG);
  tft.setTextDatum(TL_DATUM);
  tft.drawString("CHOOSE PAYMENT METHOD", 17, 46);

  // QR Payment card
  const int cx = 14, cw = tft.width() - 28, ch = 64, cr = 10;

  // Card 1: QR Pay
  tft.fillRoundRect(cx, 62, cw, ch, cr, COL_CARD);
  tft.drawRoundRect(cx, 62, cw, ch, cr, COL_BORDER);
  tft.fillRoundRect(cx, 62, 4, ch, 2, COL_BLUE);
  // Icon badge
  tft.fillRoundRect(cx + 14, 74, 40, 40, 6, COL_BLUE);
  tft.setTextFont(4); tft.setTextColor(COL_TEXT, COL_BLUE);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("QR", cx + 34, 94);
  // Label
  tft.setTextFont(4); tft.setTextColor(COL_TEXT, COL_CARD);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("QR PH Pay", cx + 64, 80);
  tft.setTextFont(2); tft.setTextColor(COL_DIM, COL_CARD);
  tft.drawString("GCash, Maya, Bank Apps", cx + 64, 102);
  // Button hint chip
  tft.fillRoundRect(cx + cw - 58, 80, 44, 18, 9, COL_BLUE);
  tft.setTextFont(2); tft.setTextColor(COL_BG, COL_BLUE);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("QR BTN", cx + cw - 36, 89);

  // Card 2: Coin Pay
  tft.fillRoundRect(cx, 134, cw, ch, cr, COL_CARD);
  tft.drawRoundRect(cx, 134, cw, ch, cr, COL_BORDER);
  tft.fillRoundRect(cx, 134, 4, ch, 2, COL_SUCCESS);
  // Icon badge
  tft.fillRoundRect(cx + 14, 146, 40, 40, 6, COL_SUCCESS);
  tft.setTextFont(4); tft.setTextColor(COL_BG, COL_SUCCESS);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("P", cx + 34, 166);
  // Label
  tft.setTextFont(4); tft.setTextColor(COL_TEXT, COL_CARD);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("Coin Insert", cx + 64, 152);
  tft.setTextFont(2); tft.setTextColor(COL_DIM, COL_CARD);
  tft.drawString("Drop coins to pay", cx + 64, 174);
  // Button hint chip
  tft.fillRoundRect(cx + cw - 64, 152, 50, 18, 9, COL_SUCCESS);
  tft.setTextFont(2); tft.setTextColor(COL_BG, COL_SUCCESS);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("COIN BTN", cx + cw - 39, 161);

  // Footer
  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  uiCenterText("Auto-cancel in 15s", tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);

  tft.setTextDatum(TL_DATUM);
}

// Redraw only the header when the user picks a different volume on the
// payment-select screen (avoids a full screen flash).
void refreshChoosePayment() {
  chooseTimeoutAt = millis() + CHOOSE_TIMEOUT_MS;  // reset the auto-cancel timer
  char hdr[32];
  snprintf(hdr, sizeof(hdr), "%d ml - P%d", currentVolumeMl, currentPricePesos);
  uiHeader(hdr, "PAY", COL_PRIMARY);
}

// ----- Coin payment screen (progress) -----

void displayCoinPayment() {
  tft.fillScreen(COL_BG);

  char hdr[32];
  snprintf(hdr, sizeof(hdr), "INSERT COINS - P%d", currentPricePesos);
  uiHeader(hdr, "COIN", COL_SUCCESS);

  // Coin icon circle
  int cx = tft.width()/2;
  tft.fillCircle(cx, 80, 24, COL_SUCCESS);
  tft.fillCircle(cx, 80, 19, COL_BG);
  tft.setTextFont(4); tft.setTextColor(COL_SUCCESS, COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("P", cx, 80);

  // Big credit / price readout
  char amount[24];
  snprintf(amount, sizeof(amount), "P%d of P%d", coinCredit, currentPricePesos);
  uiCenterText(amount, 112, 4, 1, COL_TEXT, COL_BG);

  // Progress bar
  float pct = (currentPricePesos > 0)
    ? min(1.0f, (float)coinCredit / (float)currentPricePesos)
    : 0.0f;
  uiProgressBar((tft.width() - 240)/2, 146, 240, 14, pct, COL_SUCCESS, COL_BORDER);

  // Remaining label
  int remaining = max(0, currentPricePesos - coinCredit);
  char remStr[32];
  snprintf(remStr, sizeof(remStr), "P%d remaining", remaining);
  uiCenterText(remStr, 170, 2, 1, COL_MUTED, COL_BG);

  // Footer
  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  uiCenterText("COIN BTN = Cancel  |  60s timeout",
               tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);
}

// ----- Coin warning (partial credit, soft timeout extension) -----

void displayCoinWarning() {
  tft.fillScreen(COL_BG);
  uiHeader("STILL WAITING", "WARN", COL_WARNING);

  // Warning triangle
  int cx = tft.width()/2, cy = 86;
  tft.fillTriangle(cx - 28, cy + 24, cx + 28, cy + 24, cx, cy - 24, COL_WARNING);
  tft.fillTriangle(cx - 22, cy + 18, cx + 22, cy + 18, cx, cy - 16, COL_BG);
  tft.fillRoundRect(cx - 2, cy - 8, 5, 14, 2, COL_WARNING);
  tft.fillCircle(cx, cy + 12, 3, COL_WARNING);

  // Status
  int remaining = max(0, currentPricePesos - coinCredit);
  char st[40];
  snprintf(st, sizeof(st), "P%d more needed", remaining);
  uiCenterText(st, 124, 4, 1, COL_TEXT, COL_BG);
  uiCenterText("Insert coins or press COIN to cancel.", 156, 2, 1, COL_MUTED, COL_BG);

  // Progress bar (partial)
  float pct = (currentPricePesos > 0)
    ? min(1.0f, (float)coinCredit / (float)currentPricePesos)
    : 0.0f;
  uiProgressBar((tft.width() - 200)/2, 178, 200, 10, pct, COL_WARNING, COL_BORDER);

  // Footer
  tft.fillRect(0, tft.height() - 20, tft.width(), 20, COL_ACCENT_BG);
  char cr[32];
  snprintf(cr, sizeof(cr), "Inserted: P%d  -  Forfeiting in 30s", coinCredit);
  uiCenterText(cr, tft.height() - 14, 2, 1, COL_DIM, COL_ACCENT_BG);
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

  // Animated progress bar (full — could track flow sensor in future)
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

// Clear all per-transaction state. Called when returning to READY for any
// reason (cancel, timeout, dispense complete, error dismissed).
void resetTransactionState() {
  appState              = STATE_READY;
  disableCoinAcceptor(); // physically reject coins when not in coin mode
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
}

// Cancel whatever is happening and go back to READY.
void cancelCheckout(const char* reason) {
  Serial.print("Cancelled: ");
  Serial.println(reason ? reason : "user");
  if (coinCredit > 0) {
    Serial.printf("Coin credit forfeited on cancel: P%d\n", coinCredit);
    // TODO Phase 2: log forfeit to backend
  }
  resetTransactionState();
  displayReady();
}

// Read a button with debounce. Returns true if confirmed pressed.
bool buttonPressed(int pin) {
  if (digitalRead(pin) != LOW) return false;
  delay(20);
  return digitalRead(pin) == LOW;
}

// Block until the user releases all buttons (prevents one long press from
// being interpreted as multiple presses across screens).
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

// True if the screen has been visible long enough to accept the next input
// (prevents the press that OPENED this screen from immediately acting on it).
bool pastLockout() {
  return screenShownAt > 0 && (millis() - screenShownAt) > CANCEL_LOCKOUT_MS;
}

// ===== Button Dispatch =====
// Each screen has its own button handler. checkButtons() routes to the right
// one based on appState.

void handleReadyButtons() {
  // Pressing a volume button starts a checkout.
  // The payment-method buttons are ignored on this screen.
  if (buttonPressed(BTN_100ML))  { startCheckout(100, 2);  waitForRelease(); return; }
  if (buttonPressed(BTN_250ML))  { startCheckout(250, 5);  waitForRelease(); return; }
  if (buttonPressed(BTN_500ML))  { startCheckout(500, 10); waitForRelease(); return; }
}

void handleChoosePaymentButtons() {
  if (!pastLockout()) return;

  // Pressing a different volume just updates the selection (no need to back out).
  if (buttonPressed(BTN_100ML))  { currentVolumeMl = 100; currentPricePesos = 2;
                                   refreshChoosePayment(); waitForRelease(); return; }
  if (buttonPressed(BTN_250ML))  { currentVolumeMl = 250; currentPricePesos = 5;
                                   refreshChoosePayment(); waitForRelease(); return; }
  if (buttonPressed(BTN_500ML))  { currentVolumeMl = 500; currentPricePesos = 10;
                                   refreshChoosePayment(); waitForRelease(); return; }

  // Commit to a payment method.
  if (buttonPressed(BTN_QR_PAY))   { chooseQR();   waitForRelease(); return; }
  if (buttonPressed(BTN_COIN_PAY)) { chooseCoin(); waitForRelease(); return; }
}

void handleQrButtons() {
  if (!pastLockout()) return;
  // ANY of the 5 buttons cancels the QR.
  if (buttonPressed(BTN_100ML)  || buttonPressed(BTN_250ML)  ||
      buttonPressed(BTN_500ML)  || buttonPressed(BTN_QR_PAY) ||
      buttonPressed(BTN_COIN_PAY)) {
    cancelCheckout("user pressed during QR");
    waitForRelease();
  }
}

void handleCoinButtons() {
  if (!pastLockout()) return;

  if (TEST_MODE) {
    // In TEST_MODE, physical volume buttons simulate coins
    if (buttonPressed(BTN_100ML))  { addCoinCredit(1);  waitForRelease(); return; }
    if (buttonPressed(BTN_250ML))  { addCoinCredit(5);  waitForRelease(); return; }
    if (buttonPressed(BTN_500ML))  { addCoinCredit(10); waitForRelease(); return; }
  } else {
    // In production, volume buttons CANCEL out of the coin screen
    // because real coins arrive via the coinPulseISR on GPIO 36
    if (buttonPressed(BTN_100ML) || buttonPressed(BTN_250ML) || buttonPressed(BTN_500ML)) {
      cancelCheckout("user cancelled coin");
      waitForRelease();
      return;
    }
  }

  // QR Pay button = switch payment method to QR (carry the volume)
  if (buttonPressed(BTN_QR_PAY))   { chooseQR();   waitForRelease(); return; }
  // Coin Pay button (the one that got us here) = cancel back to READY
  if (buttonPressed(BTN_COIN_PAY)) { cancelCheckout("user cancelled coin"); waitForRelease(); return; }
}

void handleErrorButtons() {
  // Any button dismisses the error.
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
    case STATE_CHOOSE_PAYMENT: handleChoosePaymentButtons(); break;
    case STATE_QR_PAYMENT:     handleQrButtons();            break;
    case STATE_COIN_PAYMENT:
    case STATE_COIN_WARNING:   handleCoinButtons();          break;
    case STATE_ERROR:          handleErrorButtons();         break;
    case STATE_DISPENSING:     /* ignore buttons while dispensing */ break;
  }
}

// ===== Checkout Flow =====
// startCheckout(): user picked a volume on READY. Move to CHOOSE_PAYMENT.
// chooseQR()    : on CHOOSE_PAYMENT or COIN screen, kick off PayMongo flow.
// chooseCoin()  : on CHOOSE_PAYMENT, move to COIN_PAYMENT screen.
// addCoinCredit(): called per coin (button in Phase 1, interrupt in Phase 2).

void startCheckout(int volumeMl, int pricePesos) {
  if (appState != STATE_READY) return;

  currentVolumeMl   = volumeMl;
  currentPricePesos = pricePesos;
  coinCredit        = 0;
  appState          = STATE_CHOOSE_PAYMENT;
  chooseTimeoutAt   = millis() + CHOOSE_TIMEOUT_MS;
  screenShownAt     = millis();

  Serial.printf("Volume selected: %dml / P%d - awaiting payment method\n",
                volumeMl, pricePesos);
  displayChoosePayment();
}

void chooseQR() {
  Serial.println("Payment method: QR PH");

  // If we arrived from the coin screen with partial credit, log it as forfeit
  // (we don't carry credit across methods in Phase 1).
  if (coinCredit > 0) {
    Serial.printf("Switching to QR: forfeiting P%d in coin credit\n", coinCredit);
    coinCredit = 0;
  }

  appState         = STATE_QR_PAYMENT;
  qrDisplayTimeout = millis() + QR_DISPLAY_DURATION;
  currentCheckoutUrl   = "";
  currentTransactionId = "";

  displayProcessing();

  // In TEST_MODE, we now call the backend to test the real PayMongo integration.

  // ----- Live mode: call backend -----
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

  Serial.println("Sending request...");
  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("Response: " + response);

    // We only care about the small string fields; ignore the big base64 blob.
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
      appState = STATE_ERROR;
      screenShownAt = millis();
    } else {
      currentTransactionId = responseDoc["transaction_id"].as<String>();
      currentCheckoutUrl   = responseDoc["checkout_url"].as<String>();
      Serial.println("Transaction ID: " + currentTransactionId);
      Serial.println("Checkout URL:   " + currentCheckoutUrl);

      displayQRMessage();
      screenShownAt = millis();
      qrShownAt     = millis();
      publishStatus("waiting_payment", "QR code displayed");
    }
  } else {
    Serial.printf("HTTP error: %d\n", httpCode);
    displayError("Connection failed");
    appState = STATE_ERROR;
    screenShownAt = millis();
  }

  http.end();
}

void chooseCoin() {
  Serial.printf("Payment method: COIN (target P%d)\n", currentPricePesos);
  enableCoinAcceptor(); // now allow coins in
  
  // Wait for the coin slot relay/circuit to settle, then clear any false startup pulses
  delay(300);
  noInterrupts();
  coinPulseCount = 0;
  interrupts();

  appState      = STATE_COIN_PAYMENT;
  coinCredit    = 0;
  coinTimeoutAt = millis() + COIN_TIMEOUT_MS;
  screenShownAt = millis();
  displayCoinPayment();
}

// Called when a coin is "received" (Phase 1: simulated by volume button press;
// Phase 2: real pulse on GPIO 34 -> interrupt -> calls this).
void addCoinCredit(int pesos) {
  if (appState != STATE_COIN_PAYMENT && appState != STATE_COIN_WARNING) return;

  coinCredit += pesos;
  Serial.printf("Coin: +P%d (total P%d / P%d)\n",
                pesos, coinCredit, currentPricePesos);

  if (coinCredit >= currentPricePesos) {
    // Paid in full - dispense now.
    int change = coinCredit - currentPricePesos;
    if (change > 0) {
      Serial.printf("Note: P%d overpaid (no change given)\n", change);
    }
    publishStatus("paid_coin", "Coin payment complete");
    dispensePump(currentVolumeMl);
    return;
  }

  // Not enough yet - refresh the progress screen and reset the soft timeout.
  // (Bumping the timeout while they're actively inserting coins is friendly.)
  if (appState == STATE_COIN_PAYMENT) {
    coinTimeoutAt = millis() + COIN_TIMEOUT_MS;
    displayCoinPayment();
  } else {
    // They started paying again during the warning - go back to normal screen.
    appState      = STATE_COIN_PAYMENT;
    coinTimeoutAt = millis() + COIN_TIMEOUT_MS;
    warnTimeoutAt = 0;
    screenShownAt = millis();
    displayCoinPayment();
  }
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
