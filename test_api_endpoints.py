#!/usr/bin/env python3
"""
Test script for the enhanced API endpoints
"""
import requests
import json

# Test data
test_option = {
    "s": 100.0,
    "k": 100.0,
    "tau": 1.0,
    "r": 0.05,
    "sigma": 0.2
}

test_heston = {
    "s": 100.0,
    "k": 100.0,
    "tau": 1.0,
    "r": 0.05,
    "v0": 0.04,  # Initial variance (sigma^2 = 0.2^2)
    "theta": 0.04,  # Long-term variance
    "kappa": 2.0,  # Mean reversion speed
    "sigma_v": 0.3,  # Volatility of volatility
    "rho": -0.5  # Correlation
}

test_greeks = {
    "s": 100.0,
    "k": 100.0,
    "tau": 1.0,
    "r": 0.05,
    "sigma": 0.2,
    "model": "bs"
}

def test_endpoint(url, data, description):
    """Test a single endpoint"""
    print(f"\n=== Testing {description} ===")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

def test_get_endpoint(url, description):
    """Test a GET endpoint"""
    print(f"\n=== Testing {description} ===")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

def main():
    base_url = "http://localhost:8000"
    
    # Test basic endpoints
    test_get_endpoint(f"{base_url}/", "Root endpoint")
    test_get_endpoint(f"{base_url}/health", "Health check")
    
    # Test enhanced FFT endpoints
    test_endpoint(f"{base_url}/price/call/fft-optimized", test_option, "FFT Optimized Call Pricing")
    test_endpoint(f"{base_url}/price/put/fft-optimized", test_option, "FFT Optimized Put Pricing")
    
    # Test Heston endpoints
    test_endpoint(f"{base_url}/price/call/heston", test_heston, "Heston Call Pricing")
    test_endpoint(f"{base_url}/price/put/heston", test_heston, "Heston Put Pricing")
    
    # Test Greeks endpoints
    test_endpoint(f"{base_url}/greeks/call", test_greeks, "Black-Scholes Call Greeks")
    
    test_greeks_fft = test_greeks.copy()
    test_greeks_fft["model"] = "fft"
    test_endpoint(f"{base_url}/greeks/call", test_greeks_fft, "FFT Call Greeks")
    
    # Test Heston Greeks
    test_endpoint(f"{base_url}/greeks/call/heston", test_heston, "Heston Call Greeks")
    test_endpoint(f"{base_url}/greeks/put/heston", test_heston, "Heston Put Greeks")
    
    # Test Feller condition validation
    feller_data = {"kappa": 2.0, "theta": 0.04, "sigma_v": 0.3}
    test_endpoint(f"{base_url}/validate/feller", feller_data, "Feller Condition Validation")
    
    # Test model comparison
    test_endpoint(f"{base_url}/compare/models", test_option, "Model Comparison")

if __name__ == "__main__":
    print("Testing Enhanced Pricing Engine API Endpoints")
    print("=" * 50)
    main()