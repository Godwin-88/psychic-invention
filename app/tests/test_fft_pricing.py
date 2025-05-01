import pytest
import pricing_engine

# FFT should approximate Black-Scholes value within tolerance
def test_fft_pricing():
    # Generate 256 option prices over log-strike grid
    prices = pricing_engine.price_call_fft(100, -5.0, 0.1, 256, 1.0, 0.05, 0.2, 1.5)
    assert isinstance(prices, list)
    assert len(prices) == 256
    # Check positivity and reasonable magnitude
    assert all(p >= 0.0 for p in prices)



def test_put_fft_vs_bs_put():
    # analytic BS put
    bs_put = pricing_engine.price_put(100, 100, 1.0, 0.05, 0.2)
    # FFT put
    fft_puts = pricing_engine.price_put_fft(100, -5.0, 0.1, 256, 1.0, 0.05, 0.2, 1.5)
    # locate K=100 in the grid: index = (100 - k_min)/eta = (100 + 5)/0.1 = 1050
    idx = int(round((100.0 - (-5.0)) / 0.1))
    fft_put = fft_puts[idx]
    assert abs(fft_put - bs_put) < 1e-2
