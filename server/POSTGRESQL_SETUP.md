# PostgreSQL Setup Guide for Windows

## Problem
When running `npm run dev`, you get an error that PostgreSQL is not running.

## Solution Steps

### Step 1: Check if PostgreSQL is Installed

Open PowerShell or Command Prompt and run:
```powershell
psql --version
```

If you see a version number, PostgreSQL is installed. If not, you need to install it first.

### Step 2: Start PostgreSQL Service

#### Option A: Using Services (Recommended)
1. Press `Win + R` to open Run dialog
2. Type `services.msc` and press Enter
3. Look for a service named:
   - `postgresql-x64-XX` (where XX is version number)
   - `PostgreSQL Database Server`
   - Or any service with "postgresql" in the name
4. Right-click on it and select **Start**
5. If it's already running, try **Restart**

#### Option B: Using Command Line (Run as Administrator)
```powershell
# Find PostgreSQL service name
Get-Service -Name "*postgresql*"

# Start the service (replace SERVICE_NAME with actual name)
Start-Service -Name "postgresql-x64-16"  # Example name
```

#### Option C: Using pg_ctl (if installed)
```powershell
# Navigate to PostgreSQL bin directory (usually in Program Files)
cd "C:\Program Files\PostgreSQL\16\bin"

# Start PostgreSQL server
pg_ctl start -D "C:\Program Files\PostgreSQL\16\data"
```

### Step 3: Verify PostgreSQL is Running

Test the connection:
```powershell
psql -U postgres -h localhost -p 5432
```

Or check if port 5432 is listening:
```powershell
netstat -an | findstr 5432
```

### Step 4: Create .env File (if not exists)

In the `server` directory, create a `.env` file with your PostgreSQL credentials:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/bfar_db
UPLOAD_DIR=./uploads
```

**Important:** Replace `YOUR_PASSWORD` with your actual PostgreSQL password.

### Step 5: Create Database (if needed)

If the database `bfar_db` doesn't exist, create it:

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE bfar_db;

# Exit psql
\q
```

Or use the setup script:
```powershell
cd server
npm run setup
```

### Step 6: Run Migrations

After creating the database, run migrations:
```powershell
cd server
npm run migrate
```

### Step 7: Start the Server

Now try starting the server again:
```powershell
cd server
npm run dev
```

## Common Issues

### Issue: "Service not found"
- PostgreSQL might not be installed
- Download from: https://www.postgresql.org/download/windows/
- During installation, remember the password you set for the `postgres` user

### Issue: "Connection refused"
- PostgreSQL service is not running (see Step 2)
- Firewall might be blocking port 5432
- Check if PostgreSQL is listening on port 5432: `netstat -an | findstr 5432`

### Issue: "Authentication failed"
- Wrong password in `.env` file
- Update `DATABASE_URL` in `server/.env` with correct password

### Issue: "Database does not exist"
- Run: `npm run setup` in the server directory
- Or manually create: `CREATE DATABASE bfar_db;`

## Default PostgreSQL Settings

- **Host:** localhost
- **Port:** 5432
- **Default User:** postgres
- **Default Database:** postgres (for initial connection)

## Quick Start Commands

```powershell
# 1. Start PostgreSQL service
Start-Service -Name "postgresql-x64-16"  # Adjust service name

# 2. Create .env file (if needed)
cd server
copy env.example .env
# Edit .env and update DATABASE_URL with your password

# 3. Setup database
npm run setup

# 4. Start server
npm run dev
```

