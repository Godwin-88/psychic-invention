"""
Order management system.

Flow:  submit → NEW → risk gateway ─┬─ rejected ─→ REJECTED
                                     ├─ needs human (L2) → PENDING_APPROVAL ─ approve ─┐
                                     └────────────────────────────────────────────────┴→ broker
       broker ack → SUBMITTED → (PARTIALLY_FILLED)* → FILLED | CANCELLED | EXPIRED

Guarantees
- Idempotency: `client_order_id` is unique. Re-submitting the same key returns
  the original order; re-using it with different parameters is an error.
- Every order passes `risk_gateway.evaluate` immediately before it is sent,
  including after approval (state may have changed while it waited).
- Fills are applied once (unique broker_fill_id); positions are derived from
  fills with the FIFO position engine, never stored separately.
- Every state change and decision is appended to the hash-chained audit log.
- Live brokers require TRADING_ALLOW_LIVE=true.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Callable, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.blotter.position_engine import build_books, pnl_totals, position_views

from . import audit
from .brokers.base import BrokerAdapter, BrokerError, BrokerFill, BrokerOrder
from .db import session_scope
from .instruments import Instrument
from .market_data import MarketDataProvider, Quote
from .models import Fill, Order, OrderStatus, RiskConfig, utcnow
from .risk_gateway import Holding, OrderProposal, PortfolioSnapshot, RiskDecision, RiskLimits, evaluate


class OrderRequest(BaseModel):
    client_order_id: str = Field(..., min_length=1, max_length=128, description="idempotency key")
    instrument: Instrument
    side: Literal["buy", "sell"]
    quantity: float = Field(..., gt=0)
    order_type: Literal["market", "limit"] = "market"
    limit_price: Optional[float] = Field(None, gt=0)
    time_in_force: Literal["day", "gtc", "ioc"] = "day"
    account: str = "default"

    @model_validator(mode="after")
    def _limit_needs_price(self) -> "OrderRequest":
        if self.order_type == "limit" and self.limit_price is None:
            raise ValueError("limit orders need limit_price")
        return self

    def fingerprint(self) -> str:
        d = self.model_dump(mode="json")
        d.pop("client_order_id")
        return audit.canonical(d)


class OMSError(RuntimeError):
    pass


class IdempotencyConflict(OMSError):
    pass


class IllegalTransition(OMSError):
    pass


def _d(x) -> Decimal:
    return Decimal(str(x))


def _f(x) -> Optional[float]:
    return None if x is None else float(x)


def order_to_dict(o: Order) -> dict:
    return {
        "id": o.id,
        "client_order_id": o.client_order_id,
        "symbol": o.symbol,
        "instrument": json.loads(o.instrument_json),
        "side": o.side,
        "quantity": _f(o.quantity),
        "order_type": o.order_type,
        "limit_price": _f(o.limit_price),
        "time_in_force": o.time_in_force,
        "status": o.status,
        "filled_quantity": _f(o.filled_quantity),
        "avg_fill_price": _f(o.avg_fill_price),
        "broker": o.broker,
        "broker_order_id": o.broker_order_id,
        "source": o.source,
        "intent_id": o.intent_id,
        "reference_price": _f(o.reference_price),
        "reject_reason": o.reject_reason,
        "risk_decision": json.loads(o.risk_decision_json) if o.risk_decision_json else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


@dataclass
class ReconciliationReport:
    ok: bool
    breaks: Dict[str, Dict[str, float]]
    ledger: Dict[str, float]
    broker: Dict[str, float]


class OrderManager:
    def __init__(
        self,
        broker: BrokerAdapter,
        market_data: MarketDataProvider,
        starting_equity: Optional[float] = None,
        default_limits: Optional[RiskLimits] = None,
        returns_provider: Optional[Callable[[List[str]], Dict[str, List[float]]]] = None,
        clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ):
        self.broker = broker
        self.md = market_data
        self.starting_equity = float(
            starting_equity if starting_equity is not None else os.getenv("TRADING_STARTING_EQUITY", "1000000")
        )
        self.default_limits = default_limits or RiskLimits()
        self.returns_provider = returns_provider
        self.clock = clock

    # ── risk configuration & kill switch ────────────────────────────────────
    def _risk_row(self, s: Session) -> RiskConfig:
        row = s.get(RiskConfig, "default")
        if row is None:
            row = RiskConfig(key="default", limits_json=self.default_limits.model_dump_json(), kill_switch=False)
            s.add(row)
            s.flush()
        return row

    def get_limits(self) -> RiskLimits:
        with session_scope() as s:
            return RiskLimits.model_validate_json(self._risk_row(s).limits_json)

    def set_limits(self, limits: RiskLimits, actor: str) -> RiskLimits:
        with session_scope() as s:
            row = self._risk_row(s)
            old = json.loads(row.limits_json)
            row.limits_json = limits.model_dump_json()
            row.updated_by = actor
            audit.record(s, actor, "risk.limits_changed", {"old": old, "new": limits.model_dump()})
        return limits

    def kill_switch(self) -> Dict[str, object]:
        with session_scope() as s:
            row = self._risk_row(s)
            return {"on": row.kill_switch, "reason": row.kill_switch_reason, "updated_by": row.updated_by}

    def set_kill_switch(self, on: bool, actor: str, reason: str = "", cancel_open: bool = True) -> Dict[str, object]:
        with session_scope() as s:
            row = self._risk_row(s)
            row.kill_switch = on
            row.kill_switch_reason = reason or None
            row.updated_by = actor
            audit.record(s, actor, "risk.kill_switch", {"on": on, "reason": reason})
        if on and cancel_open:
            for o in self.list_orders(statuses=list(OrderStatus.OPEN | {OrderStatus.PENDING_APPROVAL})):
                try:
                    self.cancel(o["id"], actor=actor, reason="kill switch")
                except OMSError:
                    pass
        return self.kill_switch()

    # ── portfolio state (from fills) ─────────────────────────────────────────
    def _fills_as_trades(self, s: Session) -> List[dict]:
        rows = s.execute(select(Fill, Order).join(Order, Fill.order_id == Order.id).order_by(Fill.ts, Fill.id)).all()
        out = []
        for f, o in rows:
            inst = Instrument.model_validate_json(o.instrument_json)
            out.append(
                {
                    "asset": o.symbol,
                    "direction": "long" if o.side == "buy" else "short",
                    "quantity": f.quantity,
                    "entry_price": f.price,
                    "entry_date": f.ts.date().isoformat() if f.ts else "",
                    "fees": f.fee,
                    "multiplier": inst.multiplier,
                    "_instrument": inst,
                }
            )
        return out

    def _instruments(self, trades: List[dict]) -> Dict[str, Instrument]:
        return {t["asset"]: t["_instrument"] for t in trades}

    def _quotes_for(self, symbols) -> Dict[str, Quote]:
        out = {}
        for sym in symbols:
            q = self.md.quote(sym)
            if q is not None:
                out[sym] = q
        return out

    def positions(self) -> List[dict]:
        with session_scope() as s:
            trades = self._fills_as_trades(s)
        insts = self._instruments(trades)
        quotes = self._quotes_for(set(insts) | {i.underlying for i in insts.values()})
        books = build_books(trades)
        views = position_views(books, {k: q.mid for k, q in quotes.items()}, include_flat=True)
        return [{**v.to_dict(), "instrument": insts[v.asset].model_dump(mode="json")} for v in views]

    def equity(self, s: Optional[Session] = None) -> float:
        def calc(sess: Session) -> float:
            trades = self._fills_as_trades(sess)
            insts = self._instruments(trades)
            quotes = self._quotes_for(set(insts))
            totals = pnl_totals(build_books(trades), {k: q.mid for k, q in quotes.items()})
            return self.starting_equity + totals["net_pnl"]

        if s is not None:
            return calc(s)
        with session_scope() as sess:
            return calc(sess)

    def snapshot(self, s: Session, extra_symbols=()) -> tuple[PortfolioSnapshot, Dict[str, Quote]]:
        trades = self._fills_as_trades(s)
        insts = self._instruments(trades)
        books = build_books(trades)
        holdings = {sym: Holding(insts[sym], float(b.net_qty)) for sym, b in books.items() if b.net_qty != 0}
        symbols = set(holdings) | {h.instrument.underlying for h in holdings.values()} | set(extra_symbols)
        quotes = self._quotes_for(symbols)
        totals = pnl_totals(books, {k: q.mid for k, q in quotes.items()})
        equity = self.starting_equity + totals["net_pnl"]

        row = self._risk_row(s)
        today = self.clock().date().isoformat()
        if row.day != today:
            row.day = today
            row.day_start_equity = _d(equity)
        if row.peak_equity is None or equity > float(row.peak_equity):
            row.peak_equity = _d(equity)

        since = self.clock() - timedelta(seconds=60)
        recent = [
            t if t.tzinfo else t.replace(tzinfo=timezone.utc)
            for t in s.execute(select(Order.created_at).where(Order.created_at >= since)).scalars()
        ]
        underlyings = sorted({h.instrument.underlying for h in holdings.values()} | set(extra_symbols))
        returns = self.returns_provider(underlyings) if self.returns_provider else {}
        snap = PortfolioSnapshot(
            equity=equity,
            holdings=holdings,
            peak_equity=float(row.peak_equity),
            day_start_equity=float(row.day_start_equity),
            recent_order_times=recent,
            returns_history=returns,
            kill_switch=row.kill_switch,
            kill_switch_reason=row.kill_switch_reason,
            today=self.clock().date(),
        )
        return snap, quotes

    # ── state machine ─────────────────────────────────────────────────────────
    @staticmethod
    def _transition(order: Order, new: str) -> None:
        allowed = OrderStatus.TRANSITIONS.get(order.status, set())
        if new not in allowed:
            raise IllegalTransition(f"order {order.id}: {order.status} → {new} not allowed")
        order.status = new

    # ── pre-trade check (no side effects) ─────────────────────────────────────
    def check(self, req: OrderRequest, source: str = "manual") -> RiskDecision:
        with session_scope() as s:
            snap, quotes = self.snapshot(s, extra_symbols=(req.instrument.symbol, req.instrument.underlying))
            limits = RiskLimits.model_validate_json(self._risk_row(s).limits_json)
            return evaluate(self._proposal(req, source), snap, quotes, limits, self.clock())

    @staticmethod
    def _proposal(req: OrderRequest, source: str) -> OrderProposal:
        return OrderProposal(req.instrument, req.side, req.quantity, req.order_type, req.limit_price, source)

    # ── submit ────────────────────────────────────────────────────────────────
    def submit(
        self,
        req: OrderRequest,
        actor: str,
        source: str = "manual",
        intent_id: Optional[str] = None,
        require_approval: bool = False,
    ) -> dict:
        # Idempotency: return the existing order for a repeated key.
        with session_scope() as s:
            existing = s.execute(select(Order).where(Order.client_order_id == req.client_order_id)).scalar_one_or_none()
            if existing is not None:
                return self._idempotent(existing, req)
            order = Order(
                client_order_id=req.client_order_id,
                account=req.account,
                symbol=req.instrument.symbol,
                instrument_json=req.instrument.model_dump_json(),
                side=req.side,
                quantity=_d(req.quantity),
                order_type=req.order_type,
                limit_price=_d(req.limit_price) if req.limit_price is not None else None,
                time_in_force=req.time_in_force,
                status=OrderStatus.NEW,
                broker=self.broker.name,
                source=source,
                intent_id=intent_id,
            )
            s.add(order)
            try:
                s.flush()
            except IntegrityError:
                s.rollback()
                with session_scope() as s2:
                    existing = s2.execute(
                        select(Order).where(Order.client_order_id == req.client_order_id)
                    ).scalar_one()
                    return self._idempotent(existing, req)
            audit.record(s, actor, "order.created", {"request": req.model_dump(mode="json"), "source": source}, order.id)

            snap, quotes = self.snapshot(s, extra_symbols=(req.instrument.symbol, req.instrument.underlying))
            limits = RiskLimits.model_validate_json(self._risk_row(s).limits_json)
            decision = evaluate(self._proposal(req, source), snap, quotes, limits, self.clock())
            order.risk_decision_json = audit.canonical(decision.to_dict())
            order.reference_price = _d(decision.reference_price) if decision.reference_price else None
            audit.record(
                s,
                "risk_gateway",
                "order.risk_decision",
                {"approved": decision.approved, "reason": decision.reason, "checks": [c.to_dict() for c in decision.checks]},
                order.id,
            )
            if not decision.approved:
                self._transition(order, OrderStatus.REJECTED)
                order.reject_reason = decision.reason
                return order_to_dict(order)
            if self.broker.live and os.getenv("TRADING_ALLOW_LIVE", "").lower() != "true":
                self._transition(order, OrderStatus.REJECTED)
                order.reject_reason = "live broker configured but TRADING_ALLOW_LIVE is not true"
                audit.record(s, "oms", "order.rejected", {"reason": order.reject_reason}, order.id)
                return order_to_dict(order)
            if require_approval:
                self._transition(order, OrderStatus.PENDING_APPROVAL)
                audit.record(s, "oms", "order.pending_approval", {}, order.id)
                return order_to_dict(order)
            order_id = order.id
        return self._send(order_id, actor)

    def _idempotent(self, existing: Order, req: OrderRequest) -> dict:
        prev = OrderRequest(
            client_order_id=existing.client_order_id,
            instrument=Instrument.model_validate_json(existing.instrument_json),
            side=existing.side,
            quantity=float(existing.quantity),
            order_type=existing.order_type,
            limit_price=_f(existing.limit_price),
            time_in_force=existing.time_in_force,
            account=existing.account,
        )
        if prev.fingerprint() != req.fingerprint():
            raise IdempotencyConflict(
                f"client_order_id {req.client_order_id!r} was already used for a different order"
            )
        return order_to_dict(existing)

    def _send(self, order_id: str, actor: str) -> dict:
        with session_scope() as s:
            order = s.get(Order, order_id)
            inst = Instrument.model_validate_json(order.instrument_json)
            if hasattr(self.broker, "set_multiplier"):
                self.broker.set_multiplier(order.symbol, inst.multiplier)
            bo = BrokerOrder(
                client_order_id=order.client_order_id,
                symbol=order.symbol,
                side=order.side,
                quantity=float(order.quantity),
                order_type=order.order_type,
                limit_price=_f(order.limit_price),
                time_in_force=order.time_in_force,
                asset_class=inst.asset_class,
            )
            try:
                ack = self.broker.submit(bo)
            except BrokerError as e:
                # Transport failure: the broker may or may not have the order.
                # Record it as rejected locally; reconciliation (positions vs
                # broker) will surface any fill that did happen.
                self._transition(order, OrderStatus.REJECTED)
                order.reject_reason = f"broker error: {e}"
                audit.record(s, "oms", "order.broker_error", {"error": str(e)}, order.id)
                return order_to_dict(order)
            if not ack.accepted:
                self._transition(order, OrderStatus.REJECTED)
                order.reject_reason = ack.reason or "rejected by broker"
                audit.record(s, "oms", "order.broker_rejected", {"reason": order.reject_reason}, order.id)
                return order_to_dict(order)
            order.broker_order_id = ack.broker_order_id
            self._transition(order, OrderStatus.SUBMITTED)
            audit.record(s, actor, "order.submitted", {"broker_order_id": ack.broker_order_id}, order.id)
            for f in ack.fills:
                self._apply_fill(s, order, f)
            if ack.status == "cancelled" and order.status == OrderStatus.SUBMITTED:
                self._transition(order, OrderStatus.CANCELLED)
                audit.record(s, "broker", "order.cancelled", {"reason": ack.reason}, order.id)
            return order_to_dict(order)

    # ── fills ─────────────────────────────────────────────────────────────────
    def _apply_fill(self, s: Session, order: Order, f: BrokerFill) -> bool:
        if s.execute(select(Fill.id).where(Fill.broker_fill_id == f.broker_fill_id)).first():
            return False  # already applied
        qty = _d(f.quantity)
        remaining = order.quantity - order.filled_quantity
        if qty > remaining:
            raise OMSError(f"fill {f.broker_fill_id} overfills order {order.id}")
        prev_notional = (order.avg_fill_price or Decimal(0)) * order.filled_quantity
        order.filled_quantity += qty
        order.avg_fill_price = (prev_notional + qty * _d(f.price)) / order.filled_quantity
        s.add(Fill(order_id=order.id, broker_fill_id=f.broker_fill_id, quantity=qty, price=_d(f.price), fee=_d(f.fee), ts=f.ts))
        self._transition(
            order, OrderStatus.FILLED if order.filled_quantity >= order.quantity else OrderStatus.PARTIALLY_FILLED
        )
        audit.record(
            s,
            "broker",
            "order.fill",
            {"broker_fill_id": f.broker_fill_id, "quantity": f.quantity, "price": f.price, "fee": f.fee},
            order.id,
        )
        return True

    def sync_fills(self) -> int:
        """Pull new fills from the broker (and match resting paper orders)."""
        if hasattr(self.broker, "match_resting"):
            self.broker.match_resting()
        applied = 0
        with session_scope() as s:
            last = s.execute(select(Fill.ts).order_by(Fill.ts.desc()).limit(1)).scalar_one_or_none()
            since = (last.replace(tzinfo=timezone.utc) if last and last.tzinfo is None else last)
            fills = self.broker.fills_since(since - timedelta(seconds=1) if since else None)
            for f in fills:
                q = select(Order)
                q = q.where(Order.broker_order_id == f.broker_order_id) if f.broker_order_id else q.where(
                    Order.client_order_id == f.client_order_id
                )
                order = s.execute(q).scalar_one_or_none()
                if order is None:
                    audit.record(s, "broker", "fill.unmatched", {"broker_fill_id": f.broker_fill_id})
                    continue
                if order.status in OrderStatus.TERMINAL and order.status != OrderStatus.FILLED:
                    continue
                applied += int(self._apply_fill(s, order, f))
        return applied

    # ── approvals & cancels ───────────────────────────────────────────────────
    def approve(self, order_id: str, actor: str) -> dict:
        with session_scope() as s:
            order = s.get(Order, order_id)
            if order is None:
                raise OMSError("order not found")
            if order.status != OrderStatus.PENDING_APPROVAL:
                raise IllegalTransition(f"order is {order.status}, not pending approval")
            # Re-check: the portfolio or market may have changed while it waited.
            req = OrderRequest(
                client_order_id=order.client_order_id,
                instrument=Instrument.model_validate_json(order.instrument_json),
                side=order.side,
                quantity=float(order.quantity),
                order_type=order.order_type,
                limit_price=_f(order.limit_price),
                time_in_force=order.time_in_force,
            )
            snap, quotes = self.snapshot(s, extra_symbols=(req.instrument.symbol, req.instrument.underlying))
            limits = RiskLimits.model_validate_json(self._risk_row(s).limits_json)
            # The rate limit guards automated submission bursts; a human
            # approval of an already-counted order is not a new submission.
            snap.recent_order_times = []
            decision = evaluate(self._proposal(req, order.source), snap, quotes, limits, self.clock())
            audit.record(s, actor, "order.approval", {"approved_by": actor, "risk_recheck": decision.approved, "reason": decision.reason}, order.id)
            if not decision.approved:
                self._transition(order, OrderStatus.REJECTED)
                order.reject_reason = f"risk re-check at approval: {decision.reason}"
                return order_to_dict(order)
        return self._send(order_id, actor)

    def reject(self, order_id: str, actor: str, reason: str) -> dict:
        with session_scope() as s:
            order = s.get(Order, order_id)
            if order is None:
                raise OMSError("order not found")
            if order.status != OrderStatus.PENDING_APPROVAL:
                raise IllegalTransition(f"order is {order.status}, not pending approval")
            self._transition(order, OrderStatus.REJECTED)
            order.reject_reason = f"rejected by {actor}: {reason}"
            audit.record(s, actor, "order.rejected_by_human", {"reason": reason}, order.id)
            return order_to_dict(order)

    def cancel(self, order_id: str, actor: str, reason: str = "") -> dict:
        with session_scope() as s:
            order = s.get(Order, order_id)
            if order is None:
                raise OMSError("order not found")
            if order.status == OrderStatus.PENDING_APPROVAL:
                self._transition(order, OrderStatus.CANCELLED)
            elif order.status in OrderStatus.OPEN:
                if order.broker_order_id and not self.broker.cancel(order.broker_order_id):
                    raise OMSError("broker could not cancel (already filled or unknown)")
                self._transition(order, OrderStatus.CANCELLED)
            else:
                raise IllegalTransition(f"cannot cancel an order that is {order.status}")
            audit.record(s, actor, "order.cancelled", {"reason": reason}, order.id)
            return order_to_dict(order)

    # ── queries ───────────────────────────────────────────────────────────────
    def get_order(self, order_id: str) -> Optional[dict]:
        with session_scope() as s:
            o = s.get(Order, order_id)
            return order_to_dict(o) if o else None

    def list_orders(self, statuses: Optional[List[str]] = None, limit: int = 200) -> List[dict]:
        with session_scope() as s:
            q = select(Order).order_by(Order.created_at.desc()).limit(limit)
            if statuses:
                q = q.where(Order.status.in_(statuses))
            return [order_to_dict(o) for o in s.execute(q).scalars()]

    def fills(self, limit: int = 500) -> List[dict]:
        with session_scope() as s:
            rows = s.execute(select(Fill).order_by(Fill.ts.desc()).limit(limit)).scalars()
            return [
                {"id": f.id, "order_id": f.order_id, "broker_fill_id": f.broker_fill_id, "quantity": float(f.quantity), "price": float(f.price), "fee": float(f.fee), "ts": f.ts.isoformat()}
                for f in rows
            ]

    # ── reconciliation ────────────────────────────────────────────────────────
    def reconcile(self, actor: str = "reconciler", tolerance: float = 1e-6) -> ReconciliationReport:
        with session_scope() as s:
            books = build_books(self._fills_as_trades(s))
            ledger = {sym: float(b.net_qty) for sym, b in books.items() if b.net_qty != 0}
        broker = self.broker.positions()
        breaks = {}
        for sym in set(ledger) | set(broker):
            a, b = ledger.get(sym, 0.0), broker.get(sym, 0.0)
            if abs(a - b) > tolerance:
                breaks[sym] = {"ledger": a, "broker": b, "diff": b - a}
        report = ReconciliationReport(not breaks, breaks, ledger, broker)
        with session_scope() as s:
            audit.record(s, actor, "reconciliation", {"ok": report.ok, "breaks": breaks})
        if breaks and os.getenv("TRADING_HALT_ON_RECON_BREAK", "true").lower() == "true":
            self.set_kill_switch(True, actor, f"reconciliation break: {sorted(breaks)}")
        return report
