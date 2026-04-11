# Start PostgreSQL Service Script
Write-Host "=== Starting PostgreSQL ===" -ForegroundColor Cyan
Write-Host ""

# Try to find and start PostgreSQL service
$found = $false

# Common PostgreSQL service names
$serviceNames = @(
    "postgresql-x64-18",
    "postgresql-x64-17",
    "postgresql-x64-16",
    "postgresql-x64-15", 
    "postgresql-x64-14",
    "postgresql-x64-13",
    "postgresql-x64-12",
    "postgresql-x64-11",
    "PostgreSQL",
    "postgresql"
)

Write-Host "Searching for PostgreSQL services..." -ForegroundColor Yellow

foreach ($svcName in $serviceNames) {
    try {
        $service = Get-Service -Name $svcName -ErrorAction Stop
        Write-Host "Found service: $svcName" -ForegroundColor Green
        Write-Host "  Current Status: $($service.Status)" -ForegroundColor Cyan
        
        if ($service.Status -eq "Running") {
            Write-Host "  ✓ PostgreSQL is already running!" -ForegroundColor Green
            $found = $true
            break
        } else {
            Write-Host "  Starting service..." -ForegroundColor Yellow
            Start-Service -Name $svcName
            Start-Sleep -Seconds 2
            $service.Refresh()
            if ($service.Status -eq "Running") {
                Write-Host "  ✓ PostgreSQL started successfully!" -ForegroundColor Green
                $found = $true
                break
            } else {
                Write-Host "  ✗ Failed to start service" -ForegroundColor Red
            }
        }
    } catch {
        # Service not found, continue searching
    }
}

if (-not $found) {
    Write-Host ""
    Write-Host "Could not find PostgreSQL service automatically." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Trying alternative method: pg_ctl..." -ForegroundColor Yellow
    
    # Try to find pg_ctl and start PostgreSQL manually
    $pgVersions = @(18, 17, 16, 15, 14, 13, 12, 11)
    foreach ($version in $pgVersions) {
        $pgCtl = "C:\Program Files\PostgreSQL\$version\bin\pg_ctl.exe"
        if (Test-Path $pgCtl) {
            Write-Host "Found PostgreSQL $version at: $pgCtl" -ForegroundColor Green
            $dataDir = "C:\Program Files\PostgreSQL\$version\data"
            if (Test-Path $dataDir) {
                Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
                try {
                    & $pgCtl start -D $dataDir
                    Write-Host "✓ PostgreSQL started using pg_ctl!" -ForegroundColor Green
                    $found = $true
                    break
                } catch {
                    Write-Host "✗ Failed to start: $_" -ForegroundColor Red
                }
            }
        }
    }
}

if (-not $found) {
    Write-Host ""
    Write-Host "=== Manual Steps ===" -ForegroundColor Yellow
    Write-Host "1. Open Services (Win+R, type 'services.msc')" -ForegroundColor White
    Write-Host "2. Look for any service with 'PostgreSQL' in the name" -ForegroundColor White
    Write-Host "3. Right-click and select 'Start'" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this command as Administrator:" -ForegroundColor Yellow
    Write-Host "  Get-Service | Where-Object { `$_.DisplayName -like '*postgres*' } | Start-Service" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "=== Verifying Connection ===" -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    
    # Check if port 5432 is listening
    $portCheck = netstat -an | Select-String "5432"
    if ($portCheck) {
        Write-Host "✓ PostgreSQL is listening on port 5432" -ForegroundColor Green
    } else {
        Write-Host "⚠ Port 5432 not detected yet (may take a few seconds)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "You can now run: npm run dev" -ForegroundColor Green
}

