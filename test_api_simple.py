#!/usr/bin/env python3
"""
Simple test to verify API structure and imports
"""
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_basic_endpoints():
    """Test basic endpoints"""
    print("Testing basic endpoints...")
    
    # Test root
    response = client.get("/")
    print(f"Root endpoint: {response.status_code} - {response.json()}")
    
    # Test health
    response = client.get("/health")
    print(f"Health endpoint: {response.status_code} - {response.json()}")

def test_enhanced_fft_endpoints():
    """Test enhanced FFT endpoints"""
    print("\nTesting enhanced FFT endpoints...")
    
    test_data = {
        "s": 100.0,
        "k": 100.0,
        "tau": 1.0,
        "r": 0.05,
        "sigma": 0.2
    }
    
    # Test FFT optimized call
    response = client.post("/price/call/fft-optimized", json=test_data)
    print(f"FFT Optimized Call: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"  Price: {result.get('price')}, Model: {result.get('model')}")
    else:
        print(f"  Error: {response.text}")
    
    # Test FFT optimized put
    response = client.post("/price/put/fft-optimized", json=test_data)
    print(f"FFT Optimized Put: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"  Price: {result.get('price')}, Model: {result.get('model')}")

def test_heston_endpoints():
    """Test Heston model endpoints"""
    print("\nTesting Heston model endpoints...")
    
    test_data = {
        "s": 100.0,
        "k": 100.0,
        "tau": 1.0,
        "r": 0.05,
        "v0": 0.04,
        "theta": 0.04,
        "kappa": 2.0,
        "sigma_v": 0.3,
        "rho": -0.5
    }
    
    # Test Heston call
    response = client.post("/price/call/heston", json=test_data)
    print(f"Heston Call: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"  Price: {result.get('price')}, Model: {result.get('model')}")
        print(f"  Feller condition: {result.get('feller_condition_satisfied')}")
    else:
        print(f"  Error: {response.text}")

def test_greeks_endpoints():
    """Test Greeks calculation endpoints"""
    print("\nTesting Greeks calculation endpoints...")
    
    test_data = {
        "s": 100.0,
        "k": 100.0,
        "tau": 1.0,
        "r": 0.05,
        "sigma": 0.2,
        "model": "bs"
    }
    
    # Test BS call Greeks
    response = client.post("/greeks/call", json=test_data)
    print(f"BS Call Greeks: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        greeks = result.get('greeks', {})
        print(f"  Delta: {greeks.get('delta'):.4f}")
        print(f"  Gamma: {greeks.get('gamma'):.4f}")
        print(f"  Theta: {greeks.get('theta'):.4f}")
        print(f"  Vega: {greeks.get('vega'):.4f}")
        print(f"  Rho: {greeks.get('rho'):.4f}")

def test_utility_endpoints():
    """Test utility endpoints"""
    print("\nTesting utility endpoints...")
    
    # Test Feller condition validation
    response = client.post("/validate/feller", params={"kappa": 2.0, "theta": 0.04, "sigma_v": 0.3})
    print(f"Feller validation: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"  Valid: {result.get('feller_condition_satisfied')}")
        print(f"  Condition value: {result.get('condition_value'):.4f}")
        print(f"  Threshold: {result.get('threshold'):.4f}")

def main():
    print("Testing Enhanced Pricing Engine API")
    print("=" * 40)
    
    test_basic_endpoints()
    test_enhanced_fft_endpoints()
    test_heston_endpoints()
    test_greeks_endpoints()
    test_utility_endpoints()
    
    print("\n" + "=" * 40)
    print("API testing completed!")

if __name__ == "__main__":
    main()