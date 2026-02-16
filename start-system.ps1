# BFAR Database System Startup Script
Write-Host "🚀 Starting BFAR Database System..." -ForegroundColor Cyan
Write-Host ""

# Function to check if PostgreSQL is running
function Test-PostgreSQL {
    $pgPath = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
    $dataDir = "C:\Program Files\PostgreSQL\18\data"
    
    if (Test-Path $pgPath) {
        $status = & $pgPath status -D $dataDir 2>&1
        if ($status -match "server is running") {
            return $true
        }
    }
    return $false
}

# Function to start PostgreSQL
function Start-PostgreSQL {
    Write-Host "📦 Starting PostgreSQL..." -ForegroundColor Yellow
    
    $pgPath = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
    $dataDir = "C:\Program Files\PostgreSQL\18\data"
    $logFile = "$dataDir\server.log"
    
    if (-not (Test-Path $pgPath)) {
        Write-Host "❌ PostgreSQL not found at expected location" -ForegroundColor Red
        return $false
    }
    
    # Try to start PostgreSQL
    try {
        # Check if already running
        if (Test-PostgreSQL) {
            Write-Host "✅ PostgreSQL is already running" -ForegroundColor Green
            return $true
        }
        
        # Try to start as service first
        $service = Get-Service | Where-Object { $_.DisplayName -like "*PostgreSQL*" -or $_.Name -like "*postgresql*" } | Select-Object -First 1
        if ($service) {
            Write-Host "   Attempting to start PostgreSQL service: $($service.Name)" -ForegroundColor Gray
            Start-Service -Name $service.Name -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            if (Test-PostgreSQL) {
                Write-Host "✅ PostgreSQL started successfully!" -ForegroundColor Green
                return $true
            }
        }
        
        # Try manual start (requires admin)
        Write-Host "   Attempting manual start..." -ForegroundColor Gray
        $process = Start-Process -FilePath $pgPath -ArgumentList "start", "-D", "`"$dataDir`"", "-l", "`"$logFile`"" -NoNewWindow -PassThru -Wait -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 3
        if (Test-PostgreSQL) {
            Write-Host "✅ PostgreSQL started successfully!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  Could not start PostgreSQL automatically" -ForegroundColor Yellow
            Write-Host "   Please start it manually:" -ForegroundColor Yellow
            Write-Host "   1. Open Services (Win+R → services.msc)" -ForegroundColor Gray
            Write-Host "   2. Find 'PostgreSQL' service" -ForegroundColor Gray
            Write-Host "   3. Right-click → Start" -ForegroundColor Gray
            Write-Host ""
            Write-Host "   Or run as Administrator:" -ForegroundColor Yellow
            Write-Host "   net start postgresql-x64-18" -ForegroundColor Gray
            return $false
        }
    } catch {
        Write-Host "⚠️  Error starting PostgreSQL: $_" -ForegroundColor Yellow
        return $false
    }
}

# Step 1: Start PostgreSQL
Write-Host "Step 1/3: Checking PostgreSQL..." -ForegroundColor Cyan
if (-not (Test-PostgreSQL)) {
    $pgStarted = Start-PostgreSQL
    if (-not $pgStarted) {
        Write-Host ""
        Write-Host "⚠️  PostgreSQL is not running. The backend will fail to connect." -ForegroundColor Yellow
        Write-Host "   Please start PostgreSQL manually and run this script again." -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            exit
        }
    }
} else {
    Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
}
Write-Host ""

# Step 2: Start Backend Server
Write-Host "Step 2/3: Starting Backend Server..." -ForegroundColor Cyan
Write-Host "   Backend will run on http://localhost:4000" -ForegroundColor Gray
Write-Host ""

$backendScript = @"
cd server
Write-Host '🔧 Starting backend server...' -ForegroundColor Yellow
npm run dev
"@

$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location server
    npm run dev
}

Write-Host "✅ Backend server starting in background..." -ForegroundColor Green
Write-Host ""

# Step 3: Start Frontend
Write-Host "Step 3/3: Starting Frontend..." -ForegroundColor Cyan
Write-Host "   Frontend will run on http://localhost:5173" -ForegroundColor Gray
Write-Host ""

# Wait a bit for backend to initialize
Start-Sleep -Seconds 3

# Start frontend (this will block)
Write-Host "✅ Starting frontend server..." -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 System is starting!" -ForegroundColor Green
Write-Host ""
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "   Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Start frontend (blocking)
npm run dev

# Cleanup on exit
Write-Host ""
Write-Host "🛑 Stopping servers..." -ForegroundColor Yellow
Stop-Job $backendJob -ErrorAction SilentlyContinue
Remove-Job $backendJob -ErrorAction SilentlyContinue

