@echo off
REM Windows Setup Fix Script for Pricing Engine
REM This script fixes common Windows setup issues

echo.
echo 🔧 Fixing Windows Setup Issues
echo ===============================
echo.

REM Check Python version
echo [INFO] Checking Python version...
python --version
echo.

REM Check if we're using Python 3.14 (problematic)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python version detected: %PYTHON_VERSION%

REM Check if version starts with 3.14
echo %PYTHON_VERSION% | findstr /B "3.14" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Python 3.14 detected - this version has compatibility issues
    echo [INFO] Recommended: Use Python 3.11 or 3.12 for best compatibility
    echo.
    echo Please install Python 3.11 or 3.12 from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Remove existing virtual environment
if exist "venv" (
    echo [INFO] Removing existing virtual environment...
    rmdir /s /q venv
)

REM Create new virtual environment
echo [INFO] Creating fresh virtual environment...
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip and setuptools
echo [INFO] Upgrading pip and setuptools...
python -m pip install --upgrade pip setuptools wheel

REM Install compatible numpy first
echo [INFO] Installing compatible numpy...
pip install "numpy>=1.21.0,<1.25.0" --no-cache-dir

REM Install other core dependencies one by one
echo [INFO] Installing core dependencies...
pip install fastapi==0.104.1 --no-cache-dir
pip install "uvicorn[standard]==0.24.0" --no-cache-dir
pip install pydantic==2.5.0 --no-cache-dir

REM Install maturin with specific version
echo [INFO] Installing maturin...
pip install "maturin>=1.0.0,<1.5.0" --no-cache-dir

REM Try to build Rust extension
echo [INFO] Attempting to build Rust extension...
maturin develop --release

if %errorlevel% neq 0 (
    echo [ERROR] Rust build failed. Trying alternative approach...
    echo [INFO] Installing mock pricing engine for testing...
    
    REM Create a simple mock if Rust build fails
    echo # Mock pricing engine for testing > pricing_engine.py
    echo def price_call(s, k, tau, r, sigma): >> pricing_engine.py
    echo     import math >> pricing_engine.py
    echo     d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau)) >> pricing_engine.py
    echo     d2 = d1 - sigma*math.sqrt(tau) >> pricing_engine.py
    echo     from scipy.stats import norm >> pricing_engine.py
    echo     return s*norm.cdf(d1) - k*math.exp(-r*tau)*norm.cdf(d2) >> pricing_engine.py
    
    pip install scipy --no-cache-dir
    
    echo [WARNING] Using Python-only mock implementation
    echo [INFO] The API will work but without Rust performance optimizations
)

echo.
echo [SUCCESS] Setup completed!
echo.
echo Next steps:
echo 1. Start only the Python API: uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
echo 2. Test the API: curl -X POST "http://127.0.0.1:8000/price/call/bs" -H "Content-Type: application/json" -d "{\"s\": 100, \"k\": 105, \"tau\": 0.25, \"r\": 0.05, \"sigma\": 0.2}"
echo.
pause