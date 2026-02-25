"""
Transact Phase 1 Routes — Portfolio, Risk, Optimizer, Blotter
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import numpy as np

from .portfolio_engine import compute_portfolio_moments, compute_performance_metrics
from .risk.var_engine import compute_var_all_methods
from .optimizer.mvo import efficient_frontier, gmv_portfolio, tangency_portfolio, optimize_mvo
from .optimizer.black_litterman import blm_optimize
from .optimizer.risk_parity import risk_parity_erc, risk_parity_rrp
from .optimizer.hrp import hrp_weights
from .optimizer.kelly import kelly_single, kelly_growth_curve, kelly_multi_asset
from .blotter.trade_store import get_trade_store
from .blotter.attribution import performance_attribution
from .scenarios.scenario_engine import apply_custom_scenario, probabilistic_scenario_optimization, CRISIS_PERIODS
from .scenarios.monte_carlo import monte_carlo_portfolio
from .scenarios.behavioral import portfolio_perceived_utility, herding_stress_var
from .factors.factor_model import estimate_factor_model_ols
from .factors.fama_macbeth import fama_macbeth
from .factors.smart_beta import smart_beta_sort, smart_beta_signal_weighted
from .factors.crowding import crowding_index
from .higher_moments import compute_coskewness
from .vol.calibration import heston_calibrate, implied_vol_bs

router = APIRouter(prefix="", tags=["transact"])


# --- Portfolio ---
class PortfolioMomentsRequest(BaseModel):
    returns: List[List[float]]  # T x N matrix
    weights: List[float]
    market_returns: Optional[List[float]] = None


class PortfolioPerformanceRequest(BaseModel):
    portfolio_returns: List[float]
    risk_free_rate: float = 0.0
    portfolio_beta: float = 1.0
    benchmark_returns: Optional[List[float]] = None
    mar: Optional[float] = None


@router.post("/portfolio/moments")
def post_portfolio_moments(req: PortfolioMomentsRequest):
    """Compute all sample moments (M1 L1)."""
    try:
        returns = np.array(req.returns)
        weights = np.array(req.weights)
        market = np.array(req.market_returns) if req.market_returns else None
        m = compute_portfolio_moments(returns, weights, market)
        return {
            "portfolio_return": m.portfolio_return,
            "portfolio_variance": m.portfolio_variance,
            "portfolio_volatility": m.portfolio_volatility,
            "portfolio_beta": m.portfolio_beta,
            "systematic_risk": m.systematic_risk,
            "non_systematic_risk": m.non_systematic_risk,
            "skewness": m.skewness,
            "kurtosis_excess": m.kurtosis_excess,
            "asset_returns": m.asset_returns.tolist(),
            "asset_volatilities": m.asset_volatilities.tolist(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/portfolio/performance")
def post_portfolio_performance(req: PortfolioPerformanceRequest):
    """Compute performance appraisal ratios (M1 Part II §4–7)."""
    try:
        pr = np.array(req.portfolio_returns)
        bench = np.array(req.benchmark_returns) if req.benchmark_returns else None
        pm = compute_performance_metrics(
            pr, req.risk_free_rate, req.portfolio_beta, bench, req.mar
        )
        return {
            "sharpe_ratio": pm.sharpe_ratio,
            "treynor_ratio": pm.treynor_ratio,
            "sortino_ratio": pm.sortino_ratio,
            "m2_modigliani": pm.m2_modigliani,
            "m2_sortino": pm.m2_sortino,
            "information_ratio": pm.information_ratio,
            "appraisal_ratio": pm.appraisal_ratio,
            "alpha": pm.alpha,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Risk ---
class VaRRequest(BaseModel):
    returns: List[List[float]]  # T x N matrix
    weights: Optional[List[float]] = None
    alpha: float = 0.05
    horizon_days: int = 1
    portfolio_value: float = 1.0
    include_monte_carlo: bool = True
    mc_simulations: int = 100_000


@router.post("/risk/var")
def post_risk_var(req: VaRRequest):
    """Compute VaR and ES for all methods (M1 L2)."""
    try:
        returns = np.array(req.returns)
        weights = np.array(req.weights) if req.weights else None
        result = compute_var_all_methods(
            returns,
            weights,
            req.alpha,
            req.horizon_days,
            req.portfolio_value,
            req.include_monte_carlo,
            req.mc_simulations,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/risk/es")
def post_risk_es(req: VaRRequest):
    """Compute Expected Shortfall (CVaR) — same as /risk/var, returns ES focus."""
    try:
        returns = np.array(req.returns)
        weights = np.array(req.weights) if req.weights else None
        result = compute_var_all_methods(
            returns,
            weights,
            req.alpha,
            req.horizon_days,
            req.portfolio_value,
            req.include_monte_carlo,
            req.mc_simulations,
        )
        return {"es": result["es"], "confidence": result["confidence"], "methods": result["methods"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Optimizer ---
class MVORequest(BaseModel):
    covariance: List[List[float]]
    expected_returns: List[float]
    target_return: Optional[float] = None
    risk_free_rate: float = 0.0
    long_only: bool = True


class MVOFrontierRequest(BaseModel):
    covariance: List[List[float]]
    expected_returns: List[float]
    risk_free_rate: float = 0.0
    n_points: int = 50
    long_only: bool = True


@router.post("/optimize/mvo")
def post_optimize_mvo(req: MVORequest):
    """Mean-variance optimization (M1 L4)."""
    try:
        cov = np.array(req.covariance)
        mu = np.array(req.expected_returns)
        res = optimize_mvo(
            cov, mu, req.target_return, req.risk_free_rate, req.long_only
        )
        return {
            "weights": res.weights.tolist(),
            "expected_return": res.expected_return,
            "volatility": res.volatility,
            "sharpe_ratio": res.sharpe_ratio,
            "is_gmv": res.is_gmv,
            "is_tangency": res.is_tangency,
        }
    except ImportError as e:
        raise HTTPException(status_code=503, detail="cvxpy not installed. pip install cvxpy")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimize/mvo/frontier")
def post_optimize_mvo_frontier(req: MVOFrontierRequest):
    """Efficient frontier (M1 L4)."""
    try:
        cov = np.array(req.covariance)
        mu = np.array(req.expected_returns)
        points = efficient_frontier(
            cov, mu, req.risk_free_rate, req.n_points, req.long_only
        )
        return {
            "frontier": [
                {
                    "weights": p.weights.tolist(),
                    "expected_return": p.expected_return,
                    "volatility": p.volatility,
                    "sharpe_ratio": p.sharpe_ratio,
                }
                for p in points
            ],
            "gmv": _gmv_dict(cov, mu, req.long_only),
            "tangency": _tangency_dict(cov, mu, req.risk_free_rate, req.long_only),
        }
    except ImportError as e:
        raise HTTPException(status_code=503, detail="cvxpy not installed. pip install cvxpy")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _gmv_dict(cov, mu, long_only):
    r = gmv_portfolio(cov, mu, long_only)
    return {"weights": r.weights.tolist(), "expected_return": r.expected_return, "volatility": r.volatility}


def _tangency_dict(cov, mu, rf, long_only):
    r = tangency_portfolio(cov, mu, rf, long_only)
    return {"weights": r.weights.tolist(), "expected_return": r.expected_return, "volatility": r.volatility}


# --- Phase 2: BLM, Risk Parity, HRP, Kelly ---
class BLMRequest(BaseModel):
    covariance: List[List[float]]
    market_weights: List[float]
    P: List[List[float]]  # K×N pick matrix
    Q: List[float]       # K×1 view returns
    tau: float = 0.05
    risk_aversion: float = 2.5
    risk_free_rate: float = 0.0
    long_only: bool = True


class RiskParityRequest(BaseModel):
    covariance: List[List[float]]
    expected_returns: Optional[List[float]] = None
    rho: float = 0.0  # 0=ERC, 1=MVO tilt
    long_only: bool = True


class HRPRequest(BaseModel):
    covariance: List[List[float]]


class KellySingleRequest(BaseModel):
    p: float  # win probability
    q: float  # lose probability (1-p)
    a: float = 1.0  # loss per unit
    b: float = 1.0  # win per unit


class KellyMultiRequest(BaseModel):
    returns: List[List[float]]  # T×N
    fractional: float = 1.0
    long_only: bool = True


@router.post("/optimize/blm")
def post_optimize_blm(req: BLMRequest):
    """Black-Litterman model (M3 L1)."""
    try:
        cov = np.array(req.covariance)
        w_m = np.array(req.market_weights)
        P = np.array(req.P)
        Q = np.array(req.Q)
        res = blm_optimize(
            cov, w_m, P, Q,
            tau=req.tau, risk_aversion=req.risk_aversion,
            risk_free=req.risk_free_rate, long_only=req.long_only,
        )
        return {
            "implied_returns": res.implied_returns.tolist(),
            "blm_returns": res.blm_returns.tolist(),
            "weights": res.optimal_weights.tolist(),
            "expected_return": res.expected_return,
            "volatility": res.volatility,
            "sharpe_ratio": res.sharpe_ratio,
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="cvxpy required")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimize/risk-parity")
def post_optimize_risk_parity(req: RiskParityRequest):
    """Equal Risk Contribution + Relaxed RRP (M5 L3)."""
    try:
        cov = np.array(req.covariance)
        if req.rho > 0 and req.expected_returns:
            res = risk_parity_rrp(
                cov, np.array(req.expected_returns),
                rho=req.rho, long_only=req.long_only,
            )
        else:
            res = risk_parity_erc(cov)
        return {
            "weights": res.weights.tolist(),
            "risk_contributions": res.risk_contributions.tolist(),
            "volatility": res.volatility,
            "method": res.method,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimize/hrp")
def post_optimize_hrp(req: HRPRequest):
    """Hierarchical Risk Parity (M7 L4)."""
    try:
        cov = np.array(req.covariance)
        w, sort_ix, link = hrp_weights(cov)
        return {
            "weights": w.tolist(),
            "sort_order": sort_ix.tolist(),
            "linkage": link,
            "volatility": float(np.sqrt(w @ cov @ w)),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimize/kelly/single")
def post_optimize_kelly_single(req: KellySingleRequest):
    """Single-asset Kelly (M5 L1)."""
    try:
        f_star = kelly_single(req.p, req.q, req.a, req.b)
        curve = kelly_growth_curve(req.p, req.q)
        return {"optimal_fraction": f_star, "growth_curve": curve}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimize/kelly")
def post_optimize_kelly(req: KellyMultiRequest):
    """Multi-asset Kelly (M5 L1)."""
    try:
        returns = np.array(req.returns)
        res = kelly_multi_asset(
            returns,
            fractional=req.fractional,
            long_only=req.long_only,
        )
        return {
            "weights": res.weights.tolist(),
            "expected_growth": res.expected_growth,
            "optimal_fraction": res.optimal_fraction,
            "fractional_kelly": res.fractional_kelly,
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="cvxpy required")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Phase 3: Factors, Coskewness, Heston, Smart Beta, Crowding ---
class FactorEstimateRequest(BaseModel):
    returns: List[List[float]]
    factors: List[List[float]]  # T x K, add constant automatically


class FamaMacBethRequest(BaseModel):
    returns: List[List[float]]
    factors: List[List[float]]


class CoskewnessRequest(BaseModel):
    returns: List[List[float]]
    weights: List[float]


class HestonCalibrateRequest(BaseModel):
    s: float
    r: float
    strikes: List[float]
    expiries: List[float]
    market_prices: List[float]


class SmartBetaRequest(BaseModel):
    factor_scores: List[float]
    returns: List[List[float]]
    method: str = "quintile"


class CrowdingRequest(BaseModel):
    factor_loadings: List[List[float]]


@router.post("/factors/estimate")
def post_factors_estimate(req: FactorEstimateRequest):
    """OLS factor model (M2 L4)."""
    try:
        R = np.array(req.returns)
        F = np.array(req.factors)
        res = estimate_factor_model_ols(R, F)
        return {
            "alphas": res.alphas.tolist(),
            "betas": res.betas.tolist(),
            "r_squared": res.r_squared.tolist(),
            "residual_var": res.residual_var.tolist(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/factors/fama-macbeth")
def post_factors_fama_macbeth(req: FamaMacBethRequest):
    """Fama-MacBeth two-stage regression (M6 L1)."""
    try:
        res = fama_macbeth(np.array(req.returns), np.array(req.factors))
        return {
            "lambdas": res.lambdas.tolist(),
            "std_errors": res.std_errors.tolist(),
            "t_stats": res.t_stats.tolist(),
            "p_values": res.p_values.tolist(),
            "betas": res.betas.tolist(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/portfolio/coskewness")
def post_portfolio_coskewness(req: CoskewnessRequest):
    """Coskewness M3 and portfolio skewness (M2 L2)."""
    try:
        res = compute_coskewness(np.array(req.returns), np.array(req.weights))
        return {
            "portfolio_skewness": res.portfolio_skewness,
            "excess_kurtosis_warning": res.excess_kurtosis_warning,
            "coskewness_matrix": res.coskewness_matrix.tolist(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/heston/calibrate")
def post_heston_calibrate(req: HestonCalibrateRequest):
    """Calibrate Heston to market option prices."""
    try:
        res = heston_calibrate(
            req.s, req.r,
            np.array(req.strikes), np.array(req.expiries), np.array(req.market_prices),
        )
        return {
            "v0": res.v0,
            "kappa": res.kappa,
            "theta": res.theta,
            "xi": res.xi,
            "rho": res.rho,
            "rmse": res.rmse,
            "feller_condition_ok": res.feller_ok,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ImpliedSurfaceRequest(BaseModel):
    s: float
    r: float
    strikes: List[float]
    expiries: List[float]
    market_prices: List[float]


@router.post("/vol/implied-surface")
def post_vol_implied_surface(req: ImpliedSurfaceRequest):
    """Compute IV for each (K,tau) from market prices (calls)."""
    try:
        ivs = []
        for i in range(len(req.strikes)):
            iv = implied_vol_bs(req.market_prices[i], req.s, req.strikes[i], req.r, req.expiries[i], "call")
            ivs.append({"strike": req.strikes[i], "expiry": req.expiries[i], "iv": iv})
        return {"surface": ivs}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/factors/smart-beta")
def post_factors_smart_beta(req: SmartBetaRequest):
    """Smart beta portfolio (M6 L2)."""
    try:
        scores = np.array(req.factor_scores)
        returns = np.array(req.returns)
        if req.method == "signal_weighted":
            res = smart_beta_signal_weighted(scores, returns)
        else:
            res = smart_beta_sort(scores, returns)
        return {
            "weights": res.weights.tolist(),
            "method": res.method,
            "expected_return": res.expected_return,
            "volatility": res.volatility,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/factors/crowding")
def post_factors_crowding(req: CrowdingRequest):
    """Herding/crowding risk index (M6 L2)."""
    try:
        res = crowding_index(np.array(req.factor_loadings))
        return {
            "crowding_index": res.crowding_index,
            "level": res.level,
            "avg_correlation": res.avg_correlation,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Blotter ---
class TradeEntryRequest(BaseModel):
    asset: str
    direction: str  # "long" | "short"
    quantity: float
    entry_price: float
    entry_date: Optional[str] = None
    model_used: Optional[str] = None
    theoretical_price: Optional[float] = None
    strategy_tag: Optional[str] = None
    asset_class: Optional[str] = None


class PositionsRequest(BaseModel):
    current_prices: dict  # {"AAPL": 150.0, ...}


@router.post("/blotter/trade")
def post_blotter_trade(req: TradeEntryRequest):
    """Add a new trade."""
    try:
        if req.direction.lower() not in ("long", "short"):
            raise HTTPException(status_code=400, detail="direction must be 'long' or 'short'")
        store = get_trade_store()
        trade = store.add_trade(
            asset=req.asset,
            direction=req.direction,
            quantity=req.quantity,
            entry_price=req.entry_price,
            entry_date=req.entry_date,
            model_used=req.model_used,
            theoretical_price=req.theoretical_price,
            strategy_tag=req.strategy_tag,
            asset_class=req.asset_class,
        )
        return {
            "id": trade.id,
            "asset": trade.asset,
            "direction": trade.direction,
            "quantity": trade.quantity,
            "entry_price": trade.entry_price,
            "entry_date": trade.entry_date,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/blotter/positions")
def get_blotter_positions(current_prices: Optional[str] = None):
    """Get open positions with P&L. Pass current_prices as JSON string or query param."""
    try:
        import json
        prices = json.loads(current_prices) if current_prices else {}
        store = get_trade_store()
        positions = store.get_positions(prices)
        return {
            "positions": [
                {
                    "asset": p.asset,
                    "quantity": p.quantity,
                    "direction": p.direction,
                    "entry_price": p.entry_price,
                    "current_price": p.current_price,
                    "unrealized_pnl": p.unrealized_pnl,
                    "unrealized_pnl_pct": p.unrealized_pnl_pct,
                }
                for p in positions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/blotter/positions")
def post_blotter_positions(req: PositionsRequest):
    """Get positions with P&L given current prices."""
    try:
        store = get_trade_store()
        positions = store.get_positions(req.current_prices)
        return {
            "positions": [
                {
                    "asset": p.asset,
                    "quantity": p.quantity,
                    "direction": p.direction,
                    "entry_price": p.entry_price,
                    "current_price": p.current_price,
                    "unrealized_pnl": p.unrealized_pnl,
                    "unrealized_pnl_pct": p.unrealized_pnl_pct,
                }
                for p in positions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/blotter/history")
def get_blotter_history():
    """Full transaction history."""
    try:
        store = get_trade_store()
        return {"trades": store.get_history()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Phase 4: Scenarios & Behavioral ---
class ScenarioDefineRequest(BaseModel):
    name: str
    return_shocks: Optional[List[float]] = None
    vol_shocks: Optional[List[float]] = None
    corr_shift: float = 0.0


class ScenarioRunRequest(BaseModel):
    returns: List[List[float]]
    weights: List[float]
    return_shocks: Optional[List[float]] = None
    vol_shocks: Optional[List[float]] = None
    corr_shift: float = 0.0
    historical: Optional[str] = None  # e.g. "GFC_2008", "COVID_2020", "Quant_Melt_2007"


class ProbabilisticScenarioRequest(BaseModel):
    scenario_returns: List[List[float]]  # K x N
    scenario_probs: List[float]
    target_return: float
    long_only: bool = True


class MonteCarloRequest(BaseModel):
    returns: List[List[float]]
    weights: List[float]
    portfolio_value: float = 1.0
    horizon_days: int = 1
    n_paths: int = 100_000
    use_t_dist: bool = False
    df: float = 5.0


class BehavioralRequest(BaseModel):
    returns: List[List[float]]
    weights: List[float]
    mode: str = "prospect"  # "prospect" | "herding"
    correlation_shift: float = 0.3
    alpha: float = 0.05
    portfolio_value: float = 1.0


class AttributionRequest(BaseModel):
    portfolio_returns: List[float]
    market_returns: List[float]
    risk_free_rate: float = 0.0
    factor_betas: Optional[List[float]] = None
    factor_returns: Optional[List[List[float]]] = None  # T x K matrix


class PnLRequest(BaseModel):
    price_history: Optional[List[dict]] = None  # [{"date": "YYYY-MM-DD", "prices": {...}}, ...]
    current_prices: Optional[dict] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None


_scenarios_store: dict = {}


@router.post("/scenarios/define")
def post_scenarios_define(req: ScenarioDefineRequest):
    """Save custom scenario by name (M3 L4)."""
    _scenarios_store[req.name] = {
        "return_shocks": req.return_shocks,
        "vol_shocks": req.vol_shocks,
        "corr_shift": req.corr_shift,
    }
    return {"name": req.name, "saved": True}


@router.post("/scenarios/run")
def post_scenarios_run(req: ScenarioRunRequest):
    """Apply scenario to portfolio, return stressed metrics (M3 L4)."""
    try:
        returns = np.array(req.returns)
        weights = np.array(req.weights)
        return_shocks = req.return_shocks
        vol_shocks = req.vol_shocks
        corr_shift = req.corr_shift

        if req.historical:
            crisis = CRISIS_PERIODS.get(req.historical)
            if crisis:
                n = returns.shape[1]
                return_shocks = [crisis["return_shift"]] * n  # uniform market crash
                corr_shift = crisis["corr_shift"]

        res = apply_custom_scenario(returns, weights, return_shocks, vol_shocks, corr_shift)
        return {
            "stressed_portfolio_return": res.portfolio_return,
            "stressed_portfolio_variance": res.portfolio_var,
            "stressed_portfolio_volatility": np.sqrt(res.portfolio_var),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scenarios/probabilistic")
def post_scenarios_probabilistic(req: ProbabilisticScenarioRequest):
    """Probabilistic scenario optimization (M3 L4)."""
    try:
        R = [np.array(r) for r in req.scenario_returns]
        w = probabilistic_scenario_optimization(
            R, req.scenario_probs, req.target_return, req.long_only
        )
        return {"weights": w.tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scenarios/monte-carlo")
def post_scenarios_monte_carlo(req: MonteCarloRequest):
    """Monte Carlo portfolio simulation (M1 L2)."""
    try:
        res = monte_carlo_portfolio(
            np.array(req.returns),
            np.array(req.weights),
            req.portfolio_value,
            req.horizon_days,
            req.n_paths,
            req.use_t_dist,
            req.df,
        )
        return {
            "terminal_wealth_mean": res.terminal_wealth_mean,
            "terminal_wealth_std": res.terminal_wealth_std,
            "var_95": res.var_95,
            "var_99": res.var_99,
            "cvar_95": res.cvar_95,
            "cvar_99": res.cvar_99,
            "percentiles": res.percentiles,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scenarios/behavioral")
def post_scenarios_behavioral(req: BehavioralRequest):
    """Prospect Theory / herding simulation (M4)."""
    try:
        returns = np.array(req.returns)
        weights = np.array(req.weights)
        if req.mode == "herding":
            res = herding_stress_var(
                returns, weights, req.correlation_shift, req.alpha, req.portfolio_value
            )
            return {
                "base_var_95": res.base_var_95,
                "base_var_99": res.base_var_99,
                "stressed_var_95": res.stressed_var_95,
                "stressed_var_99": res.stressed_var_99,
                "correlation_shift": res.correlation_shift,
            }
        else:
            util = portfolio_perceived_utility(returns, weights)
            return {"perceived_utility": util}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/blotter/attribution")
def post_blotter_attribution(req: AttributionRequest):
    """Performance attribution: α, β·r_m, factor contributions, residual (M1 §4)."""
    try:
        factor_b = np.array(req.factor_betas) if req.factor_betas else None
        factor_r = np.array(req.factor_returns) if req.factor_returns else None
        res = performance_attribution(
            np.array(req.portfolio_returns),
            np.array(req.market_returns),
            req.risk_free_rate,
            factor_b,
            factor_r,
        )
        return {
            "alpha": res.alpha,
            "systematic_return": res.systematic_return,
            "factor_returns": res.factor_returns,
            "residual": res.residual,
            "total_return": res.total_return,
            "decomposition": res.decomposition,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/blotter/pnl")
def post_blotter_pnl(req: PnLRequest):
    """Cumulative P&L time series or current snapshot (Menu 8)."""
    try:
        store = get_trade_store()
        if req.price_history:
            series = store.get_pnl_timeseries(
                req.price_history, req.from_date, req.to_date
            )
            return {"timeseries": series}
        if req.current_prices:
            cum = store.get_cumulative_pnl(req.current_prices)
            positions = store.get_positions(req.current_prices)
            return {
                "cumulative_pnl": cum,
                "positions": [
                    {
                        "asset": p.asset,
                        "unrealized_pnl": p.unrealized_pnl,
                    }
                    for p in positions
                ],
            }
        raise HTTPException(status_code=400, detail="Provide price_history or current_prices")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
