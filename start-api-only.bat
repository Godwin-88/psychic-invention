@echo off
REM Simple API-only startup for Python 3.13
REM This script starts just the backend API server

echo.
echo 🚀 Starting Pricing Engine API (Python 3.13)
echo =============================================
echo.

REM Check for Python 3.13
where python3.13 >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.13
    echo [SUCCESS] Using Python 3.13
) else (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        py -3.13 --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py -3.13
            echo [SUCCESS] Using Python 3.13 via launcher
        ) else (
            echo [ERROR] Python 3.13 not found
            echo Please run: setup-python313.bat
            pause
            exit /b 1
        )
    ) else (
        echo [ERROR] Python not found
        pause
        exit /b 1
    )
)

REM Check if virtual environment exists
if not exist "venv" (
    echo [ERROR] Virtual environment not found
    echo Please run: setup-python313.bat
    pause
    exit /b 1
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if pricing engine is available
python -c "import pricing_engine; print('Rust engine available')" 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Rust pricing engine not available, using mock
    python -c "import pricing_engine_mock as pricing_engine" 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] No pricing engine available
        echo Please run: setup-python313.bat
        pause
        exit /b 1
    )
)

REM Start the API server
echo [INFO] Starting API server on http://127.0.0.1:8000...
echo [INFO] API Documentation: http://127.0.0.1:8000/docs
echo [INFO] Health Check: http://127.0.0.1:8000/health
echo.
echo Press Ctrl+C to stop the server
echo.

REM Set Python path to include the current directory
set PYTHONPATH=%CD%;%PYTHONPATH%

REM Start the API server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000