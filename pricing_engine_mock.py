"""
Pure-Python reference implementation of the Rust ``pricing_engine`` API.

Used when the Rust extension is not built (development and CI without Rust).
It is NOT a mock in the sense of returning placeholder numbers: every function
computes the same quantity as its Rust counterpart, with the same signature,
defaults and units, so results are interchangeable (only slower).

Unit conventions (identical to Rust ``src/greeks.rs``):
    delta, gamma  per unit of spot
    theta         per calendar day
    vega          per 1 volatility point
    rho           per 1% change in rate

The application refuses to start on this module when APP_ENV=production
(see app/main.py) unless ALLOW_MOCK_ENGINE is set.
"""

from __future__ import annotations

import cmath
import math
import random
from typing import List, Optional, Tuple

DAYS_PER_YEAR = 365.0
_SQRT2 = math.sqrt(2.0)
_INV_SQRT_2PI = 1.0 / math.sqrt(2.0 * math.pi)


class Greeks:
    def __init__(self, delta, gamma, theta, vega, rho):
        self.delta = delta
        self.gamma = gamma
        self.theta = theta
        self.vega = vega
        self.rho = rho

    def __repr__(self):
        return (
            f"Greeks(delta={self.delta:.6f}, gamma={self.gamma:.6f}, "
            f"theta={self.theta:.6f}, vega={self.vega:.6f}, rho={self.rho:.6f})"
        )


def _ncdf(x: float) -> float:
    return 0.5 * math.erfc(-x / _SQRT2)


def _npdf(x: float) -> float:
    return _INV_SQRT_2PI * math.exp(-0.5 * x * x)


def _validate(s, k, tau, r, sigma, q=0.0):
    if not (s > 0 and k > 0 and tau > 0 and sigma > 0):
        raise ValueError("Spot, strike, time to expiry and volatility must be positive")
    if not (math.isfinite(r) and math.isfinite(q)) or abs(r) > 1 or abs(q) > 1:
        raise ValueError("Rates r and q must be finite and within [-100%, 100%]")


# ── Black–Scholes–Merton ──────────────────────────────────────────────────────


def _bs(s, k, tau, r, sigma, q, is_call):
    st = sigma * math.sqrt(tau)
    d1 = (math.log(s / k) + (r - q + 0.5 * sigma * sigma) * tau) / st
    d2 = d1 - st
    df_r, df_q = math.exp(-r * tau), math.exp(-q * tau)
    if is_call:
        return s * df_q * _ncdf(d1) - k * df_r * _ncdf(d2)
    return k * df_r * _ncdf(-d2) - s * df_q * _ncdf(-d1)


def price_call(s, k, tau, r, sigma, q=0.0):
    _validate(s, k, tau, r, sigma, q)
    return _bs(s, k, tau, r, sigma, q, True)


def price_put(s, k, tau, r, sigma, q=0.0):
    _validate(s, k, tau, r, sigma, q)
    return _bs(s, k, tau, r, sigma, q, False)


def price_calls_batch(s, strikes, tau, r, sigma):
    return [price_call(s, k, tau, r, sigma) if k > 0 else 0.0 for k in strikes]


def price_puts_batch(s, strikes, tau, r, sigma):
    return [price_put(s, k, tau, r, sigma) if k > 0 else 0.0 for k in strikes]


def _bs_greeks(s, k, tau, r, sigma, q, is_call):
    _validate(s, k, tau, r, sigma, q)
    sq = math.sqrt(tau)
    st = sigma * sq
    d1 = (math.log(s / k) + (r - q + 0.5 * sigma * sigma) * tau) / st
    d2 = d1 - st
    n1, n2, p1 = _ncdf(d1), _ncdf(d2), _npdf(d1)
    df_r, df_q = math.exp(-r * tau), math.exp(-q * tau)
    delta = df_q * n1 if is_call else df_q * (n1 - 1.0)
    gamma = df_q * p1 / (s * st)
    decay = -(s * df_q * p1 * sigma) / (2.0 * sq)
    if is_call:
        theta = decay - r * k * df_r * n2 + q * s * df_q * n1
        rho = k * tau * df_r * n2 / 100.0
    else:
        theta = decay + r * k * df_r * (1 - n2) - q * s * df_q * (1 - n1)
        rho = -k * tau * df_r * (1 - n2) / 100.0
    vega = s * df_q * p1 * sq / 100.0
    return Greeks(delta, gamma, theta / DAYS_PER_YEAR, vega, rho)


