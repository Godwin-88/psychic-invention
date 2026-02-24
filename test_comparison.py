#!/usr/bin/env python3
"""
Test the model comparison endpoint
"""
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_model_comparison():
    """Test model comparison endpoint"""
    print("Testing model comparison endpoint...")
    
    test_data = {
        "s": 100.0,
        "k": 100.0,
        "tau": 1.0,
        "r": 0.05,
        "sigma": 0.2
    }
    
    response = client.post("/compare/models", json=test_data)
    print(f"Model Comparison: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Parameters: {result.get('parameters')}")
        
        results = result.get('results', {})
        for model, prices in results.items():
            print(f"\n{model.upper()}:")
            if 'error' in prices:
                print(f"  Error: {prices['error']}")
            else:
                print(f"  Call: {prices.get('call'):.6f}")
                print(f"  Put: {prices.get('put'):.6f}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_model_comparison()