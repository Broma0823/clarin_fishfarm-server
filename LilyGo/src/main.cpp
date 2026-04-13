#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <cstring>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>

// Set to 0 (e.g. build flag -DSERIAL_DEBUG=0) to silence all monitor debug; HTTP still runs.
#ifndef SERIAL_DEBUG
#define SERIAL_DEBUG 1
#endif
#if SERIAL_DEBUG
#define DBG_PRINT(...) Serial.print(__VA_ARGS__)
#define DBG_PRINTLN(...) Serial.println(__VA_ARGS__)
#define DBG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
#define DBG_PRINT(...)
#define DBG_PRINTLN(...)
#define DBG_PRINTF(...)
#endif

// WiFi: primary + fallback hotspot (WiFiMulti tries in addAP order)
const char *WIFI_SSID = "R3JHOMEFIBRa4780";
const char *WIFI_PASSWORD = "R3JWIFIwwk9a";
const char *WIFI_SSID_2 = "iPhone";
const char *WIFI_PASSWORD_2 = "12345678";

WiFiMulti wifiMulti;

#define WIFI_CHECK_INTERVAL_MS 5000UL
#define WIFI_RECONNECT_BASE_MS 2000UL
#define WIFI_RECONNECT_MAX_MS 20000UL
#define WIFI_QUICK_RECONNECT_WAIT_MS 5000UL
#define WIFI_FULL_CONNECT_TRIES 60
#define WIFI_FULL_CONNECT_STEP_MS 500UL

static unsigned long lastWiFiMonitorMs = 0;
static unsigned long lastWiFiReconnectMs = 0;
static uint8_t wifiReconnectFailCount = 0;
static bool wifiLinkWasUp = false;
static unsigned long lastWifiStatusLogMs = 0;
#define WIFI_STATUS_LOG_INTERVAL_MS 30000UL

static unsigned long wifiReconnectBackoffMs()
{
  unsigned long ms = WIFI_RECONNECT_BASE_MS
                     << (wifiReconnectFailCount > 4 ? 4 : wifiReconnectFailCount);
  if (ms > WIFI_RECONNECT_MAX_MS)
    ms = WIFI_RECONNECT_MAX_MS;
  return ms;
}

#ifndef FISHFARM_API_URL
#define FISHFARM_API_URL "http://192.168.1.11:4000/api/monitoring"
#endif
const char *CYCLE_ID = "CYCLE-2026-01";
const char *CYCLE_START_DATE = "2026-04-07";

const unsigned long SAMPLE_INTERVAL_MS = 10000UL; // 10 seconds between POSTs
unsigned long lastSampleMs = 0;

/** Sensor / WiFi status lines on the monitor — independent of upload interval. */
#define DEBUG_PRINT_INTERVAL_MS 3000UL
static unsigned long lastDebugPrintMs = 0;

// DS18B20 data pin (must match wiring). GPIO2 is a strapping pin; if reads are flaky, try 4 or 15.
#define ONE_WIRE_BUS 2

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
DeviceAddress insideThermometer;
static bool gDs18b20Ready = false;

// --- pH sensor (analog via voltage divider) ---
static const int PH_ADC_PIN = 34;
static const float ADC_VREF = 3.3f;
static const float ADC_MAX = 4095.0f;
static const float R_DIV_TOP_OHMS = 2200.0f;
static const float R_DIV_BOTTOM_OHMS = 3000.0f;
static const float DIVIDER_SCALE =
    (R_DIV_TOP_OHMS + R_DIV_BOTTOM_OHMS) / R_DIV_BOTTOM_OHMS;
static float phCalibrationValue = 24.05f - 1.05f;

struct TxJob
{
  float tempC;
  float phLevel;
};

struct TxResult
{
  int httpStatus;
  bool success;
  char errDetail[96];
};

static QueueHandle_t txJobQueue = nullptr;
static QueueHandle_t txResultQueue = nullptr;

