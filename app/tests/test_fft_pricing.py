import math
import pytest
import pricing_engine

# Shared parameters
s, tau, r, sigma, alpha = 100.0, 1.0, 0.05, 0.2, 1.5
k_min, eta, n = 0.0, 0.5, 512  # now includes K=100 at index 200

def test_call_fft_vs_bs_call():
    bs_call = pricing_engine.price_call(s, 100, tau, r, sigma)
    fft_calls = pricing_engine.price_call_fft(s, k_min, eta, n, tau, r, sigma, alpha)
    idx = int((100.0 - k_min) / eta)
    fft_call = fft_calls[idx]
    assert abs(fft_call - bs_call) < 1e-2, f"FFT call {fft_call} vs BS {bs_call}"

def test_put_fft_vs_bs_put():
    bs_put = pricing_engine.price_put(s, 100, tau, r, sigma)
    fft_puts = pricing_engine.price_put_fft(s, k_min, eta, n, tau, r, sigma, alpha)
    idx = int((100.0 - k_min) / eta)
    fft_put = fft_puts[idx]
    assert abs(fft_put - bs_put) < 1e-2, f"FFT put {fft_put} vs BS {bs_put}"
