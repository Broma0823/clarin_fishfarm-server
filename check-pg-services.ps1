# Quick PostgreSQL Service Check
Write-Host "Checking for PostgreSQL services..." -ForegroundColor Cyan
Write-Host ""

$services = Get-Service | Where-Object { 
    $_.DisplayName -like "*postgres*" -or 
    $_.Name -like "*postgres*" -or
    $_.DisplayName -like "*PostgreSQL*" -or
    $_.Name -like "*PostgreSQL*"
}

if ($services) {
    Write-Host "Found PostgreSQL services:" -ForegroundColor Green
    Write-Host ""
    foreach ($svc in $services) {
        $statusColor = if ($svc.Status -eq "Running") { "Green" } else { "Yellow" }
        Write-Host "  Service Name: $($svc.Name)" -ForegroundColor Cyan
        Write-Host "  Display Name: $($svc.DisplayName)" -ForegroundColor Cyan
        Write-Host "  Status: $($svc.Status)" -ForegroundColor $statusColor
        Write-Host ""
    }
    
    $stopped = $services | Where-Object { $_.Status -ne "Running" }
    if ($stopped) {
        Write-Host "To start PostgreSQL, run (as Administrator):" -ForegroundColor Yellow
        foreach ($svc in $stopped) {
            Write-Host "  Start-Service -Name `"$($svc.Name)`"" -ForegroundColor White
            Write-Host "  OR" -ForegroundColor Gray
            Write-Host "  net start `"$($svc.Name)`"" -ForegroundColor White
        }
    } else {
        Write-Host "All PostgreSQL services are running!" -ForegroundColor Green
    }
} else {
    Write-Host "No PostgreSQL services found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is not installed" -ForegroundColor Gray
    Write-Host "  2. PostgreSQL is not installed as a Windows service" -ForegroundColor Gray
    Write-Host "  3. Service name is different" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Check if PostgreSQL is installed at:" -ForegroundColor Yellow
    Write-Host "  C:\Program Files\PostgreSQL\" -ForegroundColor White
}

Write-Host ""
Write-Host "Checking if PostgreSQL is listening on port 5432..." -ForegroundColor Cyan
$portCheck = netstat -an | Select-String "5432"
if ($portCheck) {
    Write-Host "  PostgreSQL is listening on port 5432!" -ForegroundColor Green
} else {
    Write-Host "  Port 5432 is not in use - PostgreSQL is not running" -ForegroundColor Red
}
