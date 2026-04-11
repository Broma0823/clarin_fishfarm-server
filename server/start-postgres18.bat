@echo off
echo Starting PostgreSQL 18...
echo.

REM Try to start PostgreSQL 18 service
sc start postgresql-x64-18
if %errorlevel% equ 0 (
    echo PostgreSQL service started successfully!
    goto :check
)

REM Try alternative service names
sc start PostgreSQL
if %errorlevel% equ 0 (
    echo PostgreSQL service started successfully!
    goto :check
)

REM Try using pg_ctl if service doesn't exist
if exist "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" (
    echo Starting PostgreSQL using pg_ctl...
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data"
    if %errorlevel% equ 0 (
        echo PostgreSQL started successfully using pg_ctl!
        goto :check
    )
)

echo.
echo Could not start PostgreSQL automatically.
echo Please start it manually:
echo   1. Open Services (Win+R, type services.msc)
echo   2. Find PostgreSQL service
echo   3. Right-click and select Start
goto :end

:check
echo.
echo Checking if PostgreSQL is running...
timeout /t 2 /nobreak >nul
netstat -an | findstr "5432"
if %errorlevel% equ 0 (
    echo PostgreSQL is listening on port 5432!
) else (
    echo PostgreSQL may still be starting up...
)

:end
echo.
pause

