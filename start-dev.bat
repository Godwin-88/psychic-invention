@echo off
REM Pricing Engine Development Startup Script (Windows)
REM This script starts both the backend API and frontend development servers

setlocal enabledelayedexpansion

echo.
echo 🚀 Starting Pricing Engine Development Environment
echo ==================================================
echo.

REM Function to check if Python 3.11 is available
where python3.11 >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.11
    echo [SUCCESS] Using Python 3.11
) else (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        py -3.11 --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py -3.11
            echo [SUCCESS] Using Python 3.11 via launcher
        ) else (
            echo [ERROR] Python 3.11 not found. Please run setup-python311.bat first
            pause
            exit /b 1
        )
    ) else (
        echo [ERROR] Python not found. Please install Python 3.11
        pause
        exit /b 1
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required but not installed
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is required but not installed
    pause
    exit /b 1
)

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust/Cargo is required but not installed
    pause
    exit /b 1
)

echo [SUCCESS] All prerequisites found
echo.

REM Check if ports are available
netstat -an | find "127.0.0.1:8000" >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Port 8000 is already in use. Please stop the service using this port.
    pause
    exit /b 1
)

netstat -an | find "127.0.0.1:3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Port 3000 is already in use. Please stop the service using this port.
    pause
    exit /b 1
)

echo [SUCCESS] Ports 8000 and 3000 are available
echo.

REM Setup Python virtual environment
echo [INFO] Setting up Python environment...

if not exist "venv" (
    echo [INFO] Creating Python virtual environment with Python 3.11...
    %PYTHON_CMD% -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat
echo [SUCCESS] Python virtual environment activated

REM Install Python dependencies
echo [INFO] Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Build Rust core
echo [INFO] Building Rust pricing engine...
maturin develop --release
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Rust pricing engine
    pause
    exit /b 1
)
echo [SUCCESS] Rust pricing engine built successfully

REM Setup frontend dependencies
echo [INFO] Setting up frontend dependencies...
cd frontend

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
)

echo [SUCCESS] Frontend dependencies ready
cd ..

REM Create batch files for starting services
echo [INFO] Creating service startup files...

REM Backend startup script
echo @echo off > start_backend.bat
echo call venv\Scripts\activate.bat >> start_backend.bat
echo echo [INFO] Starting backend API server on http://127.0.0.1:8000... >> start_backend.bat
echo uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 >> start_backend.bat

REM Frontend startup script
echo @echo off > start_frontend.bat
echo cd frontend >> start_frontend.bat
echo echo [INFO] Starting frontend development server on http://localhost:3000... >> start_frontend.bat
echo npm run dev -- --host 0.0.0.0 --port 3000 >> start_frontend.bat

echo [SUCCESS] Service startup files created

REM Start backend server in new window
echo [INFO] Starting backend API server...
start "Pricing Engine Backend" start_backend.bat

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend server in new window
echo [INFO] Starting frontend development server...
start "Pricing Engine Frontend" start_frontend.bat

REM Wait for services to start
echo [INFO] Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Test backend health
echo [INFO] Testing backend health...
curl -s http://127.0.0.1:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Backend API is responding
) else (
    echo [WARNING] Backend API may still be starting...
)

echo.
echo 🎉 Pricing Engine is now running!
echo ==================================
echo.
echo 📊 Backend API:     http://127.0.0.1:8000
echo 📋 API Docs:        http://127.0.0.1:8000/docs
echo 🌐 Frontend:        http://localhost:3000
echo ❤️  Health Check:    http://127.0.0.1:8000/health
echo.
echo 📈 Available Endpoints:
echo   • Black-Scholes:   POST /price/call/bs, /price/put/bs
echo   • Enhanced FFT:    POST /price/call/fft-optimized
echo   • Heston Model:    POST /price/call/heston
echo   • Greeks:          POST /greeks/call, /greeks/put
echo   • Market Data:     POST /market-data/spot
echo.
echo 🧪 Quick Test:
echo curl -X POST "http://127.0.0.1:8000/price/call/bs" ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"s\": 100, \"k\": 105, \"tau\": 0.25, \"r\": 0.05, \"sigma\": 0.2}"
echo.
echo Two new windows have opened:
echo   1. Backend API Server (port 8000)
echo   2. Frontend Development Server (port 3000)
echo.
echo Close those windows to stop the services.
echo.
pause

REM Cleanup temporary files
if exist start_backend.bat del start_backend.bat
if exist start_frontend.bat del start_frontend.bat

echo [INFO] Startup script completed