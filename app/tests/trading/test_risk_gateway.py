"""Pre-trade risk gateway: each check, fail-closed behaviour, risk-reducing exemptions."""

from datetime import date, datetime, timedelta, timezone

import numpy as np
import pytest

from app.trading.instruments import Instrument, OptionSpec, equity
from app.trading.market_data import StaticProvider
from app.trading.risk_gateway import Holding, OrderProposal, PortfolioSnapshot, RiskLimits, evaluate

NOW = datetime(2026, 11, 18, 15, 0, tzinfo=timezone.utc)


def quotes(**kw):
    p = StaticProvider()
    for sym, (bid, ask) in kw.items():
        p.set(sym, bid, ask, ts=NOW - timedelta(seconds=1))
    return {s: p.quote(s) for s in kw}


QS = quotes(AAPL=(199.95, 200.05), SPY=(499.95, 500.05))


def snap(**kw):
    base = dict(equity=1_000_000, peak_equity=1_000_000, day_start_equity=1_000_000)
    base.update(kw)
    return PortfolioSnapshot(**base)


def buy(sym="AAPL", qty=100, **kw):
    return OrderProposal(equity(sym), "buy", qty, **kw)


def failed(decision):
    return {c.name for c in decision.failures}


def test_small_order_is_approved_with_every_check_recorded():
    d = evaluate(buy(), snap(), QS, RiskLimits(), NOW)
    assert d.approved, d.reason
    names = {c.name for c in d.checks}
    assert {"kill_switch", "order_notional", "concentration", "var_budget", "drawdown_breaker"} <= names
    assert d.reference_price == pytest.approx(200.05)  # buys priced at the ask


def test_kill_switch_blocks_everything_even_risk_reducing():
    held = {"AAPL": Holding(equity("AAPL"), 100)}
    sell = OrderProposal(equity("AAPL"), "sell", 50)
    d = evaluate(sell, snap(holdings=held, kill_switch=True, kill_switch_reason="ops"), QS, RiskLimits(), NOW)
    assert not d.approved and "kill_switch" in failed(d)
    assert "ops" in d.reason


@pytest.mark.parametrize(
    "order,limits,check",
    [
        (buy(qty=1000), RiskLimits(max_order_notional=100_000), "order_notional"),
        (buy(qty=1500), RiskLimits(max_position_notional=250_000, max_order_notional=1e9), "position_notional"),
        (buy(qty=2000), RiskLimits(max_concentration_pct=0.25, max_order_notional=1e9, max_position_notional=1e9), "concentration"),
        (buy(order_type="limit", limit_price=210.0), RiskLimits(price_collar_bps=200), "price_collar"),
        (buy(), RiskLimits(restricted_symbols=["aapl"]), "restricted_list"),
        (OrderProposal(equity("AAPL"), "sell", 10), RiskLimits(allow_short=False), "no_short"),
        (buy(qty=0), RiskLimits(), "order_valid"),
        (buy(order_type="limit"), RiskLimits(), "order_valid"),
    ],
)
def test_each_limit_rejects(order, limits, check):
    d = evaluate(order, snap(), QS, limits, NOW)
    assert not d.approved
    assert check in failed(d), d.reason


def test_missing_or_stale_quote_fails_closed():
    d = evaluate(buy("ZZZZ"), snap(), QS, RiskLimits(), NOW)
    assert not d.approved and "market_data" in failed(d)
    stale = quotes(AAPL=(199.95, 200.05))
    d = evaluate(buy(), snap(), stale, RiskLimits(max_quote_age_seconds=60), NOW + timedelta(minutes=5))
    assert "quote_fresh" in failed(d)


def test_wide_spread_rejected():
    wide = quotes(AAPL=(190, 210))
    assert "spread" in failed(evaluate(buy(), snap(), wide, RiskLimits(max_spread_bps=500), NOW))


def test_rate_limit():
    times = [NOW - timedelta(seconds=i) for i in range(30)]
    d = evaluate(buy(), snap(recent_order_times=times), QS, RiskLimits(max_orders_per_minute=30), NOW)
    assert "order_rate" in failed(d)
    old = [NOW - timedelta(minutes=5)] * 100
    assert evaluate(buy(), snap(recent_order_times=old), QS, RiskLimits(), NOW).approved