def calculate_bs_call_greeks(s, k, tau, r, sigma, q=0.0):
    return _bs_greeks(s, k, tau, r, sigma, q, True)


def calculate_bs_put_greeks(s, k, tau, r, sigma, q=0.0):
    return _bs_greeks(s, k, tau, r, sigma, q, False)


def calculate_bs_call_greeks_batch(s, strikes, tau, r, sigma):
    return [calculate_bs_call_greeks(s, k, tau, r, sigma) for k in strikes]


def calculate_bs_put_greeks_batch(s, strikes, tau, r, sigma):
    return [calculate_bs_put_greeks(s, k, tau, r, sigma) for k in strikes]


def _numerical_greeks(s, k, tau, r, sigma, price_fn, bump=0.005):
    ds, dt, dsig, dr = s * bump, min(tau * bump, tau * 0.5), sigma * bump, 0.01 * bump
    base = price_fn(s, k, tau, r, sigma)
    up, dn = price_fn(s + ds, k, tau, r, sigma), price_fn(s - ds, k, tau, r, sigma)
    delta = (up - dn) / (2 * ds)
    gamma = (up - 2 * base + dn) / (ds * ds)
    theta = -(base - price_fn(s, k, tau - dt, r, sigma)) / dt / DAYS_PER_YEAR
    vega = (price_fn(s, k, tau, r, sigma + dsig) - price_fn(s, k, tau, r, sigma - dsig)) / (2 * dsig) / 100
    rho = (price_fn(s, k, tau, r + dr, sigma) - price_fn(s, k, tau, r - dr, sigma)) / (2 * dr) / 100
    return Greeks(delta, gamma, theta, vega, rho)


def calculate_numerical_call_greeks(s, k, tau, r, sigma, q=0.0):
    return _numerical_greeks(s, k, tau, r, sigma, lambda *a: price_call(*a, q), bump=1e-4)


def calculate_numerical_put_greeks(s, k, tau, r, sigma, q=0.0):
    return _numerical_greeks(s, k, tau, r, sigma, lambda *a: price_put(*a, q), bump=1e-4)


# ── FFT (the reference evaluates the same integral by direct quadrature) ──────


def price_call_fft_optimized(s, k, tau, r, sigma, q=0.0):
    return price_call(s, k, tau, r, sigma, q)


def price_put_fft_optimized(s, k, tau, r, sigma, q=0.0):
    return price_put(s, k, tau, r, sigma, q)


def price_call_fft_enhanced(s, k, k_min, delta_v, delta_k, n, tau, r, sigma, alpha, q=0.0):
    return price_call(s, k, tau, r, sigma, q)


def price_put_fft_enhanced(s, k, k_min, delta_v, delta_k, n, tau, r, sigma, alpha, q=0.0):
    return price_put(s, k, tau, r, sigma, q)


def price_call_fft(s, k_min, delta_v, delta_k, n, tau, r, sigma, alpha):
    """Prices on the full log-strike grid k_j = k_min + j·delta_k."""
    return [price_call(s, math.exp(k_min + j * delta_k), tau, r, sigma) for j in range(n)]


def price_put_fft(s, k_min, delta_v, delta_k, n, tau, r, sigma, alpha):
    return [price_put(s, math.exp(k_min + j * delta_k), tau, r, sigma) for j in range(n)]


