"""OMS: state machine, idempotency, fills, approvals, kill switch, reconciliation, audit chain."""

import threading

import httpx
import pytest
from sqlalchemy import update

from app.trading import audit, db
from app.trading.brokers.alpaca import AlpacaBroker
from app.trading.brokers.base import BrokerOrder
from app.trading.instruments import equity
from app.trading.models import AuditEvent, OrderStatus
from app.trading.oms import IdempotencyConflict, IllegalTransition, OMSError, OrderRequest
from app.trading.risk_gateway import RiskLimits


def req(coid="o-1", sym="AAPL", side="buy", qty=100, **kw):
    return OrderRequest(client_order_id=coid, instrument=equity(sym), side=side, quantity=qty, **kw)


def test_market_order_fills_and_updates_positions(oms):
    o = oms.submit(req(), actor="tester")
    assert o["status"] == OrderStatus.FILLED
    assert o["filled_quantity"] == 100 and o["avg_fill_price"] == pytest.approx(200.05)
    (pos,) = [p for p in oms.positions() if p["asset"] == "AAPL"]
    assert pos["quantity"] == 100 and pos["direction"] == "long"
    # equity = start − fee (marked at mid 200.00 vs fill 200.05)
    assert oms.equity() == pytest.approx(1_000_000 - 1.0 - 100 * 0.05)


def test_idempotent_resubmit_returns_same_order(oms):
    a = oms.submit(req("dup"), actor="t")
    b = oms.submit(req("dup"), actor="t")
    assert a["id"] == b["id"]
    assert len(oms.fills()) == 1
    with pytest.raises(IdempotencyConflict):
        oms.submit(req("dup", qty=101), actor="t")


