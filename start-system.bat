@echo off
echo 🚀 Starting BFAR Database System...
echo.

REM Check if PostgreSQL is running
echo Step 1/3: Checking PostgreSQL...
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\18\data" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  PostgreSQL is not running
    echo    Attempting to start PostgreSQL service...
    net start postgresql-x64-18 >nul 2>&1
    if %errorlevel% neq 0 (
        echo    Could not start automatically. Please start manually:
        echo    1. Open Services (Win+R → services.msc)
        echo    2. Find PostgreSQL service and start it
        echo.
        pause
    ) else (
        echo ✅ PostgreSQL started
    )
) else (
    echo ✅ PostgreSQL is running
)
echo.

REM Start backend in new window
echo Step 2/3: Starting Backend Server...
start "BFAR Backend" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak >nul
echo ✅ Backend server starting...
echo.

REM Start frontend (this will block)
echo Step 3/3: Starting Frontend...
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🎉 System is starting!
echo.
echo    Backend:  http://localhost:4000
echo    Frontend: http://localhost:5173
echo.
echo    Press Ctrl+C to stop frontend server
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

npm run dev

