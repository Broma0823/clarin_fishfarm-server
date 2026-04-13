# Clarin Fish Farm - Disaster Recovery Guide

## Overview

This guide covers how to recover the entire system from scratch if the Raspberry Pi's SD card corrupts, the server breaks, or anything goes wrong.

**GitHub Repository:** `git@github.com:Broma0823/clarin_fishfarm-server.git`

---

## System Architecture

| Component         | Details                                      |
| ----------------- | -------------------------------------------- |
| Device            | Raspberry Pi (running the server)            |
| Microcontroller   | ESP32 (LilyGo) — reads sensors, posts data  |
| Backend           | Node.js + Express (port 4000)                |
| Frontend          | React + Vite (port 5173)                     |
| Database          | PostgreSQL 17                                |
| Database Name     | `bfar_db`                                    |
| Database User     | `postgres`                                   |
| Database Password | `clarinfishfarm2026`                         |
| Database URL      | `postgresql://postgres:clarinfishfarm2026@localhost:5432/bfar_db` |

---

## Step 1: Set Up the Raspberry Pi

Flash a fresh Raspberry Pi OS onto an SD card using Raspberry Pi Imager. During setup:
- Enable SSH
- Set username to `thesis`
- Connect to your WiFi network

Boot the Pi and SSH into it:

```bash
ssh thesis@<raspberry-pi-ip>
```

---

## Step 2: Install Node.js (v20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v   # Should show v20.x.x
npm -v    # Should show 9.x.x or later
```

---

## Step 3: Install PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

Start and enable PostgreSQL:

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Configure the database

Set the password for the `postgres` user and create the database:

```bash
sudo -u postgres psql
```

Inside the PostgreSQL shell:

```sql
ALTER USER postgres WITH PASSWORD 'clarinfishfarm2026';
CREATE DATABASE bfar_db OWNER postgres;
\q
```

### Allow password authentication

Edit the PostgreSQL auth config:

```bash
sudo nano /etc/postgresql/17/main/pg_hba.conf
```

Find the line that says:

```
local   all   postgres   peer
```

Change `peer` to `md5`:

```
local   all   postgres   md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Step 4: Clone the Repository

```bash
cd ~
git clone git@github.com:Broma0823/clarin_fishfarm-server.git fishfarm_database
cd fishfarm_database
```

If SSH keys aren't set up, use HTTPS instead:

```bash
git clone https://github.com/Broma0823/clarin_fishfarm-server.git fishfarm_database
cd fishfarm_database
```

---

## Step 5: Install Dependencies

### Frontend dependencies

```bash
cd ~/fishfarm_database
npm install
```

### Backend dependencies

```bash
cd ~/fishfarm_database/server
npm install
```

---

## Step 6: Set Up the Server Environment

Create the `.env` file for the backend:

```bash
cat > ~/fishfarm_database/server/.env << 'EOF'
HOST=0.0.0.0
PORT=4000
DATABASE_URL=postgresql://postgres:clarinfishfarm2026@localhost:5432/bfar_db
UPLOAD_DIR=./uploads
EOF
```

Create the uploads directory:

```bash
mkdir -p ~/fishfarm_database/server/uploads
```

---

## Step 7: Run Database Migrations

Run all migration files in order:

```bash
cd ~/fishfarm_database

PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -f server/db/migrations/001_init.sql
PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -f server/db/migrations/002_change_quantity_to_bigint.sql
PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -f server/db/migrations/003_create_monitoring_parameters.sql
PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -f server/db/migrations/004_add_fry_production.sql
PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -f server/db/migrations/005_add_distributions.sql
PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -f server/db/migrations/006_add_cycle_end_date.sql
```

Verify the tables were created:

```bash
PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -c "\dt"
```

---

## Step 8: Start the Servers

### Start the backend (port 4000)

```bash
cd ~/fishfarm_database/server
npm start &
```

### Start the frontend (port 5173)

```bash
cd ~/fishfarm_database
npm run dev -- --host &
```

### Verify