def test_concurrent_duplicate_submissions_create_one_order(oms):
    results, errors = [], []

    def go():
        try:
            results.append(oms.submit(req("race"), actor="t")["id"])
        except Exception as e:  # pragma: no cover - diagnostic
            errors.append(e)

    threads = [threading.Thread(target=go) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors, errors
    assert len(set(results)) == 1
    assert len(oms.fills()) == 1


def test_risk_rejection_is_recorded_and_never_reaches_broker(oms):
    o = oms.submit(req(qty=10_000), actor="t")
    assert o["status"] == OrderStatus.REJECTED
    assert "order_notional" in o["reject_reason"]
    assert o["broker_order_id"] is None
    assert oms.broker.positions() == {}
    assert any(not c["passed"] for c in o["risk_decision"]["checks"])


def test_limit_order_rests_then_fills_when_marketable(oms, md):
    o = oms.submit(req("lmt", order_type="limit", limit_price=199.0), actor="t")
    assert o["status"] == OrderStatus.SUBMITTED
    md.set("AAPL", 198.80, 198.90)
    assert oms.sync_fills() == 1
    o = oms.get_order(o["id"])
    assert o["status"] == OrderStatus.FILLED and o["avg_fill_price"] == pytest.approx(198.90)
    assert oms.sync_fills() == 0  # fills applied once


def test_cancel_resting_order_and_illegal_transitions(oms):
    o = oms.submit(req("c1", order_type="limit", limit_price=199.0), actor="t")
    c = oms.cancel(o["id"], actor="t")
    assert c["status"] == OrderStatus.CANCELLED
    with pytest.raises(IllegalTransition):
        oms.cancel(o["id"], actor="t")
    filled = oms.submit(req("c2"), actor="t")
    with pytest.raises(IllegalTransition):
        oms.cancel(filled["id"], actor="t")


def test_pending_approval_flow_rechecks_risk(oms, md):
    o = oms.submit(req("ap1"), actor="agent", require_approval=True)
    assert o["status"] == OrderStatus.PENDING_APPROVAL
    assert oms.broker.positions() == {}
    done = oms.approve(o["id"], actor="human")
    assert done["status"] == OrderStatus.FILLED

    # Kill switch turned on while waiting → approval re-check rejects
    o2 = oms.submit(req("ap2"), actor="agent", require_approval=True)
    oms.set_kill_switch(True, actor="ops", reason="incident", cancel_open=False)
    rej = oms.approve(o2["id"], actor="human")
    assert rej["status"] == OrderStatus.REJECTED and "kill_switch" in rej["reject_reason"]


def test_human_reject(oms):
    o = oms.submit(req("hr"), actor="agent", require_approval=True)
    r = oms.reject(o["id"], actor="human", reason="not today")
    assert r["status"] == OrderStatus.REJECTED and "not today" in r["reject_reason"]


def test_kill_switch_blocks_and_cancels_open_orders(oms):
    resting = oms.submit(req("k1", order_type="limit", limit_price=199.0), actor="t")
    pending = oms.submit(req("k2"), actor="agent", require_approval=True)
    oms.set_kill_switch(True, actor="ops", reason="halt")
    assert oms.get_order(resting["id"])["status"] == OrderStatus.CANCELLED
    assert oms.get_order(pending["id"])["status"] == OrderStatus.CANCELLED
    blocked = oms.submit(req("k3"), actor="t")
    assert blocked["status"] == OrderStatus.REJECTED and "halt" in blocked["reject_reason"]
    oms.set_kill_switch(False, actor="ops")
    assert oms.submit(req("k4"), actor="t")["status"] == OrderStatus.FILLED


def test_limits_are_persisted_and_audited(oms):
    oms.set_limits(RiskLimits(max_order_notional=1_000), actor="admin")
    assert oms.get_limits().max_order_notional == 1_000
    assert oms.submit(req("lim", qty=10), actor="t")["status"] == OrderStatus.REJECTED
    with db.session_scope() as s:
        kinds = [e["kind"] for e in audit.recent(s, 50)]
    assert "risk.limits_changed" in kinds


def test_live_broker_requires_explicit_opt_in(oms, monkeypatch):
    oms.broker.live = True
    monkeypatch.delenv("TRADING_ALLOW_LIVE", raising=False)
    o = oms.submit(req("live1"), actor="t")
    assert o["status"] == OrderStatus.REJECTED and "TRADING_ALLOW_LIVE" in o["reject_reason"]
    monkeypatch.setenv("TRADING_ALLOW_LIVE", "true")
    assert oms.submit(req("live2"), actor="t")["status"] == OrderStatus.FILLED


def test_reconciliation_detects_breaks_and_can_halt(oms, monkeypatch):
    oms.submit(req("r1"), actor="t")
    assert oms.reconcile().ok
    oms.broker._positions["AAPL"] = 150.0  # broker drifted
    monkeypatch.setenv("TRADING_HALT_ON_RECON_BREAK", "true")
    rep = oms.reconcile()
    assert not rep.ok and rep.breaks["AAPL"]["diff"] == 50
    assert oms.kill_switch()["on"] is True


def test_audit_chain_verifies_and_detects_tampering(oms):
    oms.submit(req("a1"), actor="t")
    oms.submit(req("a2", qty=10_000), actor="t")
    with db.session_scope() as s:
        ok = audit.verify_chain(s)
        assert ok["ok"] and ok["events"] >= 5
    with db.session_scope() as s:
        s.execute(update(AuditEvent).where(AuditEvent.seq == 2).values(payload_json='{"approved":true}'))
    with db.session_scope() as s:
        bad = audit.verify_chain(s)
        assert not bad["ok"] and bad["broken_at"] == 2


def test_production_requires_postgres(monkeypatch):
    from app.trading.db import TradingUnavailable, check_configuration

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("TRADING_DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(TradingUnavailable):
        check_configuration()
    monkeypatch.setenv("DATABASE_URL", "sqlite:///x.db")
    with pytest.raises(TradingUnavailable):
        check_configuration()
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@db/trading")
    assert check_configuration().startswith("postgresql")


# ── Alpaca adapter (HTTP mocked) ─────────────────────────────────────────────


def _alpaca(handler, live=False):
    return AlpacaBroker("kid", "secret", live=live, transport=httpx.MockTransport(handler))


def test_alpaca_submit_request_shape_and_paper_default():
    seen = {}

    def handler(request: httpx.Request):
        seen["url"] = str(request.url)
        seen["headers"] = dict(request.headers)
        seen["body"] = request.read().decode()
        return httpx.Response(200, json={"id": "alp-1", "status": "accepted"})

    b = _alpaca(handler)
    ack = b.submit(BrokerOrder("c-1", "AAPL", "buy", 10, "limit", 199.5, "day"))
    assert ack.accepted and ack.broker_order_id == "alp-1" and ack.status == "submitted"
    assert seen["url"].startswith("https://paper-api.alpaca.markets/v2/orders")
    assert seen["headers"]["apca-api-key-id"] == "kid"
    assert '"limit_price":"199.5"' in seen["body"].replace(" ", "") and '"client_order_id":"c-1"' in seen["body"].replace(" ", "")
    assert not b.live


def test_alpaca_rejection_positions_and_fills():
    def handler(request: httpx.Request):
        path = request.url.path
        if path == "/v2/orders":
            return httpx.Response(403, json={"message": "insufficient buying power"})
        if path == "/v2/positions":
            return httpx.Response(200, json=[{"symbol": "AAPL", "qty": "5", "side": "long"}, {"symbol": "TSLA", "qty": "3", "side": "short"}])
        if path == "/v2/account/activities/FILL":
            return httpx.Response(200, json=[{"id": "f1", "order_id": "alp-1", "qty": "10", "price": "199.4", "transaction_time": "2026-11-18T15:00:00Z"}])
        return httpx.Response(404)

    b = _alpaca(handler)
    ack = b.submit(BrokerOrder("c-2", "AAPL", "buy", 10_000, "market", None, "day"))
    assert not ack.accepted and "buying power" in ack.reason
    assert b.positions() == {"AAPL": 5.0, "TSLA": -3.0}
    (f,) = b.fills_since(None)
    assert f.broker_order_id == "alp-1" and f.price == 199.4


def test_alpaca_refuses_options_and_needs_credentials(monkeypatch):
    b = _alpaca(lambda r: httpx.Response(500))
    assert not b.submit(BrokerOrder("c", "SPY", "buy", 1, "market", None, "day", "option")).accepted
    monkeypatch.delenv("ALPACA_API_KEY_ID", raising=False)
    from app.trading.brokers.base import BrokerError

    with pytest.raises(BrokerError):
        AlpacaBroker()
