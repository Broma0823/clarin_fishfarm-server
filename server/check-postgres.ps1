# PostgreSQL Connection Check Script
Write-Host "=== PostgreSQL Connection Check ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
Write-Host "1. Checking if PostgreSQL is installed..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "   ✓ PostgreSQL found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ PostgreSQL not found in PATH" -ForegroundColor Red
    Write-Host "   → Install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check PostgreSQL services
Write-Host "2. Checking PostgreSQL services..." -ForegroundColor Yellow
$services = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
if ($services) {
    foreach ($service in $services) {
        $status = if ($service.Status -eq "Running") { "✓ Running" -ForegroundColor Green } else { "✗ Stopped" -ForegroundColor Red }
        Write-Host "   $($service.Name): $status" -ForegroundColor $(if ($service.Status -eq "Running") { "Green" } else { "Red" })
    }
} else {
    Write-Host "   ✗ No PostgreSQL services found" -ForegroundColor Red
    Write-Host "   → PostgreSQL might not be installed or service name is different" -ForegroundColor Yellow
}

Write-Host ""

# Check if port 5432 is listening
Write-Host "3. Checking if PostgreSQL is listening on port 5432..." -ForegroundColor Yellow
$portCheck = netstat -an | Select-String "5432"
if ($portCheck) {
    Write-Host "   ✓ Port 5432 is in use:" -ForegroundColor Green
    $portCheck | ForEach-Object { Write-Host "     $_" }
} else {
    Write-Host "   ✗ Port 5432 is not listening" -ForegroundColor Red
    Write-Host "   → PostgreSQL service is not running" -ForegroundColor Yellow
}

Write-Host ""

# Check .env file
Write-Host "4. Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ .env file exists" -ForegroundColor Green
    $envContent = Get-Content ".env" | Where-Object { $_ -match "DATABASE_URL" }
    if ($envContent) {
        $maskedUrl = $envContent -replace ":[^:@]+@", ":****@"
        Write-Host "   DATABASE_URL: $maskedUrl" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠ DATABASE_URL not found in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ .env file not found" -ForegroundColor Red
    Write-Host "   → Creating .env from env.example..." -ForegroundColor Yellow
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "   ✓ .env file created! Please update DATABASE_URL with your PostgreSQL password" -ForegroundColor Green
    } else {
        Write-Host "   ✗ env.example not found" -ForegroundColor Red
    }
}

Write-Host ""

# Try to connect to PostgreSQL
Write-Host "5. Testing database connection..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "postgres"  # Default password, user should update
    $result = psql -U postgres -h localhost -p 5432 -d postgres -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Successfully connected to PostgreSQL!" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Connection failed" -ForegroundColor Red
        Write-Host "   Error: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Could not test connection: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Recommendations ===" -ForegroundColor Cyan

# Check if any service is stopped
$stoppedServices = $services | Where-Object { $_.Status -ne "Running" }
if ($stoppedServices) {
    Write-Host ""
    Write-Host "To start PostgreSQL service, run (as Administrator):" -ForegroundColor Yellow
    foreach ($service in $stoppedServices) {
        Write-Host "  Start-Service -Name `"$($service.Name)`"" -ForegroundColor White
    }
}

if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Create .env file with your database credentials:" -ForegroundColor Yellow
    Write-Host "  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/bfar_db" -ForegroundColor White
}

Write-Host ""
Write-Host "After fixing issues, run:" -ForegroundColor Yellow
Write-Host "  npm run setup    # Setup database" -ForegroundColor White
Write-Host "  npm run migrate  # Run migrations" -ForegroundColor White
Write-Host "  npm run dev      # Start server" -ForegroundColor White