- Backend: `curl http://localhost:4000/api/health`
- Frontend: Open `http://<raspberry-pi-ip>:5173` in a browser

---

## Step 9: Set Up the ESP32

### Install PlatformIO

```bash
pip install platformio
```

Or if using PlatformIO CLI:

```bash
curl -fsSL -o get-platformio.py https://raw.githubusercontent.com/platformio/platformio-core-installer/master/get-platformio.py
python3 get-platformio.py
```

### Update the ESP32 firmware

Before flashing, update two things in `~/fishfarm_database/LilyGo/src/main.cpp`:

1. **WiFi credentials** (lines 25-28):

```cpp
const char *WIFI_SSID = "YOUR_WIFI_NAME";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

2. **API URL** (line 56) — use the Raspberry Pi's IP on the current network:

```cpp
#define FISHFARM_API_URL "http://<raspberry-pi-ip>:4000/api/monitoring"
```

To find the Pi's IP:

```bash
hostname -I
```

### Flash the ESP32

```bash
cd ~/fishfarm_database/LilyGo
pio run -t upload
```

If flashing fails, disconnect all sensor wires from the ESP32 first, then try again.

### Monitor serial output

```bash
pio device monitor
```

You should see temperature, pH, and DO readings printing every 10 seconds.

---

## Restoring a Database Backup

### Creating a backup (do this regularly)

```bash
PGPASSWORD=clarinfishfarm2026 pg_dump -U postgres -h localhost bfar_db > ~/bfar_backup_$(date +%Y%m%d).sql
```

### Restoring from a backup

```bash
# Drop and recreate the database
PGPASSWORD=clarinfishfarm2026 psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS bfar_db;"
PGPASSWORD=clarinfishfarm2026 psql -U postgres -h localhost -c "CREATE DATABASE bfar_db OWNER postgres;"

# Restore the backup
PGPASSWORD=clarinfishfarm2026 psql -U postgres -h localhost bfar_db < ~/bfar_backup_YYYYMMDD.sql
```

---

## Quick Reference - Common Commands

| Task                        | Command                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| Start backend               | `cd ~/fishfarm_database/server && npm start`                         |
| Start frontend              | `cd ~/fishfarm_database && npm run dev -- --host`                    |
| Check Pi's IP               | `hostname -I`                                                        |
| Check database              | `PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost` |
| Truncate all cycle data     | `PGPASSWORD=clarinfishfarm2026 psql -U postgres -d bfar_db -h localhost -c "TRUNCATE monitoring_parameters RESTART IDENTITY;"` |
| Flash ESP32                 | `cd ~/fishfarm_database/LilyGo && pio run -t upload`                 |
| Serial monitor              | `cd ~/fishfarm_database/LilyGo && pio device monitor`                |
| Backup database             | `PGPASSWORD=clarinfishfarm2026 pg_dump -U postgres -h localhost bfar_db > ~/bfar_backup.sql` |
| Pull latest code            | `cd ~/fishfarm_database && git pull clarin main`                     |
| Check server logs           | Check terminal running `npm start`                                   |

---

## Troubleshooting

### ESP32 won't flash
- Disconnect all sensor wires from the ESP32
- Hold the BOOT button while uploading
- Make sure DS18B20 data wire is on GPIO 4 (not GPIO 2)

### ESP32 shows 0 for DO sensor
- Make sure the DO sensor board is powered with 5V (VIN pin), not 3.3V
- The probe is uncalibrated — 0V through the voltage divider is expected without fill solution

### Database connection refused
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Check auth method in `pg_hba.conf` is set to `md5`
- Restart PostgreSQL: `sudo systemctl restart postgresql`

### Website not accessible from other devices
- Make sure Vite is started with `--host` flag: `npm run dev -- --host`
- Check firewall: `sudo ufw allow 5173 && sudo ufw allow 4000`
- Ensure devices are on the same WiFi network

### Sensor readings not showing on dashboard
- Check ESP32 is powered on and connected to WiFi (serial monitor)
- Verify the API URL in `main.cpp` matches the Pi's current IP
- Check the backend server is running on port 4000
