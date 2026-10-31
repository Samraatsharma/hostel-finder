@echo off
REM ========================================
REM Hostel Finder - IMPROVED Launcher
REM Starts Backend, Frontend, and opens Browser
REM with Better Error Handling
REM ========================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

color 0A
cls

echo.
echo =========================================
echo   HOSTEL FINDER - ONE-CLICK LAUNCHER
echo =========================================
echo.

REM Kill any existing Java processes on port 8080
echo [PREP] Cleaning up previous instances...
timeout /t 1 /nobreak >nul

netstat -ano | findstr ":8080" >nul 2>&1
if %errorlevel%==0 (
    echo        Found existing backend, stopping...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080"') do (
        taskkill /PID %%a /F /T >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo.
echo [1/4] Starting Backend Server (Spring Boot)...
echo        This may take 10-15 seconds...
echo.

cd /d "%~dp0backend"

if exist "mvnw.cmd" (
    netstat -ano | findstr ":3306" >nul 2>&1
    if %errorlevel%==0 (
        echo        [✓] MySQL detected on port 3306. Using MySQL database.
        start "Hostel Finder - BACKEND" cmd /c "mvnw.cmd spring-boot:run & pause"
    ) else (
        echo        [ℹ] MySQL not detected. Using embedded H2 database (in-memory).
        start "Hostel Finder - BACKEND" cmd /c "mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=h2 & pause"
    )
) else (
    echo [ERROR] Maven wrapper not found!
    pause
    exit /b 1
)

echo        Backend started in new terminal
echo        Waiting for startup...

REM Wait and check if backend is responding
set "maxWait=60"
set "waited=0"

:waitForBackend
if %waited% geq %maxWait% (
    echo [WARNING] Backend may not have started. Proceeding anyway...
    goto skipBackendCheck
)

REM Try to connect to backend
timeout /t 2 /nobreak >nul
set /a waited+=2

powershell -Command "try { $null = [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; $response = Invoke-WebRequest -Uri 'http://localhost:8080/api/public/cities' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

if %errorlevel%==0 (
    echo [✓] Backend is responding!
    goto skipBackendCheck
)

if %waited% lss 30 (
    echo.       Still waiting... (%waited%s)
    goto waitForBackend
)

:skipBackendCheck
echo.
echo [2/4] Starting Frontend Server (Port 3000)...

cd /d "%~dp0frontend"

REM Check Python
python --version >nul 2>&1
if %errorlevel%==0 (
    echo        Starting Python HTTP Server...
    start "Hostel Finder - FRONTEND" cmd /c "python -m http.server 3000 & pause"
) else (
    echo [ERROR] Python not found! Install from: https://python.org
    cd /d "%~dp0"
    pause
    exit /b 1
)

echo        Frontend server started
timeout /t 3 /nobreak >nul

echo.
echo [3/4] Testing Services...

REM Check if frontend is responding
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

if %errorlevel%==0 (
    echo        ✓ Frontend responding
) else (
    echo        ⚠ Frontend not responding yet (may still be starting)
)

echo.
echo [4/4] Opening Browser...
timeout /t 2 /nobreak >nul

start http://localhost:3000/pages/index.html

echo.
echo ==========================================
echo   SUCCESS!
echo ==========================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8080/api
echo.
echo   [ KEEP BOTH TERMINAL WINDOWS OPEN ]
echo.
echo   Login Test Accounts:
echo   • Admin:   admin@demo.com / Demo@123
echo   • Owner:   owner@demo.com / Demo@123
echo   • Student: student@demo.com / Demo@123
echo.
echo   If hostels don't show:
echo   1. Wait 5-10 seconds for backend
echo   2. Refresh browser (F5)
echo   3. Check backend terminal for errors
echo.
echo ==========================================
echo.
