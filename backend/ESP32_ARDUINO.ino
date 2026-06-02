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
const int BTN_100ML   = 12;
const int BTN_500ML   = 13;
const int BTN_1000ML  = 14;
const int BTN_QR_PAY  = 25;   // NEW: "Pay with QR PH" button (Phase 1: payment menu)
const int BTN_COIN_PAY = 32;  // NEW: "Pay with Coins" button (Phase 1: payment menu)
const int LED_PIN     = 26;   // LED for testing (swap to PUMP_PIN when adding pump)

// (Coin acceptor pulse pin will be wired to GPIO 34 in Phase 2 - not used yet)

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

const unsigned long QR_DISPLAY_DURATION   = 60000;  // 60s QR timeout
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
  
  // Initialize pins
  pinMode(BTN_100ML,   INPUT_PULLUP);
  pinMode(BTN_500ML,   INPUT_PULLUP);
  pinMode(BTN_1000ML,  INPUT_PULLUP);
  pinMode(BTN_QR_PAY,  INPUT_PULLUP);
  pinMode(BTN_COIN_PAY, INPUT_PULLUP);
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

  unsigned long now = millis();

  switch (appState) {
    case STATE_QR_PAYMENT:
      // TEST_MODE: simulate the customer scanning + paying after a short delay
      if (TEST_MODE && testDispenseAt > 0 && now > testDispenseAt) {
        testDispenseAt = 0;
        Serial.println("TEST_MODE: simulated payment confirmed -> dispense");
        dispensePump(currentVolumeMl);
        return;
      }
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
          // TODO Phase 2: log to backend ("coin_forfeit", coinCredit)
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
  // Always anchor on STATE_READY when this screen is drawn.
  appState      = STATE_READY;
  screenShownAt = millis();

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
  snprintf(hdr, sizeof(hdr), "%d ml  -  P%d", currentVolumeMl, currentPricePesos);
  uiHeader(hdr, TEST_MODE ? "TEST" : "PAY", COL_PRIMARY);

  // Subtitle
  tft.setTextFont(2);
  tft.setTextSize(1);
  tft.setTextColor(COL_MUTED, COL_BG);
  tft.setTextDatum(TL_DATUM);
  tft.drawString("How would you like to pay?", 18, 42);

  // Two payment options stacked vertically
  uiPaymentRow(68,  "QR", "QR PH Payment",  "Press the QR button",   COL_PRIMARY);
  uiPaymentRow(132, "C",  "Coin Payment",   "Press the COIN button", COL_SUCCESS);

  // Footer hint
  uiCenterText("Press another volume to change  -  Auto-cancel 15s",
               tft.height() - 14, 2, 1, COL_DIM, COL_BG);
}

// Redraw only the header when the user picks a different volume on the
// payment-select screen (avoids a full screen flash).
void refreshChoosePayment() {
  chooseTimeoutAt = millis() + CHOOSE_TIMEOUT_MS;  // reset the auto-cancel timer
  char hdr[32];
  snprintf(hdr, sizeof(hdr), "%d ml  -  P%d", currentVolumeMl, currentPricePesos);
  uiHeader(hdr, TEST_MODE ? "TEST" : "PAY", COL_PRIMARY);
}

// ----- Coin payment screen (progress) -----

void displayCoinPayment() {
  tft.fillScreen(COL_BG);

  char hdr[32];
  snprintf(hdr, sizeof(hdr), "INSERT COINS  -  P%d", currentPricePesos);
  uiHeader(hdr, TEST_MODE ? "TEST" : "COIN", COL_SUCCESS);

  // Big amount readout: "P5 / P10"
  char amount[24];
  snprintf(amount, sizeof(amount), "P%d / P%d", coinCredit, currentPricePesos);
  uiCenterText(amount, 56, 6, 1, COL_TEXT, COL_BG);

  // Progress bar
  int barW = 240, barH = 14;
  int barX = (tft.width() - barW) / 2;
  int barY = 120;
  int fillW = (coinCredit >= currentPricePesos) ? barW - 2
            : (barW - 2) * coinCredit / currentPricePesos;

  tft.drawRoundRect(barX, barY, barW, barH, 4, COL_DIM);
  if (fillW > 0) {
    tft.fillRoundRect(barX + 1, barY + 1, fillW, barH - 2, 3, COL_SUCCESS);
  }

  // Remaining amount
  int remaining = currentPricePesos - coinCredit;
  if (remaining < 0) remaining = 0;
  char remStr[32];
  snprintf(remStr, sizeof(remStr), "Remaining: P%d", remaining);
  uiCenterText(remStr, 148, 4, 1, COL_PRIMARY, COL_BG);

  // Phase-1 testing hint OR Phase-2 production hint
  uiCenterText("TEST: 100ml=P1  500ml=P5  1000ml=P10",
               186, 2, 1, COL_MUTED, COL_BG);

  // Footer hint
  uiCenterText("Press COIN to cancel  -  60s timeout",
               tft.height() - 14, 2, 1, COL_DIM, COL_BG);
}

// ----- Coin warning (partial credit, soft timeout extension) -----

