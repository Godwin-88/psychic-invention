"""Implied volatility and Heston calibration.

implied_vol_bs
    Black–Scholes–Merton implied volatility by Brent's method on a bracket,
    after checking the price lies inside the no-arbitrage bounds. Newton's
    method (the previous implementation) divides by vega, which vanishes for
    deep ITM/OTM options, and silently returned a clipped guess on failure.

heston_calibrate
    Vega-weighted least squares (a first-order approximation to fitting
    implied vols, which keeps cheap OTM options from being ignored), solved
    with bounded trust-region least squares from several starting points.
    The Feller condition is optional: market smiles routinely violate it and
    the pricing formula stays valid.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Sequence

import numpy as np
from scipy.optimize import brentq, least_squares
from scipy.stats import norm

try:
    import pricing_engine
except ImportError:  # pragma: no cover - exercised when Rust is not built
    import pricing_engine_mock as pricing_engine  # type: ignore

HAS_PRICING = True

_SIG_LO, _SIG_HI = 1e-6, 10.0


class ImpliedVolError(ValueError):
    """Raised when no volatility reproduces the given price."""


def _bs_price(s: float, k: float, r: float, tau: float, sig: float, q: float, is_call: bool) -> float:
    st = sig * math.sqrt(tau)
    d1 = (math.log(s / k) + (r - q + 0.5 * sig * sig) * tau) / st
    d2 = d1 - st
    if is_call:
        return s * math.exp(-q * tau) * norm.cdf(d1) - k * math.exp(-r * tau) * norm.cdf(d2)
    return k * math.exp(-r * tau) * norm.cdf(-d2) - s * math.exp(-q * tau) * norm.cdf(-d1)


def bs_vega(s: float, k: float, r: float, tau: float, sig: float, q: float = 0.0) -> float:
    """∂V/∂σ per unit volatility (not per vol point)."""
    st = sig * math.sqrt(tau)
    d1 = (math.log(s / k) + (r - q + 0.5 * sig * sig) * tau) / st
    return s * math.exp(-q * tau) * norm.pdf(d1) * math.sqrt(tau)


def implied_vol_bs(
    c: float,
    s: float,
    k: float,
    r: float,
    tau: float,
    option_type: str = "call",
    q: float = 0.0,
    tol: float = 1e-10,
) -> float:
    """Implied volatility of a European option price.

    Raises ImpliedVolError if the price violates the no-arbitrage bounds
    (no volatility can reproduce it) or the inputs are invalid.
    """
    if option_type not in ("call", "put"):
        raise ValueError("option_type must be 'call' or 'put'")
    if not (s > 0 and k > 0 and tau > 0) or not math.isfinite(c):
        raise ImpliedVolError("s, k and tau must be positive and price finite")
    is_call = option_type == "call"
    fwd_s = s * math.exp(-q * tau)
    pv_k = k * math.exp(-r * tau)
    lower = max(fwd_s - pv_k, 0.0) if is_call else max(pv_k - fwd_s, 0.0)
    upper = fwd_s if is_call else pv_k
    if not lower - 1e-12 <= c <= upper + 1e-12:
        raise ImpliedVolError(
            f"price {c:.6g} outside no-arbitrage bounds [{lower:.6g}, {upper:.6g}]"
        )
    # Within ~1e-12 of intrinsic the volatility is not identifiable.
    if c - lower < 1e-12:
        return _SIG_LO

    def f(sig: float) -> float:
        return _bs_price(s, k, r, tau, sig, q, is_call) - c

    f_hi = f(_SIG_HI)
    if f_hi < 0:
        raise ImpliedVolError(f"implied volatility above {_SIG_HI:.0%}")
    return float(brentq(f, _SIG_LO, _SIG_HI, xtol=tol, rtol=1e-12, maxiter=200))


@dataclass
class HestonCalibResult:
    v0: float
    kappa: float
    theta: float
    xi: float
    rho: float
    rmse: float  # price RMSE
    feller_ok: bool
    iv_rmse: Optional[float] = None  # implied-vol RMSE (vol points), when computable
    success: bool = True
    message: str = ""
    n_options: int = 0
    residuals: List[float] = field(default_factory=list)


_BOUNDS_LO = np.array([1e-4, 0.05, 1e-4, 0.01, -0.999])
_BOUNDS_HI = np.array([2.0, 20.0, 2.0, 3.0, 0.999])
_STARTS = (
    (0.04, 2.0, 0.04, 0.3, -0.5),
    (0.02, 1.0, 0.06, 0.5, -0.7),
    (0.09, 4.0, 0.03, 0.6, -0.3),
)


def _model_prices(s, r, q, strikes, expiries, x) -> np.ndarray:
    v0, kappa, theta, xi, rho = (float(v) for v in x)
    return np.asarray(
        pricing_engine.price_heston_calls_batch(
            s, list(map(float, strikes)), list(map(float, expiries)),
            v0, r, kappa, theta, xi, rho, q, False,
        ),
        dtype=float,
    )


def heston_calibrate(
    s: float,
    r: float,
    strikes: np.ndarray,
    expiries: np.ndarray,
    market_prices: np.ndarray,
    q: float = 0.0,
    enforce_feller: bool = False,
    starts: Sequence[Sequence[float]] = _STARTS,
) -> HestonCalibResult:
    """Calibrate Heston (v0, κ, θ, ξ, ρ) to European call prices.

    Residuals are (model − market) / vega_BS(market IV), so the fit is close to
    a least-squares fit in implied-volatility space. With enforce_feller=True a
    smooth penalty keeps 2κθ ≥ ξ².
    """
    strikes = np.asarray(strikes, dtype=float)
    expiries = np.asarray(expiries, dtype=float)
    market = np.asarray(market_prices, dtype=float)
    n = len(market)
    if not (len(strikes) == len(expiries) == n) or n == 0:
        raise ValueError("strikes, expiries and market_prices must be non-empty and equal length")
    if n < 5:
        raise ValueError("need at least 5 option prices to identify 5 Heston parameters")

    # Weights from market implied vols; options whose IV cannot be found
    # (price at/below intrinsic) are fitted in plain price units.
    ivs = np.full(n, np.nan)
    weights = np.ones(n)
    for i in range(n):
        try:
            ivs[i] = implied_vol_bs(market[i], s, strikes[i], r, expiries[i], "call", q)
            weights[i] = 1.0 / max(bs_vega(s, strikes[i], r, expiries[i], ivs[i], q), 1e-4)
        except ImpliedVolError:
            pass

    def residuals(x):
        res = (_model_prices(s, r, q, strikes, expiries, x) - market) * weights
        if enforce_feller:
            _, kappa, theta, xi, _ = x
            res = np.append(res, 100.0 * max(xi * xi - 2 * kappa * theta, 0.0))
        return res

    best = None
    for x0 in starts:
        try:
            sol = least_squares(
                residuals, np.clip(x0, _BOUNDS_LO, _BOUNDS_HI),
                bounds=(_BOUNDS_LO, _BOUNDS_HI), method="trf", x_scale="jac",
                xtol=1e-10, ftol=1e-10, max_nfev=400,
            )
        except ValueError:
            continue
        if best is None or sol.cost < best.cost:
            best = sol
    if best is None:
        raise ValueError("Heston calibration failed from every starting point")

    v0, kappa, theta, xi, rho = (float(v) for v in best.x)
    model = _model_prices(s, r, q, strikes, expiries, best.x)
    price_err = model - market
    iv_err = []
    for i in range(n):
        if np.isnan(ivs[i]):
            continue
        try:
            iv_err.append(implied_vol_bs(model[i], s, strikes[i], r, expiries[i], "call", q) - ivs[i])
        except ImpliedVolError:
            pass
    return HestonCalibResult(
        v0=v0, kappa=kappa, theta=theta, xi=xi, rho=rho,
        rmse=float(np.sqrt(np.mean(price_err**2))),
        feller_ok=bool(2 * kappa * theta > xi * xi),
        iv_rmse=float(np.sqrt(np.mean(np.square(iv_err)))) * 100 if iv_err else None,
        success=bool(best.success),
        message=str(best.message),
        n_options=n,
        residuals=[float(e) for e in price_err],
    )
