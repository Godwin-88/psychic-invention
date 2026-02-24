"""
Mock implementation of pricing_engine for testing purposes
This allows us to test the property-based testing structure while the Rust module is being fixed
"""
import math
import cmath
from typing import NamedTuple

# Mock Greeks class to match Rust implementation
class Greeks:
    def __init__(self, delta, gamma, theta, vega, rho):
        self.delta = delta
        self.gamma = gamma
        self.theta = theta
        self.vega = vega
        self.rho = rho

def cf_heston(u, s, v0, r, kappa, theta, xi, rho, tau):
    """Mock Heston characteristic function"""
    if abs(u) < 1e-10:
        return complex(1.0, 0.0)
    # Simple mock implementation
    return complex(0.5, 0.1)

def price_heston_call(s, k, v0, r, kappa, theta, xi, rho, tau):
    """Mock Heston call pricing - returns a reasonable price for testing"""
    # Check Feller condition
    if 2.0 * kappa * theta <= xi * xi:
        raise ValueError("Feller condition violated: 2*kappa*theta <= xi^2")
    
    # Simple Black-Scholes approximation for testing
    sigma = math.sqrt(v0)  # Use initial variance as volatility approximation
    d1 = (math.log(s/k) + (r + 0.5*sigma*sigma)*tau) / (sigma*math.sqrt(tau))
    d2 = d1 - sigma*math.sqrt(tau)
    
    from scipy.stats import norm
    call_price = s * norm.cdf(d1) - k * math.exp(-r*tau) * norm.cdf(d2)
    return max(0.0, call_price)

def price_heston_put(s, k, v0, r, kappa, theta, xi, rho, tau):
    """Mock Heston put pricing using put-call parity"""
    call_price = price_heston_call(s, k, v0, r, kappa, theta, xi, rho, tau)
    put_price = call_price - s + k * math.exp(-r * tau)
    return max(0.0, put_price)

def validate_feller_condition_py(kappa, theta, xi):
    """Validate Feller condition"""
    return 2.0 * kappa * theta > xi * xi

# Enhanced FFT pricing functions (mock implementations)
def price_call_fft_optimized(s, k, tau, r, sigma):
    """Mock optimized FFT call pricing"""
    # Use Black-Scholes as approximation
    d1 = (math.log(s/k) + (r + 0.5*sigma*sigma)*tau) / (sigma*math.sqrt(tau))
    d2 = d1 - sigma*math.sqrt(tau)
    
    from scipy.stats import norm
    call_price = s * norm.cdf(d1) - k * math.exp(-r*tau) * norm.cdf(d2)
    return max(0.0, call_price)

def price_put_fft_optimized(s, k, tau, r, sigma):
    """Mock optimized FFT put pricing"""
    call_price = price_call_fft_optimized(s, k, tau, r, sigma)
    put_price = call_price - s + k * math.exp(-r * tau)
    return max(0.0, put_price)

def price_call_fft_enhanced(s, k, k_min, delta_v, delta_k, n, tau, r, sigma, alpha):
    """Mock enhanced FFT call pricing"""
    return price_call_fft_optimized(s, k, tau, r, sigma)

def price_put_fft_enhanced(s, k, k_min, delta_v, delta_k, n, tau, r, sigma, alpha):
    """Mock enhanced FFT put pricing"""
    return price_put_fft_optimized(s, k, tau, r, sigma)

# Greeks calculation functions
def calculate_bs_call_greeks(s, k, tau, r, sigma):
    """Mock Black-Scholes call Greeks calculation"""
    sqrt_tau = math.sqrt(tau)
    d1 = (math.log(s/k) + (r + 0.5*sigma*sigma)*tau) / (sigma*sqrt_tau)
    d2 = d1 - sigma*sqrt_tau
    
    from scipy.stats import norm
    n_d1 = norm.cdf(d1)
    n_d2 = norm.cdf(d2)
    phi_d1 = norm.pdf(d1)
    
    delta = n_d1
    gamma = phi_d1 / (s * sigma * sqrt_tau)
    theta = -(s * phi_d1 * sigma) / (2.0 * sqrt_tau) - r * k * math.exp(-r * tau) * n_d2
    vega = s * phi_d1 * sqrt_tau
    rho = k * tau * math.exp(-r * tau) * n_d2
    
    return Greeks(delta, gamma, theta, vega, rho)

