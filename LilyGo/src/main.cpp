#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// WiFi + API config
const char *WIFI_SSID = "PLDTHOMEFIBR206c0";
const char *WIFI_PASSWORD = "PLDTWIFIb5Q56";

#ifndef FISHFARM_API_URL
#define FISHFARM_API_URL "http://192.168.1.11:4000/api/monitoring"
#endif
const char *CYCLE_ID = "CYCLE-2026-01";
const char *CYCLE_START_DATE = "2026-04-07";

const unsigned long SAMPLE_INTERVAL_MS = 60000UL;
unsigned long lastSampleMs = 0;

// Data wire is plugged into GPIO 2 on LilyGO/ESP32
#define ONE_WIRE_BUS 2

// Setup a oneWire instance and DallasTemperature wrapper
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Array to hold device address
DeviceAddress insideThermometer;

void printAddress(DeviceAddress deviceAddress)
{
  for (uint8_t i = 0; i < 8; i++)
  {
    if (deviceAddress[i] < 16)
      Serial.print("0");
    Serial.print(deviceAddress[i], HEX);
  }
}

void printTemperature(DeviceAddress deviceAddress)
{
  float tempC = sensors.getTempC(deviceAddress);
  if (tempC == DEVICE_DISCONNECTED_C)
  {
    Serial.println("Error: Could not read temperature data");
    return;
  }

  Serial.print("Temp C: ");
  Serial.print(tempC);
  Serial.print(" Temp F: ");
  Serial.println(DallasTemperature::toFahrenheit(tempC));
}

bool postTemperature(float tempC)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("POST status: -1");
    Serial.println("POST response: WiFi disconnected");
    return false;
  }

  HTTPClient http;
  http.setConnectTimeout(8000);
  http.setTimeout(8000);
  http.begin(FISHFARM_API_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"cycleId\":\"" + String(CYCLE_ID) + "\",";
  body += "\"cycleStartDate\":\"" + String(CYCLE_START_DATE) + "\",";
  body += "\"waterTemperature\":" + String(tempC, 2);
  body += "}";

  int status = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.print("POST status: ");
  Serial.println(status);
  Serial.print("POST response: ");
  Serial.println(response);
  return status >= 200 && status < 300;
}

void connectWiFi()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40)
  {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("WiFi connect timeout.");
  }
}

void setup(void)
{
  Serial.begin(115200);
  delay(500);
  Serial.println("Dallas Temperature IC Control Library Demo");
  Serial.print("API URL: ");
  Serial.println(FISHFARM_API_URL);
  connectWiFi();

  sensors.begin();
  Serial.print("Locating devices...");
  Serial.print("Found ");
  Serial.print(sensors.getDeviceCount(), DEC);
  Serial.println(" devices.");

  Serial.print("Parasite power is: ");
  if (sensors.isParasitePowerMode())
    Serial.println("ON");
  else
    Serial.println("OFF");

  if (!sensors.getAddress(insideThermometer, 0))
  {
    Serial.println("Unable to find address for Device 0");
    return;
  }

  Serial.print("Device 0 Address: ");
  printAddress(insideThermometer);
  Serial.println();

  sensors.setResolution(insideThermometer, 9);
  Serial.print("Device 0 Resolution: ");
  Serial.print(sensors.getResolution(insideThermometer), DEC);
  Serial.println();
}

void loop(void)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    connectWiFi();
  }

  if (millis() - lastSampleMs < SAMPLE_INTERVAL_MS)
  {
    delay(50);
    return;
  }
  lastSampleMs = millis();

  Serial.print("Requesting temperatures...");
  sensors.requestTemperatures();
  Serial.println("DONE");

  printTemperature(insideThermometer);

  float tempC = sensors.getTempC(insideThermometer);
  if (tempC == DEVICE_DISCONNECTED_C)
  {
    Serial.println("Upload skipped: DS18B20 disconnected");
    return;
  }

  const bool ok = postTemperature(tempC);
  if (ok)
  {
    Serial.println("Uploaded temperature to website API.");
  }
}
