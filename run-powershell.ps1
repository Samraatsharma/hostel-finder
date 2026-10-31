# Hostel Finder - PowerShell Launcher
# More robust than batch files for Windows

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================"
Write-Host "  Hostel Finder Application Launcher" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Function to wait for port to open
function Wait-ForPort {
    param(
        [int]$Port,
        [int]$MaxWait = 60,
        [string]$ServiceName = "Service"
    )
    Write-Host "Waiting for $ServiceName to start on port $Port..."
    $elapsed = 0
    $interval = 2
    
    while ($elapsed -lt $MaxWait) {
        if (Test-Port -Port $Port) {
            Write-Host "✓ $ServiceName is ready!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        Write-Host "." -NoNewline
    }
    Write-Host ""
    Write-Host "⚠ Timeout waiting for $ServiceName" -ForegroundColor Yellow
    return $false
}

# Check backend not running
Write-Host "[1/4] Checking Backend Server..." -ForegroundColor Cyan
if (Test-Port -Port 8080) {
    Write-Host "      ✓ Backend already running on port 8080" -ForegroundColor Green
    $backendRunning = $true
} else {
    $backendRunning = $false
    Write-Host "      Starting Backend (Spring Boot)..." -ForegroundColor Yellow
    
    # Start backend in new window
    $backendPath = Join-Path $projectRoot "backend"
    $mvnArgs = "mvnw spring-boot:run"
    if (Test-Port -Port 3306) {
        Write-Host "      ✓ MySQL detected on port 3306. Using MySQL." -ForegroundColor Green
    } else {
        Write-Host "      ℹ MySQL not detected. Using embedded H2 database (in-memory)." -ForegroundColor Yellow
        $mvnArgs = "mvnw spring-boot:run -Dspring-boot.run.profiles=h2"
    }

    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k cd /d `"$backendPath`" && $mvnArgs" `
        -WindowStyle Normal `
        -PassThru
    
    # Wait for backend
    Wait-ForPort -Port 8080 -ServiceName "Backend" -MaxWait 60 | Out-Null
    
    if (-not (Test-Port -Port 8080)) {
        Write-Host "✗ Backend failed to start. Check the backend terminal for errors." -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""
Write-Host "[2/4] Checking Frontend Server..." -ForegroundColor Cyan

# Start frontend in new window
$frontendPath = Join-Path $projectRoot "frontend"
Write-Host "      Starting Frontend (HTTP Server on port 3000)..." -ForegroundColor Yellow

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k cd /d `"$frontendPath`" && python -m http.server 3000" `
    -WindowStyle Normal `
    -PassThru

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[3/4] Waiting for Services..." -ForegroundColor Cyan
Wait-ForPort -Port 3000 -ServiceName "Frontend" -MaxWait 30 | Out-Null

Write-Host ""
Write-Host "[4/4] Opening Browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

# Open browser
$url = "http://localhost:3000/pages/index.html"
Start-Process -FilePath $url

Write-Host ""
Write-Host "========================================"
Write-Host "  SUCCESS! App is Running!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8080/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📌 Keep both terminal windows open!" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Login Test Accounts:" -ForegroundColor Cyan
Write-Host "  • Admin:   admin@demo.com / Demo@123" -ForegroundColor Gray
Write-Host "  • Owner:   owner@demo.com / Demo@123" -ForegroundColor Gray
Write-Host "  • Student: student@demo.com / Demo@123" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================"
Write-Host ""

# Keep script running
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
