"""
Regression tests for numerical bugs fixed in Phase 0.

- Heston P1 integrand used a real shift φ(u−1) instead of φ(u−i): prices were
  ~65% too low (3.56 vs 10.39 on the standard benchmark).
- Historical / Monte Carlo VaR took the α-quantile of losses instead of the
  (1−α)-quantile, returning a negative VaR (a gain).
- Multi-asset Kelly used log(maximum(...)), which is not DCP and always raised.
"""

import math

import numpy as np
import pytest
from scipy.stats import norm

from app.risk.var_engine import (
    compute_var_all_methods,
    var_historical,
    var_monte_carlo,
    var_parametric_normal,
)


def _bs_call(s, k, r, sigma, tau):
    d1 = (math.log(s / k) + (r + 0.5 * sigma**2) * tau) / (sigma * math.sqrt(tau))
    d2 = d1 - sigma * math.sqrt(tau)
    return s * norm.cdf(d1) - k * math.exp(-r * tau) * norm.cdf(d2)


# ── VaR / ES ──────────────────────────────────────────────────────────────────


@pytest.fixture
def normal_returns():
    rng = np.random.default_rng(42)
    return rng.normal(0.0005, 0.01, size=(20_000, 1))


def test_historical_var_is_positive_loss_and_matches_normal_quantile(normal_returns):
    res = var_historical(normal_returns, alpha=0.05)
    expected = -(0.0005 + 0.01 * norm.ppf(0.05))  # ≈ 0.01595
    assert res.var > 0
    assert res.var == pytest.approx(expected, rel=0.05)
    assert res.es > res.var


def test_monte_carlo_var_is_positive_and_close_to_parametric(normal_returns):
    np.random.seed(0)
    mc = var_monte_carlo(normal_returns, alpha=0.05, n_simulations=200_000)
    pn = var_parametric_normal(normal_returns, alpha=0.05)
    assert mc.var > 0 and mc.es > mc.var
    assert mc.var == pytest.approx(pn.var, rel=0.03)
    assert mc.es == pytest.approx(pn.es, rel=0.03)


def test_all_methods_agree_in_sign_and_magnitude(normal_returns):
    out = compute_var_all_methods(normal_returns, alpha=0.01, mc_simulations=50_000)
    vals = list(out["var"].values())
    assert all(v > 0 for v in vals)
    assert max(vals) / min(vals) < 1.25
    for m in out["methods"]:
        assert out["es"][m] >= out["var"][m]


def test_var_increases_with_confidence(normal_returns):
    v95 = var_historical(normal_returns, alpha=0.05).var
    v99 = var_historical(normal_returns, alpha=0.01).var
    assert v99 > v95


# ── Kelly ─────────────────────────────────────────────────────────────────────

cvxpy = pytest.importorskip("cvxpy")
from app.optimizer.kelly import kelly_multi_asset  # noqa: E402


def test_kelly_multi_asset_solves_and_respects_constraints():
    rng = np.random.default_rng(1)
    rets = rng.normal([0.001, 0.0005, 0.0002], [0.02, 0.015, 0.01], size=(500, 3))
    res = kelly_multi_asset(rets, fractional=1.0, long_only=True, max_leverage=1.0)
    assert np.all(res.weights >= -1e-9)
    assert res.weights.sum() <= 1.0 + 1e-6
    assert np.isfinite(res.expected_growth)


def test_kelly_single_asset_matches_continuous_approximation():
    # For small returns the growth-optimal fraction ≈ μ/σ². With a binary
    # outcome ±σ around μ the exact optimum is known in closed form.
    mu, sig = 0.01, 0.1
    rets = np.array([[mu + sig], [mu - sig]] * 500)
    res = kelly_multi_asset(rets, long_only=False, max_leverage=10.0)
    # maximize ½ln(1+f(μ+σ)) + ½ln(1+f(μ−σ)) ⇒ f* = μ / (σ² − μ²)
    f_star = mu / (sig**2 - mu**2)
    assert res.weights[0] == pytest.approx(f_star, rel=1e-3)


def test_fractional_kelly_scales_weights():
    rng = np.random.default_rng(2)
    rets = rng.normal([0.002, 0.001], [0.02, 0.02], size=(400, 2))
    full = kelly_multi_asset(rets, fractional=1.0, max_leverage=3.0)
    half = kelly_multi_asset(rets, fractional=0.5, max_leverage=3.0)
    np.testing.assert_allclose(half.weights, 0.5 * full.weights, atol=1e-6)


def test_kelly_allows_shorts_when_not_long_only():
    rng = np.random.default_rng(3)
    rets = rng.normal([0.002, -0.002], [0.02, 0.02], size=(1000, 2))
    res = kelly_multi_asset(rets, long_only=False, max_leverage=2.0)
    assert res.weights[1] < 0


# ── Heston (Rust engine) ──────────────────────────────────────────────────────

pricing_engine = pytest.importorskip("pricing_engine")


def test_heston_reference_value():
    c = pricing_engine.price_heston_call(100, 100, 0.04, 0.05, 2.0, 0.04, 0.3, -0.7, 1.0)
    assert c == pytest.approx(10.3942, abs=1e-3)


@pytest.mark.parametrize("k", [70.0, 90.0, 100.0, 110.0, 140.0])
def test_heston_reduces_to_black_scholes_when_vol_of_vol_vanishes(k):
    h = pricing_engine.price_heston_call(100, k, 0.04, 0.05, 2.0, 0.04, 0.01, 0.0, 1.0)
    assert h == pytest.approx(_bs_call(100, k, 0.05, 0.2, 1.0), abs=5e-3)


