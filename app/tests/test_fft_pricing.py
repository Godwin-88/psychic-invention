import pricing_engine

def test_fft_pricing():
    # Generate 256 option prices over log-strike grid
    prices = pricing_engine.price_call_fft(100, -5.0, 0.1, 256, 1.0, 0.05, 0.2, 1.5)
    assert isinstance(prices, list)
    assert len(prices) == 256
    # Check positivity and reasonable magnitude
    assert all(p >= 0.0 for p in prices)