#!/bin/bash
cd "$(dirname "$0")"

echo "========================================="
echo "  BFAR Clarin Fish Farm - Starting Up"
echo "========================================="

# Kill any existing instances
echo "[1/3] Stopping old processes..."
fuser -k 4000/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null
sleep 1

# Start Express API server
echo "[2/3] Starting API server (port 4000)..."
cd server && node src/server.js &
API_PID=$!
cd ..

sleep 2

# Start Vite frontend
echo "[3/3] Starting frontend (port 5173)..."
npx vite --host 0.0.0.0 &
VITE_PID=$!

sleep 2

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "========================================="
echo "  All services running!"
echo ""
echo "  Local:    http://$IP:5173"
echo "  API:      http://$IP:4000/api/health"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "========================================="

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $API_PID $VITE_PID 2>/dev/null
  wait $API_PID $VITE_PID 2>/dev/null
  echo "All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

wait