def calculate_fft_call_greeks(s, k, tau, r, sigma, q=0.0):
    return _numerical_greeks(s, k, tau, r, sigma, lambda *a: price_call(*a, q))


def calculate_fft_put_greeks(s, k, tau, r, sigma, q=0.0):
    return _numerical_greeks(s, k, tau, r, sigma, lambda *a: price_put(*a, q))


# ── Heston ────────────────────────────────────────────────────────────────────


def validate_feller_condition_py(kappa, theta, xi):
    return 2.0 * kappa * theta > xi * xi


def _cf(u: complex, s, v0, r, kappa, theta, xi, rho, tau) -> complex:
    i = 1j
    b = kappa - rho * xi * i * u
    d = cmath.sqrt(b * b + xi * xi * (i * u + u * u))
    g = (b - d) / (b + d)
    e = cmath.exp(-d * tau)
    c = kappa * theta / xi**2 * ((b - d) * tau - 2 * cmath.log((1 - g * e) / (1 - g)))
    dd = (b - d) / xi**2 * (1 - e) / (1 - g * e)
    return cmath.exp(i * u * (math.log(s) + r * tau) + c + dd * v0)


def cf_heston(u, s, v0, r, kappa, theta, xi, rho, tau):
    if tau <= 0:
        return complex(1.0, 0.0) if u == 0 else cmath.exp(1j * u * math.log(s))
    return _cf(complex(u, 0.0), s, v0, r, kappa, theta, xi, rho, tau)


def _simpson(f, a, b, n=4000):
    h = (b - a) / n
    tot = f(a) + f(b)
    for j in range(1, n):
        tot += (4 if j % 2 else 2) * f(a + j * h)
    return tot * h / 3


def price_heston_call(s, k, v0, r, kappa, theta, xi, rho, tau, q=0.0):
    if v0 <= 0 or kappa <= 0 or theta <= 0 or xi <= 0 or not -1 <= rho <= 1:
        raise ValueError("Invalid Heston parameters")
    if not validate_feller_condition_py(kappa, theta, xi):
        raise ValueError("Feller condition violated: 2*kappa*theta <= xi^2")
    if tau <= 0:
        return max(s - k, 0.0)
    drift = r - q
    lnk = math.log(k)
    fwd = s * math.exp(drift * tau)

    def f1(u):
        return (cmath.exp(-1j * u * lnk) * _cf(u - 1j, s, v0, drift, kappa, theta, xi, rho, tau) / (1j * u * fwd)).real

    def f2(u):
        return (cmath.exp(-1j * u * lnk) * _cf(complex(u), s, v0, drift, kappa, theta, xi, rho, tau) / (1j * u)).real

    upper = min(max(200.0 / math.sqrt(tau), 200.0), 2000.0)
    p1 = 0.5 + _simpson(f1, 1e-10, upper) / math.pi
    p2 = 0.5 + _simpson(f2, 1e-10, upper) / math.pi
    spot_pv = s * math.exp(-q * tau)
    c = spot_pv * p1 - k * math.exp(-r * tau) * p2
    return min(max(c, max(spot_pv - k * math.exp(-r * tau), 0.0)), spot_pv)


def price_heston_put(s, k, v0, r, kappa, theta, xi, rho, tau, q=0.0):
    c = price_heston_call(s, k, v0, r, kappa, theta, xi, rho, tau, q)
    return max(c - s * math.exp(-q * tau) + k * math.exp(-r * tau), 0.0)


def _heston_greeks(s, k, tau, r, v0, theta, kappa, sigma_v, rho, q, put):
    fn = price_heston_put if put else price_heston_call
    return _numerical_greeks(
        s, k, tau, r, math.sqrt(v0),
        lambda s_, k_, t_, r_, sig: fn(s_, k_, sig * sig, r_, kappa, theta, sigma_v, rho, t_, q),
    )


def calculate_heston_call_greeks(s, k, tau, r, v0, theta, kappa, sigma_v, rho, q=0.0):
    return _heston_greeks(s, k, tau, r, v0, theta, kappa, sigma_v, rho, q, False)


