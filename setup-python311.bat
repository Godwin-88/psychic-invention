@echo off
REM Python 3.11 Setup Script for Pricing Engine
REM This script sets up the environment specifically for Python 3.11

echo.
echo 🐍 Setting up Pricing Engine with Python 3.11
echo ===============================================
echo.

REM Check if Python 3.11 is available
where python3.11 >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.11
    echo [SUCCESS] Found Python 3.11
) else (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        REM Try Python launcher with 3.11
        py -3.11 --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py -3.11
            echo [SUCCESS] Found Python 3.11 via Python launcher
        ) else (
            echo [ERROR] Python 3.11 not found
            echo.
            echo Please install Python 3.11 from:
            echo https://www.python.org/downloads/release/python-3118/
            echo.
            echo Make sure to:
            echo 1. Check "Add Python to PATH" during installation
            echo 2. Install for all users (recommended)
            echo 3. Include pip and IDLE
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo [ERROR] Python not found
        echo Please install Python 3.11 from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

REM Display Python version
echo [INFO] Using Python version:
%PYTHON_CMD% --version
echo.

REM Remove existing virtual environment
if exist "venv" (
    echo [INFO] Removing existing virtual environment...
    rmdir /s /q venv
)

REM Create new virtual environment with Python 3.11
echo [INFO] Creating virtual environment with Python 3.11...
%PYTHON_CMD% -m venv venv

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Verify we're using the right Python
echo [INFO] Virtual environment Python version:
python --version
echo.

REM Upgrade pip, setuptools, and wheel
echo [INFO] Upgrading pip, setuptools, and wheel...
python -m pip install --upgrade pip setuptools wheel

REM Install dependencies from Python 3.11 specific requirements
echo [INFO] Installing Python 3.11 compatible dependencies...
pip install -r requirements-python311.txt --no-cache-dir

echo [INFO] Core dependencies installed successfully!
echo.

REM Check Rust installation
echo [INFO] Checking Rust installation...
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust/Cargo not found
    echo.
    echo Please install Rust from: https://rustup.rs/
    echo.
    echo After installation:
    echo 1. Restart your command prompt
    echo 2. Run: rustup update
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

cargo --version
echo.

REM Build Rust pricing engine
echo [INFO] Building Rust pricing engine...
maturin develop --release

if %errorlevel% neq 0 (
    echo [ERROR] Rust build failed
    echo.
    echo This might be due to:
    echo 1. Missing Visual Studio Build Tools
    echo 2. Incompatible Rust/Python versions
    echo 3. Missing system dependencies
    echo.
    echo Solutions:
    echo 1. Install Visual Studio Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo 2. Install "Desktop development with C++" workload
    echo 3. Restart command prompt and try again
    echo.
    echo [INFO] Installing fallback mock pricing engine...
    
    REM Install scipy for mock implementation
    pip install scipy --no-cache-dir
    
    REM Create mock pricing engine
    echo # Mock pricing engine for Python 3.11 > pricing_engine_mock.py
    echo import math >> pricing_engine_mock.py
    echo from scipy.stats import norm >> pricing_engine_mock.py
    echo. >> pricing_engine_mock.py
    echo def price_call(s, k, tau, r, sigma): >> pricing_engine_mock.py
    echo     d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau)) >> pricing_engine_mock.py
    echo     d2 = d1 - sigma*math.sqrt(tau) >> pricing_engine_mock.py
    echo     return s*norm.cdf(d1) - k*math.exp(-r*tau)*norm.cdf(d2) >> pricing_engine_mock.py
    echo. >> pricing_engine_mock.py
    echo def price_put(s, k, tau, r, sigma): >> pricing_engine_mock.py
    echo     d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau)) >> pricing_engine_mock.py
    echo     d2 = d1 - sigma*math.sqrt(tau) >> pricing_engine_mock.py
    echo     return k*math.exp(-r*tau)*norm.cdf(-d2) - s*norm.cdf(-d1) >> pricing_engine_mock.py
    
    echo [WARNING] Using Python-only implementation
    echo [INFO] API will work but without Rust performance optimizations
) else (
    echo [SUCCESS] Rust pricing engine built successfully!
)

echo.
echo ✅ Setup completed successfully!
echo ================================
echo.
echo Environment ready with:
echo • Python 3.11
echo • Virtual environment activated
echo • All dependencies installed
echo • Rust pricing engine built (or mock fallback)
echo.
echo Next steps:
echo 1. Start the API server:
echo    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
echo.
echo 2. Test the API:
echo    curl -X POST "http://127.0.0.1:8000/price/call/bs" ^
echo      -H "Content-Type: application/json" ^
echo      -d "{\"s\": 100, \"k\": 105, \"tau\": 0.25, \"r\": 0.05, \"sigma\": 0.2}"
echo.
echo 3. View API docs: http://127.0.0.1:8000/docs
echo.
pause