"""
Intent pipeline: agent intent → sizing → per-agent caps → risk gateway → OMS,
with the agent's autonomy level deciding how far it goes.

  L0 suggest     sized and risk-checked (dry run), recorded; nothing executes
  L1 paper       executes only if the broker is a paper broker; else as L0
  L2 approval    orders created as PENDING_APPROVAL; a human approves each
  L3 autonomous  orders submitted (a live broker still needs TRADING_ALLOW_LIVE)

Unknown agents are L0. Disabled agents are rejected. Everything is audited.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import select

from app.observability import INTENTS

from .. import audit
from ..db import session_scope
from ..market_data import snapshot_hash
from ..models import AgentConfig, Intent, IntentStatus, Order, OrderStatus
from ..oms import OrderManager, OrderRequest, order_to_dict
from .intents import AutonomyLevel, IntentOrder, IntentRequest, SizingConfig, size_target_weights


def get_agent(agent_id: str) -> dict:
    with session_scope() as s:
        a = s.get(AgentConfig, agent_id)
        if a is None:
            return {"agent_id": agent_id, "autonomy_level": AutonomyLevel.SUGGEST, "enabled": True, "max_intent_notional": None, "registered": False}
        return {
            "agent_id": a.agent_id,
            "autonomy_level": a.autonomy_level,
            "enabled": a.enabled,
            "max_intent_notional": float(a.max_intent_notional) if a.max_intent_notional is not None else None,
            "description": a.description,
            "registered": True,
        }


def list_agents() -> List[dict]:
    with session_scope() as s:
        ids = [a.agent_id for a in s.execute(select(AgentConfig)).scalars()]
    return [get_agent(i) for i in ids]


def configure_agent(
    agent_id: str,
    actor: str,
    autonomy_level: Optional[int] = None,
    enabled: Optional[bool] = None,
    max_intent_notional: Optional[float] = None,
    description: Optional[str] = None,
) -> dict:
    if autonomy_level is not None and autonomy_level not in AutonomyLevel.NAMES:
        raise ValueError("autonomy_level must be 0, 1, 2 or 3")
    with session_scope() as s:
        a = s.get(AgentConfig, agent_id)
        before = None if a is None else {"autonomy_level": a.autonomy_level, "enabled": a.enabled}
        if a is None:
            a = AgentConfig(agent_id=agent_id)
            s.add(a)
        if autonomy_level is not None:
            a.autonomy_level = autonomy_level
        if enabled is not None:
            a.enabled = enabled
        if max_intent_notional is not None:
            a.max_intent_notional = Decimal(str(max_intent_notional))
        if description is not None:
            a.description = description
        s.flush()
        audit.record(
            s,
            actor,
            "agent.configured",
            {"before": before, "after": {"autonomy_level": a.autonomy_level, "enabled": a.enabled, "max_intent_notional": str(a.max_intent_notional) if a.max_intent_notional is not None else None}},
            agent_id,
        )
    return get_agent(agent_id)


def intent_to_dict(i: Intent, orders: Optional[List[dict]] = None) -> dict:
    return {
        "id": i.id,
        "agent_id": i.agent_id,
        "kind": i.kind,
        "payload": json.loads(i.payload_json),
        "rationale": i.rationale,
        "autonomy_level": i.autonomy_level,
        "autonomy": AutonomyLevel.NAMES[i.autonomy_level],
        "status": i.status,
        "sized_orders": json.loads(i.sized_orders_json) if i.sized_orders_json else None,
        "decision_reason": i.decision_reason,
        "decided_by": i.decided_by,
        "model_id": i.model_id,
        "data_snapshot_hash": i.data_snapshot_hash,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "orders": orders,
    }


class IntentPipeline:
    def __init__(self, oms: OrderManager, sizing: Optional[SizingConfig] = None):
        self.oms = oms
        self.sizing = sizing or SizingConfig()

    def _size(self, req: IntentRequest) -> tuple[List[IntentOrder], List[str], str]:
        if req.kind == "orders":
            orders = list(req.orders or [])
            symbols = {o.instrument.symbol for o in orders} | {o.instrument.underlying for o in orders}
            quotes = self.oms._quotes_for(symbols)
            return orders, [], snapshot_hash(quotes.values())
        with session_scope() as s:
            snap, quotes = self.oms.snapshot(s, extra_symbols=tuple(req.target_weights))
        current = {sym: h.quantity for sym, h in snap.holdings.items()}
        orders, notes = size_target_weights(req.target_weights, req.instruments, current, quotes, snap.equity, self.sizing)
        return orders, notes, snapshot_hash(quotes.values())

    def process(self, req: IntentRequest, actor: Optional[str] = None) -> dict:
        actor = actor or f"agent:{req.agent_id}"
        agent = get_agent(req.agent_id)
        level = agent["autonomy_level"]
        if level == AutonomyLevel.PAPER and self.oms.broker.live:
            level = AutonomyLevel.SUGGEST  # L1 never touches a live broker

        orders, notes, snap_hash = self._size(req)
        with session_scope() as s:
            if req.idempotency_key:
                prior = s.execute(
                    select(Intent).where(Intent.agent_id == req.agent_id, Intent.data_snapshot_hash == f"idem:{req.idempotency_key}")
                ).scalar_one_or_none()
                if prior is not None:
                    return self.get(prior.id)
            intent = Intent(
                agent_id=req.agent_id,
                kind=req.kind,
                payload_json=req.model_dump_json(include={"target_weights", "orders", "instruments"}),
                rationale=req.rationale,
                autonomy_level=level,
                status=IntentStatus.SUGGESTED,
                sized_orders_json=json.dumps([o.model_dump(mode="json") for o in orders]),
                model_id=req.model_id,
                data_snapshot_hash=f"idem:{req.idempotency_key}" if req.idempotency_key else snap_hash,
            )
            s.add(intent)
            s.flush()
            intent_id = intent.id
            audit.record(
                s,
                actor,
                "intent.received",
                {
                    "request": req.model_dump(mode="json"),
                    "autonomy_level": level,
                    "sized_orders": [o.model_dump(mode="json") for o in orders],
                    "sizing_notes": notes,
                    "market_snapshot_hash": snap_hash,
                },
                intent_id,
            )

        def finish(status: str, reason: str) -> dict:
            with session_scope() as s:
                i = s.get(Intent, intent_id)
                i.status = status
                i.decision_reason = reason
                i.decided_by = "pipeline"
                i.decided_at = datetime.now(timezone.utc)
                audit.record(s, "pipeline", "intent.decided", {"status": status, "reason": reason}, intent_id)
            INTENTS.labels(req.agent_id, status).inc()
            return self.get(intent_id)

        if not agent["enabled"]:
            return finish(IntentStatus.REJECTED, "agent disabled")
        if not orders:
            return finish(IntentStatus.REJECTED, "nothing to trade after sizing: " + ("; ".join(notes) or "already at target"))

        # Per-agent notional cap on the whole intent.
        cap = agent["max_intent_notional"]
        if cap is not None:
            quotes = self.oms._quotes_for({o.instrument.symbol for o in orders})
            total = sum(o.quantity * quotes[o.instrument.symbol].mid * o.instrument.multiplier for o in orders if o.instrument.symbol in quotes)
            if total > cap:
                return finish(IntentStatus.REJECTED, f"intent notional ${total:,.0f} exceeds agent cap ${cap:,.0f}")

        base = req.idempotency_key or intent_id
        requests = [
            OrderRequest(
                client_order_id=f"{req.agent_id}:{base}:{n}"[:128],
                instrument=o.instrument,
                side=o.side,
                quantity=o.quantity,
                order_type=o.order_type,
                limit_price=o.limit_price,
            )
            for n, o in enumerate(orders)
        ]

        if level == AutonomyLevel.SUGGEST:
            checks = [self.oms.check(r, source=f"agent:{req.agent_id}").to_dict() for r in requests]
            with session_scope() as s:
                audit.record(s, "risk_gateway", "intent.dry_run", {"checks": checks}, intent_id)
            ok = all(c["approved"] for c in checks)
            return finish(
                IntentStatus.SUGGESTED,
                "L0: recorded as a suggestion; " + ("would pass risk" if ok else "would fail risk: " + "; ".join(c["reason"] for c in checks if not c["approved"])),
            )

        results = [
            self.oms.submit(
                r,
                actor=actor,
                source=f"agent:{req.agent_id}",
                intent_id=intent_id,
                require_approval=(level == AutonomyLevel.APPROVAL),
            )
            for r in requests
        ]
        statuses = [o["status"] for o in results]
        if level == AutonomyLevel.APPROVAL:
            pending = statuses.count(OrderStatus.PENDING_APPROVAL)
            if pending == 0:
                return finish(IntentStatus.REJECTED, "all orders failed risk: " + "; ".join(o["reject_reason"] or "" for o in results))
            return finish(IntentStatus.PENDING_APPROVAL, f"{pending}/{len(results)} orders await approval")
        executed = [s for s in statuses if s not in (OrderStatus.REJECTED,)]
        if not executed:
            return finish(IntentStatus.REJECTED, "all orders rejected: " + "; ".join(o["reject_reason"] or "" for o in results))
        if len(executed) < len(results):
            return finish(IntentStatus.PARTIALLY_EXECUTED, f"{len(executed)}/{len(results)} orders submitted")
        return finish(IntentStatus.EXECUTED, f"{len(results)} orders submitted")

    # ── human decisions on L2 intents ─────────────────────────────────────────
    def decide(self, intent_id: str, approve: bool, actor: str, reason: str = "") -> dict:
        with session_scope() as s:
            i = s.get(Intent, intent_id)
            if i is None:
                raise KeyError("intent not found")
            if i.status != IntentStatus.PENDING_APPROVAL:
                raise ValueError(f"intent is {i.status}, not pending approval")
            pending = [
                o.id
                for o in s.execute(select(Order).where(Order.intent_id == intent_id, Order.status == OrderStatus.PENDING_APPROVAL)).scalars()
            ]
        results = [self.oms.approve(oid, actor) if approve else self.oms.reject(oid, actor, reason or "rejected") for oid in pending]
        with session_scope() as s:
            i = s.get(Intent, intent_id)
            if approve:
                ok = [r for r in results if r["status"] != OrderStatus.REJECTED]
                i.status = IntentStatus.EXECUTED if len(ok) == len(results) else (IntentStatus.PARTIALLY_EXECUTED if ok else IntentStatus.REJECTED)
            else:
                i.status = IntentStatus.REJECTED
            i.decided_by = actor
            i.decision_reason = reason or ("approved" if approve else "rejected")
            i.decided_at = datetime.now(timezone.utc)
            audit.record(s, actor, "intent.human_decision", {"approve": approve, "reason": reason, "status": i.status}, intent_id)
        return self.get(intent_id)

    def get(self, intent_id: str) -> Optional[dict]:
        with session_scope() as s:
            i = s.get(Intent, intent_id)
            if i is None:
                return None
            orders = [order_to_dict(o) for o in s.execute(select(Order).where(Order.intent_id == intent_id).order_by(Order.created_at)).scalars()]
            return intent_to_dict(i, orders)

    def list(self, agent_id: Optional[str] = None, status: Optional[str] = None, limit: int = 100) -> List[dict]:
        with session_scope() as s:
            q = select(Intent).order_by(Intent.created_at.desc()).limit(limit)
            if agent_id:
                q = q.where(Intent.agent_id == agent_id)
            if status:
                q = q.where(Intent.status == status)
            ids = [i.id for i in s.execute(q).scalars()]
        return [self.get(i) for i in ids]
