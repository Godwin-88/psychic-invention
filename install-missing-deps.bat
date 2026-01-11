@echo off
REM Install missing dependencies for Python 3.13
echo.
echo 🔧 Installing Missing Dependencies
echo =================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment not found
    pause
    exit /b 1
)

REM Install missing packages
echo [INFO] Installing psutil...
pip install psutil --no-cache-dir

echo [INFO] Installing other potentially missing packages...
pip install aiofiles --no-cache-dir
pip install python-dotenv --no-cache-dir
pip install pyyaml --no-cache-dir
pip install marshmallow --no-cache-dir
pip install cerberus --no-cache-dir

echo [SUCCESS] Dependencies installed!
echo.
echo Now try: start-api-only.bat
pause