void displayCoinWarning() {
  tft.fillScreen(COL_BG);

  uiHeader("STILL WAITING", "WARN", COL_WARNING);

  // Warning icon (triangle with exclamation)
  int cx = tft.width()/2, cy = 70;
  tft.fillTriangle(cx - 26, cy + 22, cx + 26, cy + 22, cx, cy - 22, COL_WARNING);
  tft.fillTriangle(cx - 20, cy + 18, cx + 20, cy + 18, cx, cy - 16, COL_BG);
  tft.fillRect(cx - 2, cy - 8, 4, 14, COL_WARNING);
  tft.fillCircle(cx, cy + 12, 2, COL_WARNING);

  // Status
  char st[40];
  int remaining = currentPricePesos - coinCredit;
  if (remaining < 0) remaining = 0;
  snprintf(st, sizeof(st), "P%d more needed", remaining);
  uiCenterText(st, 116, 4, 1, COL_TEXT, COL_BG);

  uiCenterText("Insert more coins or press COIN",
               155, 2, 1, COL_MUTED, COL_BG);
  uiCenterText("to cancel.  Credit forfeit in 30s.",
               170, 2, 1, COL_MUTED, COL_BG);

  // Current credit recap
  char cr[32];
  snprintf(cr, sizeof(cr), "Inserted so far: P%d", coinCredit);
  uiCenterText(cr, tft.height() - 14, 2, 1, COL_DIM, COL_BG);
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

// ===== State & Button Helpers =====

// Clear all per-transaction state. Called when returning to READY for any
// reason (cancel, timeout, dispense complete, error dismissed).
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
         digitalRead(BTN_500ML)   == LOW ||
         digitalRead(BTN_1000ML)  == LOW ||
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
  if (buttonPressed(BTN_100ML))  { startCheckout(100,  2);  waitForRelease(); return; }
  if (buttonPressed(BTN_500ML))  { startCheckout(500,  10); waitForRelease(); return; }
  if (buttonPressed(BTN_1000ML)) { startCheckout(1000, 20); waitForRelease(); return; }
}

void handleChoosePaymentButtons() {
  if (!pastLockout()) return;

  // Pressing a different volume just updates the selection (no need to back out).
  if (buttonPressed(BTN_100ML))  { currentVolumeMl = 100;  currentPricePesos = 2;
                                   refreshChoosePayment(); waitForRelease(); return; }
  if (buttonPressed(BTN_500ML))  { currentVolumeMl = 500;  currentPricePesos = 10;
                                   refreshChoosePayment(); waitForRelease(); return; }
  if (buttonPressed(BTN_1000ML)) { currentVolumeMl = 1000; currentPricePesos = 20;
                                   refreshChoosePayment(); waitForRelease(); return; }

  // Commit to a payment method.
  if (buttonPressed(BTN_QR_PAY))   { chooseQR();   waitForRelease(); return; }
  if (buttonPressed(BTN_COIN_PAY)) { chooseCoin(); waitForRelease(); return; }
}

void handleQrButtons() {
  if (!pastLockout()) return;
  // ANY of the 5 buttons cancels the QR.
  if (buttonPressed(BTN_100ML)  || buttonPressed(BTN_500ML)  ||
      buttonPressed(BTN_1000ML) || buttonPressed(BTN_QR_PAY) ||
      buttonPressed(BTN_COIN_PAY)) {
    cancelCheckout("user pressed during QR");
    waitForRelease();
  }
}

void handleCoinButtons() {
  if (!pastLockout()) return;

  // PHASE 1 (UI testing): the volume buttons simulate coin denominations.
  // PHASE 2 (real hardware): these become "cancel" instead; coins arrive via
  // interrupt on GPIO 34 and call addCoinCredit() directly.
  if (buttonPressed(BTN_100ML))  { addCoinCredit(1);  waitForRelease(); return; }
  if (buttonPressed(BTN_500ML))  { addCoinCredit(5);  waitForRelease(); return; }
  if (buttonPressed(BTN_1000ML)) { addCoinCredit(10); waitForRelease(); return; }

  // QR Pay button = switch payment method to QR (carry the volume)
  if (buttonPressed(BTN_QR_PAY))   { chooseQR();   waitForRelease(); return; }
  // Coin Pay button (the one that got us here) = cancel back to READY
  if (buttonPressed(BTN_COIN_PAY)) { cancelCheckout("user cancelled coin"); waitForRelease(); return; }
}

void handleErrorButtons() {
  // Any button dismisses the error.
  if (buttonPressed(BTN_100ML)  || buttonPressed(BTN_500ML)  ||
      buttonPressed(BTN_1000ML) || buttonPressed(BTN_QR_PAY) ||
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

  // ----- TEST_MODE: don't call backend, just fake a QR + auto-dispense -----
  if (TEST_MODE) {
    currentTransactionId = "TEST-" + String(millis());
    Serial.println("TEST_MODE: skipping HTTP, showing fake QR");
    displayQRMessage();
    screenShownAt  = millis();
    qrShownAt      = millis();
    testDispenseAt = millis() + TEST_AUTO_PAY_DELAY;
    return;
  }

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

  delay(1500);
  resetTransactionState();
  displayReady();
}
