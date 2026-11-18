"""
Append-only, hash-chained audit log.

Every trading decision (order accepted or rejected and why, fills, intents,
approvals, kill-switch changes, agent tool calls) is written here. Each row
stores sha256(prev_hash || canonical payload), so editing or deleting any
row breaks the chain from that point on; `verify_chain()` detects it.

Writers serialise on the last row (SELECT ... FOR UPDATE on PostgreSQL), so
concurrent workers cannot fork the chain.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import AuditEvent

GENESIS = "0" * 64


def _default(o: Any):
    if isinstance(o, Decimal):
        return str(o)
    if isinstance(o, datetime):
        return o.isoformat()
    if isinstance(o, (set, frozenset)):
        return sorted(o)
    raise TypeError(f"not JSON serialisable: {type(o).__name__}")


def canonical(payload: Any) -> str:
    """Deterministic JSON (sorted keys, no whitespace) for hashing."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=_default)


def _digest(prev_hash: str, actor: str, kind: str, entity_id: Optional[str], body: str, ts: str) -> str:
    h = hashlib.sha256()
    for part in (prev_hash, actor, kind, entity_id or "", ts, body):
        h.update(part.encode())
        h.update(b"\x1f")
    return h.hexdigest()


def record(
    session: Session,
    actor: str,
    kind: str,
    payload: Dict[str, Any],
    entity_id: Optional[str] = None,
) -> AuditEvent:
    """Append an event to the chain inside the caller's transaction."""
    stmt = select(AuditEvent).order_by(AuditEvent.seq.desc()).limit(1)
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        stmt = stmt.with_for_update()
    last = session.execute(stmt).scalar_one_or_none()
    prev = last.hash if last else GENESIS
    ts = datetime.now(timezone.utc)
    body = canonical(payload)
    ev = AuditEvent(
        ts=ts,
        actor=actor,
        kind=kind,
        entity_id=entity_id,
        payload_json=body,
        prev_hash=prev,
        hash=_digest(prev, actor, kind, entity_id, body, ts.isoformat()),
    )
    session.add(ev)
    session.flush()
    return ev


def _ts_iso(ts: datetime) -> str:
    # SQLite drops tzinfo on read; the hash was computed on an aware UTC value.
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.isoformat()


def verify_chain(session: Session) -> Dict[str, Any]:
    """Recompute every hash. Returns {"ok": bool, "events": n, "broken_at": seq|None}."""
    prev = GENESIS
    n = 0
    for ev in session.execute(select(AuditEvent).order_by(AuditEvent.seq)).scalars():
        n += 1
        expected = _digest(prev, ev.actor, ev.kind, ev.entity_id, ev.payload_json, _ts_iso(ev.ts))
        if ev.prev_hash != prev or ev.hash != expected:
            return {"ok": False, "events": n, "broken_at": ev.seq}
        prev = ev.hash
    return {"ok": True, "events": n, "broken_at": None, "head": prev}


def recent(session: Session, limit: int = 100, entity_id: Optional[str] = None) -> List[Dict[str, Any]]:
    stmt = select(AuditEvent).order_by(AuditEvent.seq.desc()).limit(limit)
    if entity_id:
        stmt = stmt.where(AuditEvent.entity_id == entity_id)
    return [
        {
            "seq": e.seq,
            "ts": _ts_iso(e.ts),
            "actor": e.actor,
            "kind": e.kind,
            "entity_id": e.entity_id,
            "payload": json.loads(e.payload_json),
            "hash": e.hash,
        }
        for e in session.execute(stmt).scalars()
    ]