/** Read pH from analog pin: 10 samples, sort, average middle 6, apply divider + calibration. */
static float readPhLevel()
{
  int buf[10];
  for (int i = 0; i < 10; i++)
  {
    buf[i] = analogRead(PH_ADC_PIN);
    delay(30);
  }

  for (int i = 0; i < 9; i++)
    for (int j = i + 1; j < 10; j++)
      if (buf[i] > buf[j])
      {
        int tmp = buf[i];
        buf[i] = buf[j];
        buf[j] = tmp;
      }

  unsigned long avgval = 0;
  for (int i = 2; i < 8; i++)
    avgval += buf[i];

  const float voltAtPin = (float)avgval * (ADC_VREF / ADC_MAX) / 6.0f;
  const float voltModule = voltAtPin * DIVIDER_SCALE;
  const float ph = -5.70f * voltModule + phCalibrationValue;

  return ph;
}

/** HTTP only — no Serial; safe to call from the TX worker task. */
static void runMonitoringHttpPost(const TxJob &job, TxResult *out)
{
  std::memset(out, 0, sizeof(*out));
  out->httpStatus = -1;
  out->success = false;

  if (WiFi.status() != WL_CONNECTED)
  {
    std::strncpy(out->errDetail, "WiFi disconnected", sizeof(out->errDetail) - 1);
    return;
  }

  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(4000);
  http.begin(FISHFARM_API_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"cycleId\":\"" + String(CYCLE_ID) + "\",";
  body += "\"cycleStartDate\":\"" + String(CYCLE_START_DATE) + "\",";
  body += "\"waterTemperature\":" + String(job.tempC, 2) + ",";
  body += "\"phLevel\":" + String(job.phLevel, 2);
  body += "}";

  const int status = http.POST(body);
  const String response = http.getString();
  http.end();

  out->httpStatus = status;
  out->success = (status >= 200 && status < 300);

  if (!out->success && response.length() > 0)
  {
    const int cap = (int)sizeof(out->errDetail) - 5;
    const int n = response.length() > cap ? cap : response.length();
    if (n > 0)
      std::memcpy(out->errDetail, response.c_str(), (size_t)n);
    out->errDetail[n] = '\0';
    if ((int)response.length() > cap)
      std::strcat(out->errDetail, "...");
  }
}

static void transmitWorker(void *)
{
  TxJob job;
  TxResult r;
  for (;;)
  {
    if (xQueueReceive(txJobQueue, &job, portMAX_DELAY) != pdTRUE)
      continue;
    runMonitoringHttpPost(job, &r);
    (void)xQueueSend(txResultQueue, &r, portMAX_DELAY);
  }
}

/** Upload outcome — always on Serial (not tied to SERIAL_DEBUG). */
static void drainTxResults(void)
{
  TxResult r;
  while (xQueueReceive(txResultQueue, &r, 0) == pdTRUE)
  {
    if (r.success)
      Serial.printf("[TX] Upload to server: SUCCESS (HTTP %d)\n", r.httpStatus);
    else
    {
      Serial.printf("[TX] Upload to server: FAILED (HTTP %d)\n", r.httpStatus);
      if (r.errDetail[0] != '\0')
        Serial.printf("[TX]   %s\n", r.errDetail);
    }
  }
}

void printAddress(DeviceAddress deviceAddress)
{
  for (uint8_t i = 0; i < 8; i++)
  {
    if (deviceAddress[i] < 16)
      DBG_PRINT("0");
    DBG_PRINT(deviceAddress[i], HEX);
  }
}

void printTemperature(DeviceAddress deviceAddress)
{
  float tempC = sensors.getTempC(deviceAddress);
  if (tempC == DEVICE_DISCONNECTED_C)
  {
    DBG_PRINTLN("Error: Could not read temperature data");
    return;
  }

  DBG_PRINT("Temp C: ");
  DBG_PRINT(tempC);
  DBG_PRINT(" Temp F: ");
  DBG_PRINTLN(DallasTemperature::toFahrenheit(tempC));
}

static void registerWifiNetworks()
{
  static bool registered = false;
  if (registered)
    return;
  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);
  wifiMulti.addAP(WIFI_SSID_2, WIFI_PASSWORD_2);
  registered = true;
}

