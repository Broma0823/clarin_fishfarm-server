# How to Start PostgreSQL

PostgreSQL 18 is installed on your system, but it's not currently running. Here are several ways to start it:

## Method 1: Using pg_ctl (Manual Start)

Open PowerShell or Command Prompt and run:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data"
```

Or use the provided script:
```powershell
.\start-postgres-manual.ps1
```

## Method 2: Using Windows Services (Recommended)

1. Press `Win + R` to open Run dialog
2. Type `services.msc` and press Enter
3. Look for a service named something like:
   - `postgresql-x64-18`
   - `PostgreSQL 18`
   - `postgresql-x64-18 - PostgreSQL Server 18`
4. Right-click on it → **Start**

If you don't see a PostgreSQL service, PostgreSQL might not be installed as a Windows service. In that case, use Method 1 or Method 3.

## Method 3: Using Command Prompt (as Administrator)

1. Right-click on Command Prompt or PowerShell
2. Select **"Run as Administrator"**
3. Run one of these commands:

```cmd
net start postgresql-x64-18
```

Or try these common service names:
```cmd
net start postgresql-x64-18
net start "postgresql-x64-18 - PostgreSQL Server 18"
```

## Method 4: Check All PostgreSQL Services

To find the exact service name, run this in PowerShell:

```powershell
Get-Service | Where-Object { $_.DisplayName -like "*PostgreSQL*" -or $_.Name -like "*postgres*" } | Format-Table Name, DisplayName, Status
```

Then start it using:
```powershell
Start-Service -Name "SERVICE_NAME_HERE"
```

## Verify PostgreSQL is Running

After starting, verify it's running by checking port 5432:

```powershell
netstat -an | Select-String "5432"
```

Or check status:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\18\data"
```

## Quick Start Script

I've created a script `start-postgres-manual.ps1` in your project root. Run it:

```powershell
.\start-postgres-manual.ps1
```

## After Starting PostgreSQL

Once PostgreSQL is running, you can start your website:

1. **Start Backend:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   npm run dev
   ```

Or use the all-in-one script:
```powershell
.\start-system.ps1
```

## Troubleshooting

### "Access Denied" Error
- Run PowerShell/Command Prompt as Administrator
- Right-click → "Run as Administrator"

### "Service name is invalid"
- PostgreSQL might not be installed as a Windows service
- Use Method 1 (pg_ctl) instead

### PostgreSQL won't start
- Check the log file: `C:\Program Files\PostgreSQL\18\data\server.log`
- Make sure port 5432 is not already in use
- Verify the data directory exists: `C:\Program Files\PostgreSQL\18\data`