def test_heston_negative_rho_creates_downside_skew():
    # Negative spot-vol correlation ⇒ OTM puts richer / OTM calls cheaper than ρ=0.
    args = dict(s=100, v0=0.04, r=0.0, kappa=2.0, theta=0.04, xi=0.35, tau=1.0)
    otm_call_neg = pricing_engine.price_heston_call(
        args["s"], 120, args["v0"], args["r"], args["kappa"], args["theta"], args["xi"], -0.7, args["tau"]
    )
    otm_call_zero = pricing_engine.price_heston_call(
        args["s"], 120, args["v0"], args["r"], args["kappa"], args["theta"], args["xi"], 0.0, args["tau"]
    )
    assert otm_call_neg < otm_call_zero


# ── Greeks unit conventions (all methods must agree) ─────────────────────────


@pytest.mark.parametrize("kind", ["call", "put"])
def test_analytical_numerical_fft_greeks_share_units(kind):
    args = (100.0, 105.0, 0.75, 0.04, 0.25)
    a = getattr(pricing_engine, f"calculate_bs_{kind}_greeks")(*args)
    n = getattr(pricing_engine, f"calculate_numerical_{kind}_greeks")(*args)
    f = getattr(pricing_engine, f"calculate_fft_{kind}_greeks")(*args)
    for g in ("delta", "gamma", "theta", "vega", "rho"):
        assert getattr(n, g) == pytest.approx(getattr(a, g), rel=1e-4, abs=1e-6), g
        assert getattr(f, g) == pytest.approx(getattr(a, g), rel=2e-3, abs=1e-5), g


def test_vega_is_per_vol_point_and_theta_per_day():
    g = pricing_engine.calculate_bs_call_greeks(100, 100, 1.0, 0.05, 0.2)
    bump = pricing_engine.price_call(100, 100, 1.0, 0.05, 0.21) - pricing_engine.price_call(100, 100, 1.0, 0.05, 0.2)
    assert g.vega == pytest.approx(bump, rel=0.02)
    day = pricing_engine.price_call(100, 100, 1.0 - 1 / 365, 0.05, 0.2) - pricing_engine.price_call(100, 100, 1.0, 0.05, 0.2)
    assert g.theta == pytest.approx(day, rel=0.02)


def test_heston_vega_is_nonzero():
    g = pricing_engine.calculate_heston_call_greeks(100, 100, 1.0, 0.05, 0.04, 0.04, 2.0, 0.3, -0.7)
    assert g.vega > 0.05


# ── Dividends, American, Monte Carlo ──────────────────────────────────────────


def test_dividend_yield_matches_merton_and_parity():
    s, k, t, r, sig, q = 100, 95, 0.5, 0.04, 0.3, 0.025
    c = pricing_engine.price_call(s, k, t, r, sig, q)
    p = pricing_engine.price_put(s, k, t, r, sig, q)
    assert c - p == pytest.approx(s * math.exp(-q * t) - k * math.exp(-r * t), abs=1e-10)
    assert c == pytest.approx(_bs_call(s * math.exp(-q * t), k, r, sig, t), abs=1e-10)
    assert pricing_engine.price_call_fft_optimized(s, k, t, r, sig, q) == pytest.approx(c, abs=2e-4)
    g = pricing_engine.calculate_bs_call_greeks(s, k, t, r, sig, q)
    h = 1e-3
    fd = (pricing_engine.price_call(s + h, k, t, r, sig, q) - pricing_engine.price_call(s - h, k, t, r, sig, q)) / (2 * h)
    assert g.delta == pytest.approx(fd, rel=1e-6)


def test_american_put_benchmark_and_bounds():
    price, delta, gamma, premium = pricing_engine.price_american(36, 40, 1.0, 0.06, 0.2)
    assert price == pytest.approx(4.4867, abs=3e-4)
    assert premium > 0 and -1 < delta < 0 and gamma > 0
    eu_call = pricing_engine.price_call(100, 100, 1.0, 0.05, 0.2)
    am_call = pricing_engine.price_american(100, 100, 1.0, 0.05, 0.2, 0.0, True)[0]
    assert am_call == pytest.approx(eu_call, abs=1e-3)


def test_monte_carlo_is_seeded_and_within_confidence_interval():
    a = pricing_engine.price_mc_with_error(100, 100, 1.0, 0.05, 0.2, 200_000, True, 11)
    b = pricing_engine.price_mc_with_error(100, 100, 1.0, 0.05, 0.2, 200_000, True, 11)
    assert a == b
    bs = _bs_call(100, 100, 0.05, 0.2, 1.0)
    assert abs(a[0] - bs) < 4 * a[1]


def test_reference_engine_matches_rust():
    import pricing_engine_mock as ref

    cases = [
        ("price_call", (100, 90, 0.5, 0.03, 0.25, 0.01), 1e-8),
        ("price_put", (100, 110, 2.0, 0.03, 0.35, 0.02), 1e-8),
        ("price_heston_call", (100, 100, 0.04, 0.05, 2.0, 0.04, 0.3, -0.7, 1.0, 0.02), 1e-6),
    ]
    for fn, args, tol in cases:
        assert getattr(ref, fn)(*args) == pytest.approx(getattr(pricing_engine, fn)(*args), abs=tol), fn
    assert ref.price_american(36, 40, 1.0, 0.06, 0.2)[0] == pytest.approx(4.4867, abs=1e-3)