void printWifiStatus()
{
  const wl_status_t s = WiFi.status();
  DBG_PRINT("[WiFi] ");
  if (s == WL_CONNECTED)
  {
    DBG_PRINTF("CONNECTED  SSID=\"%s\"  IP=%s  RSSI=%d dBm  CH=%u  MAC=%s\n",
               WiFi.SSID().c_str(),
               WiFi.localIP().toString().c_str(),
               WiFi.RSSI(),
               (unsigned)WiFi.channel(),
               WiFi.macAddress().c_str());
  }
  else
  {
    DBG_PRINTF("DISCONNECTED  code=%d (", (int)s);
    switch (s)
    {
    case WL_IDLE_STATUS:
      DBG_PRINT("IDLE");
      break;
    case WL_NO_SSID_AVAIL:
      DBG_PRINT("NO_SSID");
      break;
    case WL_SCAN_COMPLETED:
      DBG_PRINT("SCAN_DONE");
      break;
    case WL_CONNECT_FAILED:
      DBG_PRINT("CONNECT_FAILED");
      break;
    case WL_CONNECTION_LOST:
      DBG_PRINT("CONN_LOST");
      break;
    case WL_DISCONNECTED:
      DBG_PRINT("DISCONNECTED");
      break;
    default:
      DBG_PRINT("?");
      break;
    }
    DBG_PRINTLN(")");
  }
}

bool smartWiFiConnect()
{
  registerWifiNetworks();

  if (WiFi.status() == WL_CONNECTED)
  {
    wifiReconnectFailCount = 0;
    return true;
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(WIFI_PS_NONE);

  DBG_PRINTLN("[WiFi] Quick reconnect (same AP)...");
  WiFi.reconnect();
  {
    const unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < WIFI_QUICK_RECONNECT_WAIT_MS)
      delay(100);
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    wifiReconnectFailCount = 0;
    DBG_PRINT("[WiFi] OK (quick). SSID: ");
    DBG_PRINT(WiFi.SSID());
    DBG_PRINT("  IP: ");
    DBG_PRINTLN(WiFi.localIP());
    return true;
  }

  DBG_PRINTLN("[WiFi] Full reconnect via WiFiMulti...");
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(WIFI_PS_NONE);

  DBG_PRINT("[WiFi] Trying networks");
  int tries = 0;
  while (wifiMulti.run() != WL_CONNECTED && tries < WIFI_FULL_CONNECT_TRIES)
  {
    delay(WIFI_FULL_CONNECT_STEP_MS);
    DBG_PRINT(".");
    tries++;
  }
  DBG_PRINTLN();

  if (WiFi.status() == WL_CONNECTED)
  {
    wifiReconnectFailCount = 0;
    DBG_PRINT("[WiFi] OK. SSID: ");
    DBG_PRINT(WiFi.SSID());
    DBG_PRINT("  IP: ");
    DBG_PRINTLN(WiFi.localIP());
    return true;
  }

  wifiReconnectFailCount++;
  DBG_PRINTF("[WiFi] Failed (fail count=%u, next backoff=%lu ms)\n",
             wifiReconnectFailCount, wifiReconnectBackoffMs());
  return false;
}

void monitorWiFi()
{
  const unsigned long now = millis();
  if (now - lastWiFiMonitorMs < WIFI_CHECK_INTERVAL_MS)
    return;
  lastWiFiMonitorMs = now;

  if (WiFi.status() == WL_CONNECTED)
  {
    if (!wifiLinkWasUp)
    {
      wifiLinkWasUp = true;
      DBG_PRINTLN("[WiFi] Link up.");
      lastWifiStatusLogMs = millis();
      printWifiStatus();
    }
    wifiReconnectFailCount = 0;
    return;
  }

  if (wifiLinkWasUp)
  {
    wifiLinkWasUp = false;
    lastWiFiReconnectMs = 0;
    DBG_PRINTLN("[WiFi] Lost connection — will retry with backoff.");
  }

  if (lastWiFiReconnectMs != 0 && (now - lastWiFiReconnectMs < wifiReconnectBackoffMs()))
    return;

  lastWiFiReconnectMs = now;
  smartWiFiConnect();
}

