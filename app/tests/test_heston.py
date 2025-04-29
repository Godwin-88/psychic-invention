import pytest
import pricing_engine
from numpy import isclose

# Test CF at u=0 should be 1+0j per definition of characteristic function ([blog.quantinsti.com](https://blog.quantinsti.com/heston-model/?utm_source=chatgpt.com))

def test_cf_zero_returns_one():
    phi = pricing_engine.cf_heston(
        0.0,       # u=0
        100.0,     # S
        0.04,      # v0
        0.05,      # r
        2.0,       # kappa
        0.04,      # theta
        0.5,       # xi
        -0.7,      # rho
        1.0        # tau
    )
    assert isclose(phi.real, 1.0, atol=1e-8)
    assert isclose(phi.imag, 0.0, atol=1e-8)