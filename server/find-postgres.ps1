# Find PostgreSQL Installation and Service
Write-Host "=== Finding PostgreSQL 18 ===" -ForegroundColor Cyan
Write-Host ""

# Check for PostgreSQL 18 in Program Files
Write-Host "1. Checking Program Files..." -ForegroundColor Yellow
$pg18Path = "C:\Program Files\PostgreSQL\18"
if (Test-Path $pg18Path) {
    Write-Host "   ✓ Found PostgreSQL 18 at: $pg18Path" -ForegroundColor Green
    
    $pgCtl = "$pg18Path\bin\pg_ctl.exe"
    $dataDir = "$pg18Path\data"
    
    if (Test-Path $pgCtl) {
        Write-Host "   ✓ pg_ctl.exe found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ pg_ctl.exe not found" -ForegroundColor Red
    }
    
    if (Test-Path $dataDir) {
        Write-Host "   ✓ Data directory found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Data directory not found" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ PostgreSQL 18 not found in default location" -ForegroundColor Red
}

Write-Host ""

# Check for PostgreSQL in Program Files (x86)
Write-Host "2. Checking Program Files (x86)..." -ForegroundColor Yellow
$pg18Path86 = "C:\Program Files (x86)\PostgreSQL\18"
if (Test-Path $pg18Path86) {
    Write-Host "   ✓ Found PostgreSQL 18 at: $pg18Path86" -ForegroundColor Green
} else {
    Write-Host "   ✗ Not found" -ForegroundColor Red
}

Write-Host ""

# Check all PostgreSQL installations
Write-Host "3. Searching for all PostgreSQL installations..." -ForegroundColor Yellow
$allPg = Get-ChildItem "C:\Program Files" -Filter "*postgres*" -Directory -ErrorAction SilentlyContinue
if ($allPg) {
    foreach ($pg in $allPg) {
        Write-Host "   Found: $($pg.FullName)" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ✗ No PostgreSQL directories found" -ForegroundColor Red
}

Write-Host ""

# Check for PostgreSQL services
Write-Host "4. Checking Windows Services..." -ForegroundColor Yellow
$services = Get-Service | Where-Object { 
    $_.DisplayName -like "*postgres*" -or 
    $_.Name -like "*postgres*" -or
    $_.DisplayName -like "*PostgreSQL*" -or
    $_.Name -like "*PostgreSQL*"
}

if ($services) {
    Write-Host "   Found PostgreSQL services:" -ForegroundColor Green
    foreach ($svc in $services) {
        $statusColor = if ($svc.Status -eq "Running") { "Green" } else { "Yellow" }
        Write-Host "     Name: $($svc.Name)" -ForegroundColor Cyan
        Write-Host "     Display: $($svc.DisplayName)" -ForegroundColor Cyan
        Write-Host "     Status: $($svc.Status)" -ForegroundColor $statusColor
        Write-Host ""
    }
} else {
    Write-Host "   ✗ No PostgreSQL services found" -ForegroundColor Red
    Write-Host "   → PostgreSQL might not be installed as a Windows service" -ForegroundColor Yellow
}

Write-Host ""

# Check if PostgreSQL is already running
Write-Host "5. Checking if PostgreSQL is running..." -ForegroundColor Yellow
$portCheck = netstat -an | Select-String "5432"
if ($portCheck) {
    Write-Host "   ✓ PostgreSQL is listening on port 5432!" -ForegroundColor Green
    $portCheck | ForEach-Object { Write-Host "     $_" -ForegroundColor Cyan }
} else {
    Write-Host "   ✗ Port 5432 is not listening" -ForegroundColor Red
    Write-Host "   → PostgreSQL is not running" -ForegroundColor Yellow
}

Write-Host ""

# Provide instructions
Write-Host "=== Instructions ===" -ForegroundColor Cyan
if ($services) {
    $stoppedServices = $services | Where-Object { $_.Status -ne "Running" }
    if ($stoppedServices) {
        Write-Host ""
        Write-Host "To start PostgreSQL, run:" -ForegroundColor Yellow
        foreach ($svc in $stoppedServices) {
            Write-Host "  Start-Service -Name `"$($svc.Name)`"" -ForegroundColor White
        }
    } elseif ($services | Where-Object { $_.Status -eq "Running" }) {
        Write-Host ""
        Write-Host "✓ PostgreSQL service is already running!" -ForegroundColor Green
    }
}

if (Test-Path "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe") {
    Write-Host ""
    Write-Host "Or start PostgreSQL manually using:" -ForegroundColor Yellow
    Write-Host '  & "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data"' -ForegroundColor White
}

