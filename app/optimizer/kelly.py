"""
Kelly Criterion — M5 L1: single-asset G(f)=p·ln(1+f)+q·ln(1-f), multi-asset continuous
"""

import numpy as np
from typing import Optional
from dataclasses import dataclass

try:
    import cvxpy as cp
    CVXPY_AVAILABLE = True
except ImportError:
    CVXPY_AVAILABLE = False


@dataclass
class KellyResult:
    """Kelly optimization result."""
    optimal_fraction: float
    expected_growth: float
    weights: np.ndarray
    fractional_kelly: Optional[float] = None


def kelly_single(p: float, q: float, a: float = 1.0, b: float = 1.0) -> float:
    """
    Single-asset Kelly: f* = p - q (symmetric) or f* = p/a - q/b (asymmetric).
    p=win prob, q=1-p, a=loss per unit, b=win per unit.
    """
    return p / a - q / b


def kelly_growth_curve(p: float, q: float, f_max: float = 1.0, n_points: int = 100) -> list:
    """G(f) = p·ln(1+f) + q·ln(1-f) for plotting."""
    f_vals = np.linspace(0.01, min(f_max, 0.99), n_points)
    g_vals = []
    for f in f_vals:
        g = p * np.log(1 + f) + q * np.log(1 - f)
        g_vals.append({"f": float(f), "g": float(g)})
    return g_vals


def kelly_multi_asset(
    returns: np.ndarray,
    fractional: float = 1.0,
    long_only: bool = True,
    max_leverage: float = 1.0,
) -> KellyResult:
    """
    Multi-asset Kelly: maximize the empirical log-growth (1/T) Σ_t ln(1 + w'r_t).

    The objective is concave in w (log of an affine function), so the problem is
    DCP-compliant. Capital not allocated to risky assets is held in cash
    (return 0), so gross exposure ‖w‖₁ ≤ max_leverage rather than Σw = 1.

    fractional: κ ∈ (0,1] scales the growth-optimal weights (half-Kelly = 0.5).
    long_only: if False, short positions are allowed.
    """
    if not CVXPY_AVAILABLE:
        raise ImportError("cvxpy required for multi-asset Kelly")
    if not 0 < fractional <= 1:
        raise ValueError("fractional must be in (0, 1]")
    if max_leverage <= 0:
        raise ValueError("max_leverage must be positive")

    returns = np.asarray(returns, dtype=float)
    if returns.ndim != 2:
        raise ValueError("returns must be a 2-D array (T x N)")
    n_obs, n_assets = returns.shape

    w = cp.Variable(n_assets)
    # The domain of cp.log enforces 1 + r_t'w > 0: no scenario wipes out capital.
    objective = cp.Maximize(cp.sum(cp.log(1 + returns @ w)) / n_obs)
    constraints = [cp.norm1(w) <= max_leverage]
    if long_only:
        constraints.append(w >= 0)

    prob = cp.Problem(objective, constraints)
    prob.solve(verbose=False)

    if prob.status not in ["optimal", "optimal_inaccurate"] or w.value is None:
        raise ValueError(f"Kelly optimization failed: {prob.status}")

    w_val = np.array(w.value, dtype=float).flatten()
    w_val[np.abs(w_val) < 1e-9] = 0.0
    if long_only:
        w_val = np.maximum(w_val, 0.0)
    w_val = w_val * fractional

    gross = 1 + returns @ w_val
    if np.any(gross <= 0):
        raise ValueError("Kelly weights imply total loss in at least one scenario")
    g_mean = float(np.mean(np.log(gross)))

    return KellyResult(
        optimal_fraction=float(np.sum(np.abs(w_val))),
        expected_growth=g_mean,
        weights=w_val,
        fractional_kelly=fractional if fractional < 1.0 else None,
    )
