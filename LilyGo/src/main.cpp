#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WebServer.h>
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

const char *WIFI_SSID = "Candog";
const char *WIFI_PASSWORD = "Qwerty12345-";
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
#define FISHFARM_API_URL "http://192.168.1.20:4000/api/monitoring"
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

static float readPhLevel(void);
static DoReading readDoRaw(void);

struct TxJob
{
  float tempC;
  bool tempValid;
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

WebServer statusServer(80);

static int gLastHttpStatus = -1;
static bool gLastUploadSuccess = false;
static unsigned long gLastUploadResultMs = 0;
static unsigned long gLastUploadSuccessMs = 0;
static char gLastUploadError[96] = {0};

static void jsonEscape(const char *in, char *out, size_t outSz)
{
  size_t j = 0;
  if (!in || !out || outSz < 4)
    return;
  for (size_t i = 0; in[i] && j + 2 < outSz; i++)
  {
    const char c = in[i];
    if (c == '"' || c == '\\')
    {
      if (j + 3 >= outSz)
        break;
      out[j++] = '\\';
      out[j++] = c;
    }
    else if ((unsigned char)c < 0x20)
    {
      if (j + 2 >= outSz)
        break;
      out[j++] = ' ';
    }
    else
      out[j++] = c;
  }
  out[j] = '\0';
}

static void handleStatusData(void)
{
  float tempC = 0.0f;
  bool tempValid = false;
  if (gDs18b20Ready)
  {
    sensors.requestTemperatures();
    yield();
    tempC = sensors.getTempC(insideThermometer);
    tempValid = (tempC != DEVICE_DISCONNECTED_C);
  }

  const float phValue = readPhLevel();
  const DoReading doReading = readDoRaw();

  char errEsc[128] = {0};
  jsonEscape(gLastUploadError, errEsc, sizeof(errEsc));

  String json = "{";
  json += "\"wifi\":\"" + String(WiFi.status() == WL_CONNECTED ? "connected" : "disconnected") + "\",";
  if (WiFi.status() == WL_CONNECTED)
  {
    json += "\"ssid\":\"" + WiFi.SSID() + "\",";
    json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"mac\":\"" + WiFi.macAddress() + "\",";
  }
  json += "\"apiUrl\":\"" + String(FISHFARM_API_URL) + "\",";
  json += "\"cycleId\":\"" + String(CYCLE_ID) + "\",";
  json += "\"ds18b20Ready\":" + String(gDs18b20Ready ? "true" : "false") + ",";
  json += "\"tempValid\":" + String(tempValid ? "true" : "false") + ",";
  if (tempValid)
    json += "\"waterTemperatureC\":" + String(tempC, 2) + ",";
  else
    json += "\"waterTemperatureC\":null,";
  json += "\"ph\":" + String(phValue, 2) + ",";
  json += "\"doRawAdc\":" + String((unsigned long)doReading.rawAdc) + ",";
  json += "\"doVoltagePinV\":" + String(doReading.voltagePin, 3) + ",";
  json += "\"doVoltageModuleEstV\":" + String(doReading.voltageModuleEst, 3) + ",";
  json += "\"lastHttpStatus\":" + String(gLastHttpStatus) + ",";
  json += "\"lastUploadSuccess\":" + String(gLastUploadSuccess ? "true" : "false") + ",";
  json += "\"lastUploadResultMs\":" + String(gLastUploadResultMs) + ",";
  json += "\"lastUploadSuccessMs\":" + String(gLastUploadSuccessMs) + ",";
  json += "\"lastUploadError\":\"" + String(errEsc) + "\"";
  json += "}";

  statusServer.send(200, "application/json", json);
}

static void handleStatusRoot(void)
{
  static const char page[] PROGMEM =
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/>"
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"
      "<title>ESP32 device monitor</title>"
      "<style>body{font-family:system-ui,Segoe UI,sans-serif;margin:1rem;max-width:52rem;background:#f8fafc;color:#0f172a}"
      "h1{font-size:1.2rem}#hint{color:#64748b;font-size:.85rem}pre{background:#fff;border:1px solid #e2e8f0;padding:1rem;border-radius:10px;overflow:auto;font-size:.8rem}"
      "table{border-collapse:collapse;width:100%;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}"
      "td,th{padding:.5rem .65rem;text-align:left;font-size:.85rem}th{background:#f1f5f9}</style></head><body>"
      "<h1>Fishfarm ESP32 — device monitor</h1>"
      "<p id=\"hint\">Loading…</p>"
      "<table id=\"tbl\"><tbody></tbody></table>"
      "<pre id=\"out\"></pre>"
      "<script>"
      "async function tick(){try{"
      "const j=await(await fetch('/data')).json();"
      "document.getElementById('out').textContent=JSON.stringify(j,null,2);"
      "document.getElementById('hint').textContent='Updated '+new Date().toLocaleString();"
      "const r=(k,v)=>'<tr><th>'+k+'</th><td>'+(v===null||v===undefined?'—':String(v))+'</td></tr>';"
      "let t='';"
      "t+=r('WiFi',j.wifi);if(j.ssid)t+=r('SSID',j.ssid);if(j.ip)t+=r('IP',j.ip);"
      "if(j.rssi!==undefined)t+=r('RSSI (dBm)',j.rssi);if(j.mac)t+=r('MAC',j.mac);"
      "t+=r('API URL (Pi Wi‑Fi)',j.apiUrl);t+=r('Cycle',j.cycleId);t+=r('DS18B20 ready',j.ds18b20Ready);"
      "t+=r('Temp valid',j.tempValid);t+=r('Water °C',j.waterTemperatureC);t+=r('pH',j.ph);"
      "t+=r('DO raw ADC',j.doRawAdc);t+=r('DO V @ pin',j.doVoltagePinV);t+=r('DO V @ module (est)',j.doVoltageModuleEstV);"
      "t+=r('Last HTTP status',j.lastHttpStatus);t+=r('Last upload OK',j.lastUploadSuccess);"
      "t+=r('Last upload error',j.lastUploadError||'—');"
      "document.querySelector('#tbl tbody').innerHTML=t;"
      "}catch(e){document.getElementById('hint').textContent=String(e);}}"
      "tick();setInterval(tick,2000);"
      "</script></body></html>";

  statusServer.send_P(200, "text/html", page);
}

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
  http.setConnectTimeout(8000);
  http.setTimeout(10000);
  http.begin(FISHFARM_API_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"cycleId\":\"" + String(CYCLE_ID) + "\",";
  body += "\"cycleStartDate\":\"" + String(CYCLE_START_DATE) + "\",";
  if (job.tempValid)
    body += "\"waterTemperature\":" + String(job.tempC, 2) + ",";
  else
    body += "\"waterTemperature\":null,";
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
    gLastHttpStatus = r.httpStatus;
    gLastUploadSuccess = r.success;
    gLastUploadResultMs = millis();
    if (r.success)
      gLastUploadSuccessMs = gLastUploadResultMs;
    std::memset(gLastUploadError, 0, sizeof(gLastUploadError));
    if (r.errDetail[0] != '\0')
      std::strncpy(gLastUploadError, r.errDetail, sizeof(gLastUploadError) - 1);

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

  statusServer.on("/", HTTP_GET, handleStatusRoot);
  statusServer.on("/data", HTTP_GET, handleStatusData);
  statusServer.begin();
  DBG_PRINTLN("[HTTP] Device monitor (browser): http://<ESP32-IP>/  (JSON: /data)");
}

void loop(void)
{
  monitorWiFi();
  drainTxResults();
  statusServer.handleClient();

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

  float tempC = 0.0f;
  bool tempValid = false;
  if (gDs18b20Ready)
  {
    sensors.requestTemperatures();
    yield();
    tempC = sensors.getTempC(insideThermometer);
    tempValid = (tempC != DEVICE_DISCONNECTED_C);
  }

  const float phValue = readPhLevel();
  const DoReading doReading = readDoRaw();

  if (doDebugPrint)
  {
    if (!gDs18b20Ready)
      DBG_PRINTLN("Temp: (DS18B20 not detected)");
    else if (!tempValid)
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

  TxJob job = {tempC, tempValid, phValue, doReading.rawAdc, doReading.voltagePin, doReading.voltageModuleEst};
  if (xQueueSend(txJobQueue, &job, 0) != pdTRUE)
  {
    DBG_PRINTLN("[DBG] TX queue full (POST still running); will retry.");
    return;
  }

  lastSampleMs = nowMs;
}
