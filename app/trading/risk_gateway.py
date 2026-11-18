"""
Pre-trade risk gateway — pure, deterministic checks every order must pass.

No order reaches a broker without `evaluate()` approving it, whoever sent it
(a person, a strategy or an LLM agent). The function has no side effects and
no I/O: given the same order, portfolio snapshot, quotes and limits it always
returns the same decision, with every check, its measured value and limit.

Design rules
- Fail closed: missing or stale prices reject the order.
- The kill switch blocks every new order.
- Loss breakers (drawdown, daily loss) and exposure limits still allow orders
  that *reduce* risk, so a position can always be cut. Per-order checks
  (fat-finger notional cap, price collar, rate limit, stale quotes) apply to
  every order: split a large exit into smaller orders.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Literal, Mapping, Optional, Sequence

import numpy as np
from pydantic import BaseModel, Field

from .instruments import Instrument
from .market_data import Quote

Z_99 = 2.3263478740408408  # one-sided 99% normal quantile


class RiskLimits(BaseModel):
    """Configurable limits. Monetary limits are in account currency."""

    max_order_notional: float = Field(100_000, gt=0)
    max_position_notional: float = Field(250_000, gt=0)
    max_gross_exposure_pct: float = Field(2.0, gt=0, description="gross / equity")
    max_concentration_pct: float = Field(0.25, gt=0, description="|underlying exposure| / equity")
    max_orders_per_minute: int = Field(30, gt=0)
    price_collar_bps: float = Field(200, gt=0, description="limit price vs mid")
    max_spread_bps: float = Field(500, gt=0)
    max_quote_age_seconds: float = Field(60, gt=0)
    max_drawdown_pct: float = Field(0.10, gt=0, description="from equity high-water mark")
    max_daily_loss_pct: float = Field(0.03, gt=0)
    var_limit_pct: float = Field(0.05, gt=0, description="1-day 99% VaR / equity, post-trade")
    max_abs_dollar_delta: float = Field(500_000, gt=0)
    max_abs_vega: float = Field(20_000, gt=0, description="$ per vol point")
    max_abs_dollar_gamma: float = Field(50_000, gt=0, description="$ per 1% spot move, squared term")
    allow_short: bool = True
    allowed_asset_classes: List[Literal["equity", "option"]] = ["equity", "option"]
    restricted_symbols: List[str] = []
    risk_free_rate: float = 0.04
    default_option_iv: float = 0.30
    fallback_daily_vol: float = 0.03


@dataclass(frozen=True)
class OrderProposal:
    instrument: Instrument
    side: Literal["buy", "sell"]
    quantity: float
    order_type: Literal["market", "limit"] = "market"
    limit_price: Optional[float] = None
    source: str = "manual"

    @property
    def signed_qty(self) -> float:
        return self.quantity if self.side == "buy" else -self.quantity


@dataclass(frozen=True)
class Holding:
    instrument: Instrument
    quantity: float  # signed


@dataclass
class PortfolioSnapshot:
    equity: float
    holdings: Dict[str, Holding] = field(default_factory=dict)
    peak_equity: Optional[float] = None
    day_start_equity: Optional[float] = None
    recent_order_times: Sequence[datetime] = ()
    # Daily returns per underlying for the VaR check (optional).
    returns_history: Mapping[str, Sequence[float]] = field(default_factory=dict)
    kill_switch: bool = False
    kill_switch_reason: Optional[str] = None
    today: Optional[date] = None


@dataclass(frozen=True)
class CheckResult:
    name: str
    passed: bool
    detail: str
    value: Optional[float] = None
    limit: Optional[float] = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items()}


@dataclass(frozen=True)
class RiskDecision:
    approved: bool
    checks: List[CheckResult]
    reference_price: Optional[float]
    order_notional: Optional[float]
    risk_reducing: bool

    @property
    def failures(self) -> List[CheckResult]:
        return [c for c in self.checks if not c.passed]

    @property
    def reason(self) -> str:
        return "; ".join(f"{c.name}: {c.detail}" for c in self.failures) or "approved"

    def to_dict(self) -> dict:
        return {
            "approved": self.approved,
            "reason": self.reason,
            "reference_price": self.reference_price,
            "order_notional": self.order_notional,
            "risk_reducing": self.risk_reducing,
            "checks": [c.to_dict() for c in self.checks],
        }


# ── Exposure model ────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Exposure:
    """Per-unit exposures of one instrument, in account currency."""

    price: float  # instrument price per unit (premium for options)
    dollar_delta: float  # $ change per 1.00 move of the underlying × S, i.e. delta·S·mult
    vega: float  # $ per vol point per unit
    dollar_gamma: float  # ½·Γ·(0.01·S)²·mult per unit (P&L of a 1% move from gamma)


def _greeks(inst: Instrument, s: float, sigma: float, r: float, today: Optional[date]):
    try:
        import pricing_engine as pe
    except ImportError:  # pragma: no cover
        import pricing_engine_mock as pe  # type: ignore
    tau = max(inst.years_to_expiry(today), 1.0 / 365.0)
    k = inst.option.strike
    fn = pe.calculate_bs_call_greeks if inst.option.right == "call" else pe.calculate_bs_put_greeks
    return fn(s, k, tau, r, sigma)


def instrument_exposure(
    inst: Instrument,
    quotes: Mapping[str, Quote],
    limits: RiskLimits,
    today: Optional[date] = None,
) -> Optional[Exposure]:
    """Per-unit exposure, or None if a needed price is missing."""
    q = quotes.get(inst.symbol)
    if inst.asset_class == "equity":
        if q is None or q.mid <= 0:
            return None
        return Exposure(price=q.mid, dollar_delta=q.mid, vega=0.0, dollar_gamma=0.0)
    u = quotes.get(inst.underlying)
    s = (q.underlying_price if q and q.underlying_price else None) or (u.mid if u else None)
    if q is None or q.mid <= 0 or not s or s <= 0:
        return None
    sigma = q.implied_vol or limits.default_option_iv
    g = _greeks(inst, s, sigma, limits.risk_free_rate, today)
    m = inst.multiplier
    return Exposure(
        price=q.mid,
        dollar_delta=g.delta * s * m,
        vega=g.vega * m,  # engine vega is per vol point
        dollar_gamma=0.5 * g.gamma * (0.01 * s) ** 2 * m,
    )


# ── Gateway ───────────────────────────────────────────────────────────────────


def _bps(a: float, b: float) -> float:
    return abs(a - b) / b * 1e4 if b else math.inf


def _portfolio_var(
    exposures_by_underlying: Mapping[str, float],
    returns: Mapping[str, Sequence[float]],
    fallback_vol: float,
) -> float:
    """1-day 99% delta-normal VaR of $ delta exposures by underlying."""
    names = [k for k, v in exposures_by_underlying.items() if v]
    if not names:
        return 0.0
    w = np.array([exposures_by_underlying[n] for n in names])
    have = [n for n in names if len(returns.get(n, ())) >= 20]
    cov = np.diag([fallback_vol**2] * len(names))
    if have:
        length = min(len(returns[n]) for n in have)
        r = np.array([np.asarray(returns[n][-length:], dtype=float) for n in have])
        sub = np.cov(r) if len(have) > 1 else np.array([[np.var(r[0], ddof=1)]])
        idx = [names.index(n) for n in have]
        for a, i in enumerate(idx):
            for b, j in enumerate(idx):
                cov[i, j] = sub[a, b]
    var = float(w @ cov @ w)
    return Z_99 * math.sqrt(max(var, 0.0))


def evaluate(
    order: OrderProposal,
    portfolio: PortfolioSnapshot,
    quotes: Mapping[str, Quote],
    limits: RiskLimits,
    now: Optional[datetime] = None,
) -> RiskDecision:
    now = now or datetime.now(timezone.utc)
    checks: List[CheckResult] = []

    def add(name: str, passed: bool, detail: str, value=None, limit=None) -> None:
        checks.append(CheckResult(name, bool(passed), detail, value, limit))

    inst = order.instrument
    sym = inst.symbol

    # 1. Kill switch — blocks everything.
    add(
        "kill_switch",
        not portfolio.kill_switch,
        f"trading halted: {portfolio.kill_switch_reason or 'kill switch on'}"
        if portfolio.kill_switch
        else "off",
    )

    # 2. Static order validity.
    valid = order.quantity > 0 and math.isfinite(order.quantity)
    if order.order_type == "limit":
        valid = valid and order.limit_price is not None and order.limit_price > 0
    add("order_valid", valid, "ok" if valid else "quantity must be > 0 and limit orders need a positive limit price")
    add(
        "asset_class_allowed",
        inst.asset_class in limits.allowed_asset_classes,
        f"{inst.asset_class} {'allowed' if inst.asset_class in limits.allowed_asset_classes else 'not allowed'}",
    )
    restricted = {s.upper() for s in limits.restricted_symbols}
    is_restricted = sym.upper() in restricted or inst.underlying.upper() in restricted
    add("restricted_list", not is_restricted, "restricted symbol" if is_restricted else "ok")

    # 3. Market data present, fresh and sane.
    q = quotes.get(sym)
    exp = instrument_exposure(inst, quotes, limits, portfolio.today)
    if q is None or exp is None:
        add("market_data", False, f"no usable quote for {sym}" + (f" / {inst.underlying}" if inst.option else ""))
        return RiskDecision(False, checks, None, None, False)
    age = q.age_seconds(now)
    add("quote_fresh", age <= limits.max_quote_age_seconds, f"quote age {age:.0f}s", age, limits.max_quote_age_seconds)
    spread_bps = q.spread / q.mid * 1e4 if q.mid else math.inf
    add("spread", spread_bps <= limits.max_spread_bps, f"spread {spread_bps:.0f} bps", spread_bps, limits.max_spread_bps)

    # Conservative execution price: buys at the ask, sells at the bid.
    ref = (q.ask if order.side == "buy" else q.bid) or q.mid
    if order.order_type == "limit" and order.limit_price:
        collar = _bps(order.limit_price, q.mid)
        add(
            "price_collar",
            collar <= limits.price_collar_bps,
            f"limit {order.limit_price:.4f} is {collar:.0f} bps from mid {q.mid:.4f}",
            collar,
            limits.price_collar_bps,
        )
        ref = min(ref, order.limit_price) if order.side == "buy" else max(ref, order.limit_price)
    notional = abs(order.quantity) * ref * inst.multiplier
    add("order_notional", notional <= limits.max_order_notional, f"${notional:,.0f}", notional, limits.max_order_notional)

    # 4. Rate limit.
    window = [t for t in portfolio.recent_order_times if now - t <= timedelta(seconds=60)]
    add(
        "order_rate",
        len(window) < limits.max_orders_per_minute,
        f"{len(window)} orders in the last minute",
        len(window),
        limits.max_orders_per_minute,
    )

    # 5. Position & portfolio effects (pre vs post trade).
    held = portfolio.holdings.get(sym)
    pre_qty = held.quantity if held else 0.0
    post_qty = pre_qty + order.signed_qty
    risk_reducing = abs(post_qty) < abs(pre_qty) and pre_qty * post_qty >= 0

    if not limits.allow_short and post_qty < 0 and inst.asset_class == "equity":
        add("no_short", False, "short selling disabled")

    pos_notional = abs(post_qty) * exp.price * inst.multiplier
    add(
        "position_notional",
        risk_reducing or pos_notional <= limits.max_position_notional,
        f"post-trade ${pos_notional:,.0f}",
        pos_notional,
        limits.max_position_notional,
    )

    equity = portfolio.equity
    if equity <= 0:
        add("equity_positive", risk_reducing, f"equity {equity:,.0f}")
        equity = 1e-9

    # Aggregate exposures post-trade.
    post_holdings = dict(portfolio.holdings)
    post_holdings[sym] = Holding(inst, post_qty)
    gross = 0.0
    delta_by_und: Dict[str, float] = {}
    pre_delta_by_und: Dict[str, float] = {}
    vega = gamma = 0.0
    missing = []
    for hsym, h in post_holdings.items():
        e = exp if hsym == sym else instrument_exposure(h.instrument, quotes, limits, portfolio.today)
        if e is None:
            missing.append(hsym)
            continue
        gross += abs(h.quantity) * e.price * h.instrument.multiplier
        d = h.quantity * e.dollar_delta
        delta_by_und[h.instrument.underlying] = delta_by_und.get(h.instrument.underlying, 0.0) + d
        vega += h.quantity * e.vega
        gamma += h.quantity * e.dollar_gamma
        pre_q = portfolio.holdings[hsym].quantity if hsym in portfolio.holdings else 0.0
        pre_delta_by_und[h.instrument.underlying] = (
            pre_delta_by_und.get(h.instrument.underlying, 0.0) + pre_q * e.dollar_delta
        )
    if missing:
        add("portfolio_prices", False, f"no price for held {', '.join(sorted(missing))}")

    gross_pct = gross / equity
    add(
        "gross_exposure",
        risk_reducing or gross_pct <= limits.max_gross_exposure_pct,
        f"post-trade gross {gross_pct:.2f}× equity",
        gross_pct,
        limits.max_gross_exposure_pct,
    )
    und = inst.underlying
    conc = abs(delta_by_und.get(und, 0.0)) / equity
    add(
        "concentration",
        risk_reducing or conc <= limits.max_concentration_pct,
        f"{und} exposure {conc:.1%} of equity",
        conc,
        limits.max_concentration_pct,
    )
    net_delta = sum(delta_by_und.values())
    add(
        "dollar_delta",
        risk_reducing or abs(net_delta) <= limits.max_abs_dollar_delta,
        f"net ${net_delta:,.0f} delta",
        abs(net_delta),
        limits.max_abs_dollar_delta,
    )
    add("vega", risk_reducing or abs(vega) <= limits.max_abs_vega, f"net ${vega:,.0f} per vol pt", abs(vega), limits.max_abs_vega)
    add(
        "dollar_gamma",
        risk_reducing or abs(gamma) <= limits.max_abs_dollar_gamma,
        f"net ${gamma:,.0f} gamma P&L per 1% move",
        abs(gamma),
        limits.max_abs_dollar_gamma,
    )

    var_post = _portfolio_var(delta_by_und, portfolio.returns_history, limits.fallback_daily_vol)
    var_pre = _portfolio_var(pre_delta_by_und, portfolio.returns_history, limits.fallback_daily_vol)
    var_pct = var_post / equity
    add(
        "var_budget",
        var_post <= var_pre or var_pct <= limits.var_limit_pct,
        f"post-trade 1d 99% VaR ${var_post:,.0f} ({var_pct:.2%} of equity)",
        var_pct,
        limits.var_limit_pct,
    )

    # 6. Loss breakers.
    if portfolio.peak_equity:
        dd = max(0.0, 1 - portfolio.equity / portfolio.peak_equity)
        add(
            "drawdown_breaker",
            risk_reducing or dd < limits.max_drawdown_pct,
            f"drawdown {dd:.2%} from high-water mark",
            dd,
            limits.max_drawdown_pct,
        )
    if portfolio.day_start_equity:
        dl = max(0.0, 1 - portfolio.equity / portfolio.day_start_equity)
        add(
            "daily_loss_breaker",
            risk_reducing or dl < limits.max_daily_loss_pct,
            f"down {dl:.2%} today",
            dl,
            limits.max_daily_loss_pct,
        )

    approved = all(c.passed for c in checks)
    return RiskDecision(approved, checks, ref, notional, risk_reducing)
