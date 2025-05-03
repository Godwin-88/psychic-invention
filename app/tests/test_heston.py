import math
import pytest
import pricing_engine

# Shared parameters
s, v0, r, kappa, theta, xi, rho, tau = 100.0, 0.04, 0.05, 2.0, 0.04, 0.5, -0.7, 1.0

def test_cf_heston_at_zero():
    # Characteristic function at u=0 must be 1+0j
    phi = pricing_engine.cf_heston(0.0, s, v0, r, kappa, theta, xi, rho, tau)
    assert isinstance(phi, complex)
    assert pytest.approx(1.0, rel=1e-12) == phi.real
    assert pytest.approx(0.0, abs=1e-12) == phi.imag

def test_price_heston_call_stub_zero():
    # Stub returns 0.0 for any inputs
    c = pricing_engine.price_heston_call(s, 100.0, v0, r, kappa, theta, xi, rho, tau)
    assert isinstance(c, float)
    assert c == pytest.approx(0.0, abs=0.0)

def test_price_heston_put_via_parity():
    # put = C - S + K*exp(-r*tau); with C=0 stub => -S + K*e^{-rτ}
    K = 95.0
    expected_put = -s + K * math.exp(-r * tau)
    p = pricing_engine.price_heston_put(s, K, v0, r, kappa, theta, xi, rho, tau)
    assert isinstance(p, float)
    assert p == pytest.approx(expected_put, rel=1e-12)
