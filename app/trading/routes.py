"""
Trading API (`/v1/trading`): orders, positions, risk limits, kill switch,
approvals, reconciliation and the audit log.

Scopes (see app/security.py): `write` for order entry and trading reads,
`admin` for limits, kill switch, approvals, reconciliation and audit.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.observability import KILL_SWITCH, record_order
from app.security import require_admin, require_write

from . import audit
from .db import TradingUnavailable, session_scope
from .market_data import StaticProvider
from .oms import IdempotencyConflict, IllegalTransition, OMSError, OrderManager, OrderRequest
from .risk_gateway import RiskLimits
from .service import get_oms

router = APIRouter(prefix="/v1/trading", tags=["trading"])


def oms_dep() -> OrderManager:
    try:
        return get_oms()
    except TradingUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))


def actor_of(request: Request, x_actor: Optional[str] = Header(default=None)) -> str:
    scope = getattr(request.state, "api_scope", None) or "dev"
    return f"{scope}:{(x_actor or 'api')[:48]}"


def _errors(fn):
    try:
        return fn()
    except TradingUnavailable as e:
        raise HTTPException(503, str(e))
    except (IdempotencyConflict, IllegalTransition) as e:
        raise HTTPException(409, str(e))
    except OMSError as e:
        raise HTTPException(400, str(e))


# ── orders ────────────────────────────────────────────────────────────────────


@router.post("/orders", dependencies=[Depends(require_write)])
def submit_order(
    req: OrderRequest,
    oms: OrderManager = Depends(oms_dep),
    actor: str = Depends(actor_of),
    idempotency_key: Optional[str] = Header(default=None),
):
    """Submit an order. It is risk-checked, then sent to the broker.
    Re-sending the same `client_order_id` (or Idempotency-Key header) returns the original order."""
    if idempotency_key:
        req = req.model_copy(update={"client_order_id": idempotency_key[:128]})
    order = _errors(lambda: oms.submit(req, actor=actor, source="manual"))
    record_order(order)
    return {"model": "oms", "order": order}


@router.post("/orders/check", dependencies=[Depends(require_write)])
def check_order(req: OrderRequest, oms: OrderManager = Depends(oms_dep)):
    """Dry-run the pre-trade risk gateway without creating an order."""
    decision = _errors(lambda: oms.check(req))
    return {"model": "risk_gateway", **decision.to_dict()}


@router.get("/orders", dependencies=[Depends(require_write)])
def list_orders(
    status: Optional[List[str]] = Query(default=None),
    limit: int = Query(200, ge=1, le=1000),
    oms: OrderManager = Depends(oms_dep),
):
    return {"orders": _errors(lambda: oms.list_orders(status, limit))}


@router.get("/orders/{order_id}", dependencies=[Depends(require_write)])
def get_order(order_id: str, oms: OrderManager = Depends(oms_dep)):
    o = _errors(lambda: oms.get_order(order_id))
    if o is None:
        raise HTTPException(404, "order not found")
    return {"order": o}


@router.post("/orders/{order_id}/cancel", dependencies=[Depends(require_write)])
def cancel_order(order_id: str, oms: OrderManager = Depends(oms_dep), actor: str = Depends(actor_of)):
    return {"order": _errors(lambda: oms.cancel(order_id, actor=actor))}


class Decision(BaseModel):
    reason: str = Field("", max_length=500)


@router.post("/orders/{order_id}/approve", dependencies=[Depends(require_admin)])
def approve_order(order_id: str, oms: OrderManager = Depends(oms_dep), actor: str = Depends(actor_of)):
    """Approve a pending order. The risk gateway re-checks it before sending."""
    order = _errors(lambda: oms.approve(order_id, actor=actor))
    record_order(order)
    return {"order": order}


@router.post("/orders/{order_id}/reject", dependencies=[Depends(require_admin)])
def reject_order(order_id: str, body: Decision, oms: OrderManager = Depends(oms_dep), actor: str = Depends(actor_of)):
    return {"order": _errors(lambda: oms.reject(order_id, actor=actor, reason=body.reason))}


# ── portfolio ─────────────────────────────────────────────────────────────────


@router.get("/positions", dependencies=[Depends(require_write)])
def positions(oms: OrderManager = Depends(oms_dep)):
    return {"positions": _errors(oms.positions), "equity": _errors(oms.equity)}


@router.get("/fills", dependencies=[Depends(require_write)])
def fills(limit: int = Query(500, ge=1, le=5000), oms: OrderManager = Depends(oms_dep)):
    return {"fills": _errors(lambda: oms.fills(limit))}


@router.post("/sync", dependencies=[Depends(require_write)])
def sync(oms: OrderManager = Depends(oms_dep)):
    """Pull new fills from the broker."""
    return {"applied_fills": _errors(oms.sync_fills)}


@router.post("/reconcile", dependencies=[Depends(require_admin)])
def reconcile(oms: OrderManager = Depends(oms_dep), actor: str = Depends(actor_of)):
    rep = _errors(lambda: oms.reconcile(actor=actor))
    return {"ok": rep.ok, "breaks": rep.breaks, "ledger": rep.ledger, "broker": rep.broker}


# ── risk ──────────────────────────────────────────────────────────────────────


@router.get("/risk/limits", dependencies=[Depends(require_write)])
def get_limits(oms: OrderManager = Depends(oms_dep)):
    return {"limits": _errors(oms.get_limits).model_dump()}


@router.put("/risk/limits", dependencies=[Depends(require_admin)])
def put_limits(limits: RiskLimits, oms: OrderManager = Depends(oms_dep), actor: str = Depends(actor_of)):
    return {"limits": _errors(lambda: oms.set_limits(limits, actor)).model_dump()}


class KillSwitch(BaseModel):
    on: bool
    reason: str = Field("", max_length=500)
    cancel_open_orders: bool = True


@router.get("/risk/kill-switch", dependencies=[Depends(require_write)])
def get_kill_switch(oms: OrderManager = Depends(oms_dep)):
    return _errors(oms.kill_switch)


@router.post("/risk/kill-switch", dependencies=[Depends(require_admin)])
def set_kill_switch(body: KillSwitch, oms: OrderManager = Depends(oms_dep), actor: str = Depends(actor_of)):
    """Halt (or resume) all trading. Turning it on cancels open and pending orders by default."""
    KILL_SWITCH.labels("on" if body.on else "off").inc()
    return _errors(lambda: oms.set_kill_switch(body.on, actor, body.reason, body.cancel_open_orders))


# ── audit ─────────────────────────────────────────────────────────────────────


@router.get("/audit", dependencies=[Depends(require_admin)])
def audit_log(limit: int = Query(100, ge=1, le=1000), entity_id: Optional[str] = None):
    def go():
        with session_scope() as s:
            return audit.recent(s, limit, entity_id)

    return {"events": _errors(go)}


@router.get("/audit/verify", dependencies=[Depends(require_admin)])
def audit_verify():
    def go():
        with session_scope() as s:
            return audit.verify_chain(s)

    return _errors(go)


# ── paper-trading helpers ─────────────────────────────────────────────────────


class PaperQuote(BaseModel):
    symbol: str
    bid: float = Field(..., gt=0)
    ask: float = Field(..., gt=0)
    implied_vol: Optional[float] = Field(None, gt=0)
    underlying_price: Optional[float] = Field(None, gt=0)


@router.post("/paper/quotes", dependencies=[Depends(require_admin)])
def set_paper_quotes(quotes: List[PaperQuote], oms: OrderManager = Depends(oms_dep)):
    """Set quotes for the static market-data provider (paper trading only)."""
    if oms.broker.live or not isinstance(oms.md, StaticProvider):
        raise HTTPException(409, "quotes can only be set for the paper broker with static market data")
    out = []
    for q in quotes:
        if q.ask < q.bid:
            raise HTTPException(422, f"{q.symbol}: ask below bid")
        out.append(
            oms.md.set(q.symbol, q.bid, q.ask, implied_vol=q.implied_vol, underlying_price=q.underlying_price).to_dict()
        )
    return {"quotes": out}
