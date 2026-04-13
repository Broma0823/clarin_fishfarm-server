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

const unsigned long SAMPLE_INTERVAL_MS = 10000UL;
unsigned long lastSampleMs = 0;

#define DEBUG_PRINT_INTERVAL_MS 3000UL
static unsigned long lastDebugPrintMs = 0;

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
DeviceAddress insideThermometer;
static bool gDs18b20Ready = false;

static const int PH_ADC_PIN = 34;
static const int DO_ADC_PIN = 35;
static const float ADC_VREF = 3.3f;
static const float ADC_MAX = 4095.0f;
static const float R_DIV_TOP_OHMS = 2200.0f;
static const float R_DIV_BOTTOM_OHMS = 3000.0f;
static const float DIVIDER_SCALE =
    (R_DIV_TOP_OHMS + R_DIV_BOTTOM_OHMS) / R_DIV_BOTTOM_OHMS;
static const float DO_R_DIV_TOP_OHMS = 2200.0f;
static const float DO_R_DIV_BOTTOM_OHMS = 3000.0f;
static const float DO_DIVIDER_SCALE =
    (DO_R_DIV_TOP_OHMS + DO_R_DIV_BOTTOM_OHMS) / DO_R_DIV_BOTTOM_OHMS;
static float phCalibrationValue = 24.05f - 1.05f;

struct DoReading
{
  uint32_t rawAdc;
  float voltagePin;
  float voltageModuleEst;
};

struct TxJob
{
  float tempC;
  float phLevel;
  uint32_t doRawAdc;
  float doVoltagePin;
  float doVoltageModuleEst;
};

struct TxResult
{
  int httpStatus;
  bool success;
  char errDetail[96];
};

static QueueHandle_t txJobQueue = nullptr;
static QueueHandle_t txResultQueue = nullptr;

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
  return -5.70f * voltModule + phCalibrationValue;
}

static DoReading readDoRaw()
{
  DoReading r = {0, 0.0f, 0.0f};
  uint32_t sum = 0;
  for (int i = 0; i < 20; i++)
  {
    sum += (uint32_t)analogRead(DO_ADC_PIN);
    delay(2);
  }
  r.rawAdc = sum / 20U;
  r.voltagePin = ((float)r.rawAdc * ADC_VREF) / ADC_MAX;
  r.voltageModuleEst = r.voltagePin * DO_DIVIDER_SCALE;
  return r;
}

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
  body += "\"phLevel\":" + String(job.phLevel, 2) + ",";
  body += "\"dissolvedOxygen\":" + String(job.doVoltageModuleEst, 3);
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
    DBG_PRINTF("DISCONNECTED  code=%d\n", (int)s);
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
    DBG_PRINTLN(WiFi.SSID());
    return true;
  }

  DBG_PRINTLN("[WiFi] Full reconnect via WiFiMulti...");
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(WIFI_PS_NONE);

  int tries = 0;
  while (wifiMulti.run() != WL_CONNECTED && tries < WIFI_FULL_CONNECT_TRIES)
  {
    delay(WIFI_FULL_CONNECT_STEP_MS);
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    wifiReconnectFailCount = 0;
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
  DBG_PRINTLN("Fishfarm Monitoring: Temperature + pH + DO(raw)");
  DBG_PRINT("API URL: ");
  DBG_PRINTLN(FISHFARM_API_URL);

  analogSetPinAttenuation(PH_ADC_PIN, ADC_11db);
  analogSetPinAttenuation(DO_ADC_PIN, ADC_11db);

  DBG_PRINTF("[DIAG] GPIO%d raw ADC = %d (expect >0 if DO board wired)\n",
             DO_ADC_PIN, analogRead(DO_ADC_PIN));
  DBG_PRINTF("[DIAG] GPIO%d raw ADC = %d (pH pin for comparison)\n",
             PH_ADC_PIN, analogRead(PH_ADC_PIN));

  txJobQueue = xQueueCreate(2, sizeof(TxJob));
  txResultQueue = xQueueCreate(4, sizeof(TxResult));
  if (txJobQueue && txResultQueue)
  {
    xTaskCreatePinnedToCore(transmitWorker, "txMon", 8192, nullptr, 1, nullptr, 0);
  }

  pinMode(ONE_WIRE_BUS, INPUT_PULLUP);
  sensors.begin();
  const uint8_t nDev = sensors.getDeviceCount();
  if (nDev == 0 || !sensors.getAddress(insideThermometer, 0))
  {
    gDs18b20Ready = false;
    DBG_PRINTLN("ERROR: DS18B20 not ready.");
  }
  else
  {
    sensors.setResolution(insideThermometer, 10);
    gDs18b20Ready = true;
    DBG_PRINT("DS18B20 Address: ");
    printAddress(insideThermometer);
    DBG_PRINTLN();
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
  const DoReading doReading = readDoRaw();

  if (doDebugPrint)
  {
    if (tempC == DEVICE_DISCONNECTED_C)
      DBG_PRINTLN("Temp: (disconnected)");
    else
      DBG_PRINTF("Temp: %.2f C (%.2f F)\n", tempC, DallasTemperature::toFahrenheit(tempC));
    DBG_PRINTF("pH: %.2f\n", phValue);
    DBG_PRINTF("DO raw: %lu | DO V@pin: %.3f V | DO V@mod(est): %.3f V | UNCALIBRATED\n",
               doReading.rawAdc, doReading.voltagePin, doReading.voltageModuleEst);
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

  TxJob job = {tempC, phValue, doReading.rawAdc, doReading.voltagePin, doReading.voltageModuleEst};
  if (xQueueSend(txJobQueue, &job, 0) != pdTRUE)
  {
    DBG_PRINTLN("[DBG] TX queue full (POST still running); will retry.");
    return;
  }

  lastSampleMs = nowMs;
}
