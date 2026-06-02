#include <WiFi.h>
#include <esp_wifi.h>
#include <WebServer.h>

// change to your network
const char* ssid     = "";
const char* password = "";

// set gpio pins
const uint pwr = 7;
const uint rst = 1;

WebServer server(80);   // port 80

// ---------- handlers ----------
void respond(String s) {
  server.send(200, "text/plain; charset=utf-8", s);
}
void handleRoot() {
  respond("meow :3\n\n"
          "use /high?pwr or /high?rst to set pin HIGH\n"
          "use /low?pwr or /low?rst to set pin LOW\n"
          "use /hold?pwr or /hold?rst with hold=ms to set pin HIGH for ms milliseconds");
}
void handlePWR() {
  String set = server.arg("set");
  if (set == "high") {
    digitalWrite(pwr, HIGH);
    Serial.println("pwr set to HIGH");
    respond("pwr set to HIGH");
  } else if (set == "low") {
    digitalWrite(pwr, LOW);
    Serial.println("pwr set to LOW");
    respond("pwr set to LOW");
  }
  String hold = server.arg("hold");
  if (hold != "") {
    int holdTime = hold.toInt();
    digitalWrite(pwr, HIGH);
    delay(holdTime);
    digitalWrite(pwr, LOW);
    Serial.println("pwr held for " + String(holdTime) + "ms, now set to LOW");
    respond("pwr held for " + String(holdTime) + "ms, now set to LOW");
  }
}

void handleRST() {
  String set = server.arg("set");
  if (set == "high") {
    digitalWrite(rst, HIGH);
    Serial.println("rst set to HIGH");
    respond("rst set to HIGH");
  } else if (set == "low") {
    digitalWrite(rst, LOW);
    Serial.println("rst set to LOW");
    respond("rst set to LOW");
  }
  String hold = server.arg("hold");
  if (hold != "") {
    int holdTime = hold.toInt();
    digitalWrite(rst, HIGH);
    delay(holdTime);
    digitalWrite(rst, LOW);
    Serial.println("rst held for " + String(holdTime) + "ms, now set to LOW");
    respond("rst held for " + String(holdTime) + "ms, now set to LOW");
  }
}

// ---------- setup ----------
void setup() {
  pinMode(pwr, OUTPUT);
  pinMode(rst, OUTPUT);
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println("\nconnected, IP: " + WiFi.localIP().toString());
  Serial.println("MAC address: " + WiFi.macAddress());

  server.on("/", handleRoot);
  server.on("/pwr", handlePWR);
  server.on("/rst", handleRST);
  server.begin();
  Serial.println("HTTP server started");
}

// ---------- loop ----------
void loop() {
  server.handleClient();   // process incoming requests
}