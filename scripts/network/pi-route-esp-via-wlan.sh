#!/bin/bash
# Force traffic to the ESP32 (Wi‑Fi only) out wlan0 when the Pi has both eth0 and wlan0 on 192.168.1.0/24.
# Install: sudo cp scripts/network/pi-route-esp-via-wlan.sh /usr/local/bin/ && sudo chmod +x /usr/local/bin/pi-route-esp-via-wlan.sh
# Optional: echo 'ESP32_IP=192.168.1.4' | sudo tee /etc/default/fishfarm-esp-route

set -euo pipefail

if [[ -f /etc/default/fishfarm-esp-route ]]; then
  # shellcheck source=/dev/null
  source /etc/default/fishfarm-esp-route
fi
ESP32_IP="${ESP32_IP:-192.168.1.4}"
WLAN_DEV="${WLAN_DEV:-wlan0}"

if ! ip link show "$WLAN_DEV" >/dev/null 2>&1; then
  echo "Interface $WLAN_DEV not found" >&2
  exit 1
fi

for _ in $(seq 1 60); do
  if ip -4 addr show dev "$WLAN_DEV" | grep -q 'inet '; then
    ip route replace "${ESP32_IP}/32" dev "$WLAN_DEV"
    echo "Route: ${ESP32_IP}/32 -> dev ${WLAN_DEV}"
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for IPv4 on ${WLAN_DEV}" >&2
exit 1
