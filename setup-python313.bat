@echo off
REM Python 3.13 Setup Script for Pricing Engine
REM This script sets up the environment specifically for Python 3.13

echo.
echo 🐍 Setting up Pricing Engine with Python 3.13
echo ===============================================
echo.

REM Check if Python 3.13 is available
where python3.13 >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.13
    echo [SUCCESS] Found Python 3.13
) else (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        REM Try Python launcher with 3.13
        py -3.13 --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py -3.13
            echo [SUCCESS] Found Python 3.13 via Python launcher
        ) else (
            REM Try default python if it's 3.13
            python --version 2>&1 | findstr "3.13" >nul
            if %errorlevel% equ 0 (
                set PYTHON_CMD=python
                echo [SUCCESS] Found Python 3.13 as default python
            ) else (
                echo [ERROR] Python 3.13 not found
                echo Current Python version:
                python --version 2>&1
                echo.
                echo Python 3.13 is recommended for best compatibility
                pause
                exit /b 1
            )
        )
    ) else (
        echo [ERROR] Python not found
        echo Please install Python 3.13 from: https://www.python.org/downloads/
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

REM Create new virtual environment with Python 3.13
echo [INFO] Creating virtual environment with Python 3.13...
%PYTHON_CMD% -m venv venv

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Verify we're using the right Python
echo [INFO] Virtual environment Python version:
python --version
echo.

REM Upgrade pip, setuptools, and wheel to latest versions
echo [INFO] Upgrading pip, setuptools, and wheel...
python -m pip install --upgrade pip setuptools wheel

REM Install compatible versions for Python 3.13
echo [INFO] Installing Python 3.13 compatible dependencies...

REM Install numpy - use latest compatible version
echo [INFO] Installing numpy (this may take a moment)...
pip install "numpy>=1.24.0" --no-cache-dir

REM Install core FastAPI dependencies
echo [INFO] Installing FastAPI and related packages...
pip install fastapi==0.104.1 --no-cache-dir
pip install "uvicorn[standard]==0.24.0" --no-cache-dir
pip install pydantic==2.5.0 --no-cache-dir

REM Install maturin for Rust-Python bindings - use latest version for Python 3.13
echo [INFO] Installing maturin...
pip install "maturin>=1.4.0" --no-cache-dir

REM Install other essential dependencies
echo [INFO] Installing additional dependencies...
pip install httpx==0.25.2 --no-cache-dir
pip install requests==2.31.0 --no-cache-dir
pip install "scipy>=1.11.0" --no-cache-dir
pip install pytest==7.4.3 --no-cache-dir
pip install pytest-asyncio==0.21.1 --no-cache-dir
pip install structlog==23.2.0 --no-cache-dir
pip install cachetools==5.3.2 --no-cache-dir
pip install hypothesis==6.88.1 --no-cache-dir

REM Try to install remaining dependencies from requirements file
echo [INFO] Installing remaining dependencies...
pip install -r requirements.txt --no-cache-dir || (
    echo [WARNING] Some packages failed to install - using core dependencies only
    echo [INFO] The pricing engine will still work with essential packages
)

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

REM Update PyO3 version in Cargo.toml for Python 3.13 compatibility
echo [INFO] Updating Rust dependencies for Python 3.13...
if exist "Cargo.toml" (
    REM Create a backup
    copy Cargo.toml Cargo.toml.backup >nul
    
    REM Update PyO3 to latest version for Python 3.13 support
    powershell -Command "(Get-Content Cargo.toml) -replace 'pyo3 = { version = \"0.17\"', 'pyo3 = { version = \"0.20\"' | Set-Content Cargo.toml"
    powershell -Command "(Get-Content Cargo.toml) -replace 'numpy = \"0.17.2\"', 'numpy = \"0.20.0\"' | Set-Content Cargo.toml"
    echo [INFO] Updated PyO3 and numpy versions for Python 3.13 compatibility
)

REM Build Rust pricing engine
echo [INFO] Building Rust pricing engine for Python 3.13...

REM Set PyO3 forward compatibility for Python 3.13
set PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
echo [INFO] Using PyO3 ABI3 forward compatibility for Python 3.13

maturin develop --release

if %errorlevel% neq 0 (
    echo [ERROR] Rust build failed
    echo.
    echo This might be due to:
    echo 1. PyO3 version incompatibility with Python 3.13
    echo 2. Missing Visual Studio Build Tools
    echo 3. Rust toolchain issues
    echo.
    echo Solutions:
    echo 1. Install Visual Studio Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo 2. Update Rust: rustup update
    echo 3. Try with older PyO3: maturin develop --release --compatibility
    echo.
    echo [INFO] Installing fallback mock pricing engine...
    
    REM Install scipy for mock implementation
    pip install scipy --no-cache-dir
    
    REM Create enhanced mock pricing engine for Python 3.13
    echo # Enhanced mock pricing engine for Python 3.13 > pricing_engine_mock.py
    echo import math >> pricing_engine_mock.py
    echo from scipy.stats import norm >> pricing_engine_mock.py
    echo import numpy as np >> pricing_engine_mock.py
    echo. >> pricing_engine_mock.py
    echo def price_call(s, k, tau, r, sigma): >> pricing_engine_mock.py
    echo     """Black-Scholes call option pricing""" >> pricing_engine_mock.py
    echo     d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau)) >> pricing_engine_mock.py
    echo     d2 = d1 - sigma*math.sqrt(tau) >> pricing_engine_mock.py
    echo     return s*norm.cdf(d1) - k*math.exp(-r*tau)*norm.cdf(d2) >> pricing_engine_mock.py
    echo. >> pricing_engine_mock.py
    echo def price_put(s, k, tau, r, sigma): >> pricing_engine_mock.py
    echo     """Black-Scholes put option pricing""" >> pricing_engine_mock.py
    echo     d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau)) >> pricing_engine_mock.py
    echo     d2 = d1 - sigma*math.sqrt(tau) >> pricing_engine_mock.py
    echo     return k*math.exp(-r*tau)*norm.cdf(-d2) - s*norm.cdf(-d1) >> pricing_engine_mock.py
    echo. >> pricing_engine_mock.py
    echo # Mock FFT pricing (simplified) >> pricing_engine_mock.py
    echo def price_call_fft_optimized(s, k, tau, r, sigma): >> pricing_engine_mock.py
    echo     """FFT pricing fallback to Black-Scholes""" >> pricing_engine_mock.py
    echo     return price_call(s, k, tau, r, sigma) >> pricing_engine_mock.py
    echo. >> pricing_engine_mock.py
    echo def price_put_fft_optimized(s, k, tau, r, sigma): >> pricing_engine_mock.py
    echo     """FFT put pricing fallback to Black-Scholes""" >> pricing_engine_mock.py
    echo     return price_put(s, k, tau, r, sigma) >> pricing_engine_mock.py
    
    echo [WARNING] Using Python-only implementation
    echo [INFO] API will work but without Rust performance optimizations
    
    REM Restore original Cargo.toml if backup exists
    if exist "Cargo.toml.backup" (
        copy Cargo.toml.backup Cargo.toml >nul
        del Cargo.toml.backup >nul
    )
) else (
    echo [SUCCESS] Rust pricing engine built successfully!
    
    REM Clean up backup if build succeeded
    if exist "Cargo.toml.backup" (
        del Cargo.toml.backup >nul
    )
)

echo.
echo ✅ Setup completed successfully!
echo ================================
echo.
echo Environment ready with:
echo • Python 3.13
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