def calculate_bs_put_greeks(s, k, tau, r, sigma):
    """Mock Black-Scholes put Greeks calculation"""
    sqrt_tau = math.sqrt(tau)
    d1 = (math.log(s/k) + (r + 0.5*sigma*sigma)*tau) / (sigma*sqrt_tau)
    d2 = d1 - sigma*sqrt_tau
    
    from scipy.stats import norm
    n_d1 = norm.cdf(d1)
    n_d2 = norm.cdf(d2)
    phi_d1 = norm.pdf(d1)
    
    delta = n_d1 - 1.0
    gamma = phi_d1 / (s * sigma * sqrt_tau)
    theta = -(s * phi_d1 * sigma) / (2.0 * sqrt_tau) + r * k * math.exp(-r * tau) * (1.0 - n_d2)
    vega = s * phi_d1 * sqrt_tau
    rho = -k * tau * math.exp(-r * tau) * (1.0 - n_d2)
    
    return Greeks(delta, gamma, theta, vega, rho)

def calculate_numerical_call_greeks(s, k, tau, r, sigma):
    """Mock numerical call Greeks calculation"""
    # Use analytical for simplicity in mock
    return calculate_bs_call_greeks(s, k, tau, r, sigma)

def calculate_numerical_put_greeks(s, k, tau, r, sigma):
    """Mock numerical put Greeks calculation"""
    # Use analytical for simplicity in mock
    return calculate_bs_put_greeks(s, k, tau, r, sigma)

def calculate_fft_call_greeks(s, k, tau, r, sigma):
    """Mock FFT call Greeks calculation"""
    # Use analytical for simplicity in mock
    return calculate_bs_call_greeks(s, k, tau, r, sigma)

def calculate_fft_put_greeks(s, k, tau, r, sigma):
    """Mock FFT put Greeks calculation"""
    # Use analytical for simplicity in mock
    return calculate_bs_put_greeks(s, k, tau, r, sigma)

def calculate_heston_call_greeks(s, k, tau, r, v0, theta, kappa, sigma_v, rho):
    """Mock Heston call Greeks calculation"""
    # Use Black-Scholes approximation with initial volatility
    sigma = math.sqrt(v0)
    return calculate_bs_call_greeks(s, k, tau, r, sigma)

def calculate_heston_put_greeks(s, k, tau, r, v0, theta, kappa, sigma_v, rho):
    """Mock Heston put Greeks calculation"""
    # Use Black-Scholes approximation with initial volatility
    sigma = math.sqrt(v0)
    return calculate_bs_put_greeks(s, k, tau, r, sigma)

# Existing functions (keeping for compatibility)
def price_call(s, k, tau, r, sigma):
    """Mock Black-Scholes call pricing"""
    d1 = (math.log(s/k) + (r + 0.5*sigma*sigma)*tau) / (sigma*math.sqrt(tau))
    d2 = d1 - sigma*math.sqrt(tau)
    
    from scipy.stats import norm
    call_price = s * norm.cdf(d1) - k * math.exp(-r*tau) * norm.cdf(d2)
    return max(0.0, call_price)

def price_put(s, k, tau, r, sigma):
    """Mock Black-Scholes put pricing"""
    call_price = price_call(s, k, tau, r, sigma)
    put_price = call_price - s + k * math.exp(-r * tau)
    return max(0.0, put_price)

def price_call_fft(s, k_min, delta_v, delta_k, n, tau, r, sigma, alpha):
    """Mock FFT call pricing"""
    # Return a list of prices for different strikes (simplified)
    k_center = math.exp(k_min + n * delta_k / 2)
    return [price_call(s, k_center, tau, r, sigma)]

def price_put_fft(s, k_min, delta_v, delta_k, n, tau, r, sigma, alpha):
    """Mock FFT put pricing"""
    # Return a list of prices for different strikes (simplified)
    k_center = math.exp(k_min + n * delta_k / 2)
    return [price_put(s, k_center, tau, r, sigma)]