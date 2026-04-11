# Manual PostgreSQL Start Script
Write-Host "Starting PostgreSQL manually..." -ForegroundColor Cyan
Write-Host ""

$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$dataDir = "C:\Program Files\PostgreSQL\18\data"

if (-not (Test-Path $pgCtl)) {
    Write-Host "Error: pg_ctl.exe not found at $pgCtl" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $dataDir)) {
    Write-Host "Error: Data directory not found at $dataDir" -ForegroundColor Red
    exit 1
}

Write-Host "Checking PostgreSQL status..." -ForegroundColor Yellow
$status = & $pgCtl status -D $dataDir 2>&1

if ($status -match "server is running") {
    Write-Host "PostgreSQL is already running!" -ForegroundColor Green
    exit 0
}

Write-Host "PostgreSQL is not running. Attempting to start..." -ForegroundColor Yellow
Write-Host ""

# Try to start PostgreSQL
try {
    $process = Start-Process -FilePath $pgCtl -ArgumentList "start", "-D", "`"$dataDir`"", "-l", "`"$dataDir\server.log`"" -NoNewWindow -Wait -PassThru -ErrorAction Stop
    
    Start-Sleep -Seconds 3
    
    # Check if it started
    $status = & $pgCtl status -D $dataDir 2>&1
    if ($status -match "server is running") {
        Write-Host "PostgreSQL started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now start your website." -ForegroundColor Cyan
    } else {
        Write-Host "Failed to start PostgreSQL. Error:" -ForegroundColor Red
        Write-Host $status -ForegroundColor Red
        Write-Host ""
        Write-Host "Try running this script as Administrator, or start PostgreSQL via Services:" -ForegroundColor Yellow
        Write-Host "1. Press Win+R, type 'services.msc', press Enter" -ForegroundColor Gray
        Write-Host "2. Find PostgreSQL service and start it" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error starting PostgreSQL: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to run this script as Administrator." -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
}
