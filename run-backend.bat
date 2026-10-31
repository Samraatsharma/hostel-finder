@echo off
REM ========================================
REM Start Backend Only (Hostel Finder)
REM ========================================

setlocal enabledelayedexpansion
cd /d "%~dp0backend"

echo.
echo ========================================
echo   Starting Backend Server
echo   (Spring Boot on port 8080)
echo ========================================
echo.

REM Detect MySQL on port 3306
netstat -ano | findstr ":3306" >nul 2>&1
if %errorlevel%==0 (
    echo [✓] Detected MySQL on port 3306. Starting with MySQL...
    call mvnw.cmd spring-boot:run
) else (
    echo [ℹ] MySQL not detected on port 3306.
    echo     Starting with embedded H2 database (in-memory demo mode)...
    call mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=h2
)

pause
