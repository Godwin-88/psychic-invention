@echo off
REM Fix Python 3.13 build issues
echo.
echo 🔧 Fixing Python 3.13 Build Issues
echo ==================================
echo.

REM Clean Rust build artifacts
echo [INFO] Cleaning Rust build artifacts...
if exist "target" (
    rmdir /s /q target
    echo [SUCCESS] Cleaned target directory
)

REM Update Cargo.lock
echo [INFO] Updating Cargo.lock...
if exist "Cargo.lock" (
    del Cargo.lock
    echo [SUCCESS] Removed old Cargo.lock
)

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

REM Update Cargo dependencies
echo [INFO] Updating Cargo dependencies...
cargo update

REM Try building with maturin
echo [INFO] Building Rust pricing engine...
maturin develop --release

if %errorlevel% neq 0 (
    echo [ERROR] Build failed - using Python fallback
    echo [INFO] Creating enhanced Python fallback...
    
    REM Create the enhanced mock pricing engine
    python -c "
import math
from scipy.stats import norm
import numpy as np

# Create enhanced mock pricing engine
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
    # Use average volatility as approximation
    avg_vol = math.sqrt(v0)
    return price_call(s, k, tau, r, avg_vol)

def price_put_heston(s, k, tau, r, v0, kappa, theta, sigma_v, rho):
    \"\"\"Heston model fallback to Black-Scholes with vol adjustment\"\"\"
    # Use average volatility as approximation
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
print('Created enhanced mock pricing engine')
"
    
    echo [SUCCESS] Python fallback created
    echo [INFO] API will work with Python-only implementation
) else (
    echo [SUCCESS] Rust pricing engine built successfully!
)

echo.
echo ✅ Build fix completed!
echo.
echo Next steps:
echo 1. Test the API: start-api-only.bat
echo 2. Check health: curl http://127.0.0.1:8000/health
echo.
pause