def test_drawdown_breaker_blocks_new_risk_but_allows_reducing():
    held = {"AAPL": Holding(equity("AAPL"), 1000)}
    s = snap(equity=880_000, peak_equity=1_000_000, holdings=held)
    d = evaluate(buy(qty=10), s, QS, RiskLimits(max_drawdown_pct=0.10), NOW)
    assert "drawdown_breaker" in failed(d)
    reduce = OrderProposal(equity("AAPL"), "sell", 500)
    d = evaluate(reduce, s, QS, RiskLimits(max_drawdown_pct=0.10), NOW)
    assert d.approved and d.risk_reducing, d.reason


def test_daily_loss_breaker():
    s = snap(equity=960_000, day_start_equity=1_000_000)
    assert "daily_loss_breaker" in failed(evaluate(buy(), s, QS, RiskLimits(max_daily_loss_pct=0.03), NOW))


def test_flip_is_not_risk_reducing():
    held = {"AAPL": Holding(equity("AAPL"), 100)}
    d = evaluate(OrderProposal(equity("AAPL"), "sell", 300), snap(holdings=held), QS, RiskLimits(), NOW)
    assert not d.risk_reducing


def test_var_budget_uses_return_history():
    rng = np.random.default_rng(0)
    hist = {"AAPL": list(rng.normal(0, 0.02, 250))}
    # 1,200 shares ≈ $240k; 99% 1d VaR ≈ 2.33 × 2% × 240k ≈ $11.2k = 1.1% of equity
    d = evaluate(buy(qty=1200), snap(returns_history=hist), QS, RiskLimits(var_limit_pct=0.01, max_order_notional=1e9, max_position_notional=1e9), NOW)
    assert "var_budget" in failed(d)
    var_check = next(c for c in d.checks if c.name == "var_budget")
    assert var_check.value == pytest.approx(2.326 * 0.02 * 1200 * 200 / 1e6, rel=0.15)


def test_hedging_trade_passes_var_even_over_budget():
    rng = np.random.default_rng(1)
    hist = {"AAPL": list(rng.normal(0, 0.02, 250))}
    held = {"AAPL": Holding(equity("AAPL"), 2000)}
    reduce = OrderProposal(equity("AAPL"), "sell", 1000)
    lim = RiskLimits(var_limit_pct=0.001, max_order_notional=1e9)
    d = evaluate(reduce, snap(holdings=held, returns_history=hist), QS, lim, NOW)
    assert d.approved, d.reason


def test_fat_finger_cap_applies_even_to_risk_reducing_orders():
    held = {"AAPL": Holding(equity("AAPL"), 2000)}
    reduce = OrderProposal(equity("AAPL"), "sell", 1000)  # $200k
    d = evaluate(reduce, snap(holdings=held), QS, RiskLimits(max_order_notional=100_000), NOW)
    assert d.risk_reducing and "order_notional" in failed(d)


def test_option_greeks_limits():
    opt = Instrument(
        symbol="SPY261218C00500000",
        asset_class="option",
        option=OptionSpec(underlying="SPY", strike=500, expiry=date(2026, 12, 18), right="call"),
    )
    assert opt.multiplier == 100
    q = quotes(SPY=(499.95, 500.05), SPY261218C00500000=(14.9, 15.1))
    q["SPY261218C00500000"] = q["SPY261218C00500000"].__class__(
        **{**q["SPY261218C00500000"].__dict__, "implied_vol": 0.2}
    )
    order = OrderProposal(opt, "buy", 50)
    d = evaluate(order, snap(today=date(2026, 11, 18)), q, RiskLimits(max_abs_vega=1_000), NOW)
    vega = next(c for c in d.checks if c.name == "vega")
    assert not vega.passed and vega.value > 1_000
    delta = next(c for c in d.checks if c.name == "dollar_delta")
    # ATM call delta ≈ 0.53 → 50 contracts × 100 × 500 × 0.53 ≈ $1.3M
    assert 1.0e6 < delta.value < 1.6e6


def test_decision_is_deterministic():
    a = evaluate(buy(), snap(), QS, RiskLimits(), NOW).to_dict()
    b = evaluate(buy(), snap(), QS, RiskLimits(), NOW).to_dict()
    assert a == b