void setup(void)
{
  Serial.begin(115200);
  Serial.setTxBufferSize(2048);
  delay(200);
  DBG_PRINTLN("Fishfarm Monitoring: Temperature + pH");
  DBG_PRINT("API URL: ");
  DBG_PRINTLN(FISHFARM_API_URL);

  analogSetPinAttenuation(PH_ADC_PIN, ADC_11db);

  txJobQueue = xQueueCreate(2, sizeof(TxJob));
  txResultQueue = xQueueCreate(4, sizeof(TxResult));
  if (txJobQueue && txResultQueue)
  {
    xTaskCreatePinnedToCore(transmitWorker, "txMon", 8192, nullptr, 1, nullptr, 0);
  }
  else
  {
    DBG_PRINTLN("FATAL: TX queues not created");
  }

  // Probe DS18B20 before WiFi starts — avoids RF activity during OneWire reset/search.
  pinMode(ONE_WIRE_BUS, INPUT_PULLUP);
  sensors.begin();
  DBG_PRINT("Locating devices on GPIO ");
  DBG_PRINT(ONE_WIRE_BUS);
  DBG_PRINT("... ");
  const uint8_t nDev = sensors.getDeviceCount();
  DBG_PRINT("found ");
  DBG_PRINT(nDev, DEC);
  DBG_PRINTLN(".");

  if (nDev == 0)
  {
    DBG_PRINTLN("ERROR: No DS18B20. Check DATA->GPIO wire, 3.3V, GND, 4k7 pull-up DATA->3.3V.");
    gDs18b20Ready = false;
  }
  else
  {
    DBG_PRINT("Parasite power is: ");
    DBG_PRINTLN(sensors.isParasitePowerMode() ? "ON" : "OFF");

    if (!sensors.getAddress(insideThermometer, 0))
    {
      DBG_PRINTLN("ERROR: getAddress(0) failed despite deviceCount>0 — bus glitch?");
      gDs18b20Ready = false;
    }
    else
    {
      DBG_PRINT("Device 0 Address: ");
      printAddress(insideThermometer);
      DBG_PRINTLN();
      sensors.setResolution(insideThermometer, 10);
      DBG_PRINT("Device 0 Resolution (bits): ");
      DBG_PRINTLN(sensors.getResolution(insideThermometer), DEC);
      gDs18b20Ready = true;
    }
  }

  smartWiFiConnect();
  lastWifiStatusLogMs = millis();
  printWifiStatus();
}

void loop(void)
{
  monitorWiFi();
  drainTxResults();

  if (!gDs18b20Ready)
  {
    delay(500);
    return;
  }

  const unsigned long nowMs = millis();
  const bool doDebugPrint = (nowMs - lastDebugPrintMs >= DEBUG_PRINT_INTERVAL_MS);
  const bool doUpload = (nowMs - lastSampleMs >= SAMPLE_INTERVAL_MS);

  if (!doDebugPrint && !doUpload)
  {
    delay(10);
    return;
  }

  if (doUpload && !txJobQueue)
  {
    delay(100);
    return;
  }

  if (doDebugPrint && (nowMs - lastWifiStatusLogMs >= WIFI_STATUS_LOG_INTERVAL_MS))
  {
    lastWifiStatusLogMs = nowMs;
    printWifiStatus();
  }

  sensors.requestTemperatures();
  yield();

  const float tempC = sensors.getTempC(insideThermometer);
  const float phValue = readPhLevel();

  if (doDebugPrint)
  {
    if (tempC == DEVICE_DISCONNECTED_C)
      DBG_PRINTLN("Temp: (disconnected)");
    else
      DBG_PRINTF("Temp: %.2f C  (%.2f F)\n", tempC, DallasTemperature::toFahrenheit(tempC));

    DBG_PRINTF("pH: %.2f\n", phValue);
    lastDebugPrintMs = nowMs;
  }

  if (!doUpload)
    return;

  if (tempC == DEVICE_DISCONNECTED_C)
  {
    DBG_PRINTLN("Upload skipped: DS18B20 disconnected");
    lastSampleMs = nowMs;
    return;
  }

  TxJob job = {tempC, phValue};
  if (xQueueSend(txJobQueue, &job, 0) != pdTRUE)
  {
    DBG_PRINTLN("[DBG] TX queue full (POST still running); will retry.");
    return;
  }

  lastSampleMs = nowMs;
}
