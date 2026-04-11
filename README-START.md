# 🚀 Quick Start Guide

## Starting the Entire System

### Option 1: Using PowerShell Script (Recommended)
```powershell
.\start-system.ps1
```

### Option 2: Using Batch File
```cmd
start-system.bat
```

### Option 3: Manual Start (Step by Step)

#### 1. Start PostgreSQL
- **Method A (Services):**
  - Press `Win + R`, type `services.msc`, press Enter
  - Find "PostgreSQL" service
  - Right-click → Start

- **Method B (Command Line as Admin):**
  ```cmd
  net start postgresql-x64-18
  ```

#### 2. Start Backend Server
Open a terminal and run:
```bash
cd server
npm run dev
```

#### 3. Start Frontend
Open another terminal and run:
```bash
npm run dev
```

---

## First Time Setup

If this is your first time running the system:

1. **Install dependencies:**
   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

2. **Set up database:**
   ```bash
   cd server
   npm run setup
   ```

3. **Start the system** (use one of the options above)

---

## Accessing the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **API Docs:** http://localhost:4000/api

**Login Credentials:**
- Email: `bfar.bohol@da.gov.ph`
- Password: `tilapia2025!`

---

## Troubleshooting

### PostgreSQL Won't Start
- Make sure PostgreSQL is installed
- Check if port 5432 is available
- Try running as Administrator

### Backend Won't Connect to Database
- Verify PostgreSQL is running
- Check `server/.env` file has correct credentials
- Run `cd server && npm run setup` to verify connection

### Port Already in Use
- Change port in `server/.env` (PORT=4000)
- Or kill the process using that port

---

## Stopping the System

- **Frontend:** Press `Ctrl + C` in the frontend terminal
- **Backend:** Close the backend terminal window
- **PostgreSQL:** Stop via Services or `net stop postgresql-x64-18`

