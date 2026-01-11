@echo off
REM Build with Python 3.13 using ABI3 forward compatibility
echo.
echo 🔧 Building with Python 3.13 Forward Compatibility
echo =================================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment not found
    echo Please run: setup-python313.bat
    pause
    exit /b 1
)

REM Set the forward compatibility flag
echo [INFO] Setting PyO3 forward compatibility for Python 3.13...
set PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1

REM Clean previous build
echo [INFO] Cleaning previous build...
if exist "target" (
    rmdir /s /q target
)
if exist "Cargo.lock" (
    del Cargo.lock
)

REM Build with maturin using the compatibility flag
echo [INFO] Building Rust pricing engine with Python 3.13 compatibility...
echo [INFO] Using PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
maturin develop --release

if %errorlevel% neq 0 (
    echo [ERROR] Build failed even with compatibility flag
    echo [INFO] Creating Python fallback implementation...
    
    REM Create enhanced Python fallback
    python -c "
import math
from scipy.stats import norm
import numpy as np

# Enhanced mock pricing engine for Python 3.13
mock_code = '''# Enhanced mock pricing engine for Python 3.13
import math
from scipy.stats import norm
import numpy as np

def price_call(s, k, tau, r, sigma):
    \"\"\"Black-Scholes call option pricing\"\"\"
    if tau <= 0 or sigma <= 0:
        return max(s - k, 0)
    d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau))
    d2 = d1 - sigma*math.sqrt(tau)
    return s*norm.cdf(d1) - k*math.exp(-r*tau)*norm.cdf(d2)

def price_put(s, k, tau, r, sigma):
    \"\"\"Black-Scholes put option pricing\"\"\"
    if tau <= 0 or sigma <= 0:
        return max(k - s, 0)
    d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau))
    d2 = d1 - sigma*math.sqrt(tau)
    return k*math.exp(-r*tau)*norm.cdf(-d2) - s*norm.cdf(-d1)

# Enhanced FFT pricing (fallback to Black-Scholes)
def price_call_fft_optimized(s, k, tau, r, sigma):
    \"\"\"FFT pricing fallback to Black-Scholes\"\"\"
    return price_call(s, k, tau, r, sigma)

def price_put_fft_optimized(s, k, tau, r, sigma):
    \"\"\"FFT put pricing fallback to Black-Scholes\"\"\"
    return price_put(s, k, tau, r, sigma)

# Heston model (simplified fallback)
def price_call_heston(s, k, tau, r, v0, kappa, theta, sigma_v, rho):
    \"\"\"Heston model fallback to Black-Scholes with vol adjustment\"\"\"
    avg_vol = math.sqrt(v0)
    return price_call(s, k, tau, r, avg_vol)

def price_put_heston(s, k, tau, r, v0, kappa, theta, sigma_v, rho):
    \"\"\"Heston model fallback to Black-Scholes with vol adjustment\"\"\"
    avg_vol = math.sqrt(v0)
    return price_put(s, k, tau, r, avg_vol)

# Greeks calculations
def calculate_delta(s, k, tau, r, sigma, option_type=\"call\"):
    \"\"\"Calculate delta\"\"\"
    if tau <= 0 or sigma <= 0:
        return 1.0 if option_type == \"call\" and s > k else 0.0
    d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau))
    if option_type == \"call\":
        return norm.cdf(d1)
    else:
        return norm.cdf(d1) - 1.0

def calculate_gamma(s, k, tau, r, sigma):
    \"\"\"Calculate gamma\"\"\"
    if tau <= 0 or sigma <= 0:
        return 0.0
    d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau))
    return norm.pdf(d1) / (s * sigma * math.sqrt(tau))

def calculate_theta(s, k, tau, r, sigma, option_type=\"call\"):
    \"\"\"Calculate theta\"\"\"
    if tau <= 0 or sigma <= 0:
        return 0.0
    d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau))
    d2 = d1 - sigma*math.sqrt(tau)
    
    theta_common = -(s * norm.pdf(d1) * sigma) / (2 * math.sqrt(tau))
    
    if option_type == \"call\":
        return theta_common - r * k * math.exp(-r*tau) * norm.cdf(d2)
    else:
        return theta_common + r * k * math.exp(-r*tau) * norm.cdf(-d2)

def calculate_vega(s, k, tau, r, sigma):
    \"\"\"Calculate vega\"\"\"
    if tau <= 0 or sigma <= 0:
        return 0.0
    d1 = (math.log(s/k) + (r + 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau))
    return s * norm.pdf(d1) * math.sqrt(tau)

def calculate_rho(s, k, tau, r, sigma, option_type=\"call\"):
    \"\"\"Calculate rho\"\"\"
    if tau <= 0 or sigma <= 0:
        return 0.0
    d2 = (math.log(s/k) + (r - 0.5*sigma**2)*tau) / (sigma*math.sqrt(tau))
    
    if option_type == \"call\":
        return k * tau * math.exp(-r*tau) * norm.cdf(d2)
    else:
        return -k * tau * math.exp(-r*tau) * norm.cdf(-d2)

# Performance monitoring mock
class PerformanceMonitor:
    def __init__(self):
        self.call_count = 0
        
    def record_call(self, function_name, duration):
        self.call_count += 1
        
    def get_stats(self):
        return {\"total_calls\": self.call_count}

performance_monitor = PerformanceMonitor()
'''

with open('pricing_engine_mock.py', 'w') as f:
    f.write(mock_code)
print('[SUCCESS] Created enhanced Python fallback')
"
    
    echo [WARNING] Using Python-only implementation
    echo [INFO] API will work but without Rust performance optimizations
) else (
    echo [SUCCESS] Rust pricing engine built successfully with Python 3.13!
    echo [INFO] Using PyO3 ABI3 forward compatibility
)

echo.
echo ✅ Build completed!
echo.
echo Next steps:
echo 1. Test the API: start-api-only.bat
echo 2. Check health: curl http://127.0.0.1:8000/health
echo 3. View docs: http://127.0.0.1:8000/docs
echo.
pause