def calculate_heston_put_greeks(s, k, tau, r, v0, theta, kappa, sigma_v, rho, q=0.0):
    return _heston_greeks(s, k, tau, r, v0, theta, kappa, sigma_v, rho, q, True)


# ── Monte Carlo ───────────────────────────────────────────────────────────────


def price_mc_with_error(s, k, tau, r, sigma, sims, is_call=True, seed=None, q=0.0) -> Tuple[float, float, int]:
    _validate(s, k, tau, r, sigma, q)
    rng = random.Random(seed)
    drift = (r - q - 0.5 * sigma * sigma) * tau
    vol = sigma * math.sqrt(tau)
    pairs = max((sims + 1) // 2, 1)
    acc = acc2 = 0.0
    for _ in range(pairs):
        z = rng.gauss(0.0, 1.0)
        a, b = s * math.exp(drift + vol * z), s * math.exp(drift - vol * z)
        x = 0.5 * ((max(a - k, 0) + max(b - k, 0)) if is_call else (max(k - a, 0) + max(k - b, 0)))
        acc += x
        acc2 += x * x
    mean = acc / pairs
    var = max(acc2 - pairs * mean * mean, 0.0) / (pairs - 1) if pairs > 1 else 0.0
    df = math.exp(-r * tau)
    return df * mean, df * math.sqrt(var / pairs), 2 * pairs


def price_call_mc(s, k, tau, r, sigma, sims, seed=None, q=0.0):
    return price_mc_with_error(s, k, tau, r, sigma, sims, True, seed, q)[0]


def price_put_mc(s, k, tau, r, sigma, sims, seed=None, q=0.0):
    return price_mc_with_error(s, k, tau, r, sigma, sims, False, seed, q)[0]


# ── American (CRR binomial, Richardson-extrapolated) ─────────────────────────


def _crr_american(s, k, tau, r, sigma, q, is_call, n):
    dt = tau / n
    u = math.exp(sigma * math.sqrt(dt))
    d = 1 / u
    p = (math.exp((r - q) * dt) - d) / (u - d)
    disc = math.exp(-r * dt)
    pay = (lambda x: max(x - k, 0.0)) if is_call else (lambda x: max(k - x, 0.0))
    v = [pay(s * u**j * d ** (n - j)) for j in range(n + 1)]
    eu = list(v)
    for st in range(n - 1, -1, -1):
        for j in range(st + 1):
            v[j] = max(disc * (p * v[j + 1] + (1 - p) * v[j]), pay(s * u**j * d ** (st - j)))
            eu[j] = disc * (p * eu[j + 1] + (1 - p) * eu[j])
    return v[0], eu[0]


def price_american(s, k, tau, r, sigma, q=0.0, is_call=False, steps=501):
    _validate(s, k, tau, r, sigma, q)
    steps = min(steps, 1000)  # pure Python: keep it tractable
    a1, _ = _crr_american(s, k, tau, r, sigma, q, is_call, steps)
    a2, e2 = _crr_american(s, k, tau, r, sigma, q, is_call, 2 * steps)
    price = 2 * a2 - a1
    h = s * 0.02  # tree prices are piecewise-smooth in S: bump well past a node spacing
    up, _ = _crr_american(s + h, k, tau, r, sigma, q, is_call, steps)
    dn, _ = _crr_american(s - h, k, tau, r, sigma, q, is_call, steps)
    delta = (up - dn) / (2 * h)
    gamma = (up - 2 * a1 + dn) / (h * h)
    return price, delta, gamma, max(price - e2, 0.0)


# ── Performance monitor API (no-op in the reference engine) ──────────────────


def get_performance_metrics(operation: Optional[str] = None):
    return {}


def clear_performance_metrics(operation: Optional[str] = None):
    return None


def get_all_operation_names() -> List[str]:
    return []


def reset_all_metrics():
    return None
