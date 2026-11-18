"""
Agent intents and deterministic sizing.

An agent never sends orders. It proposes an *intent*:
  - target_weights: desired fraction of equity per symbol (signed), or
  - orders: explicit orders (e.g. option trades).
Sizing, risk checks and execution are deterministic code; the autonomy level
of the agent decides whether anything is executed at all.
"""

from __future__ import annotations

import math
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from ..instruments import Instrument, equity
from ..market_data import Quote


class AutonomyLevel:
    SUGGEST = 0  # L0: record only; a human acts on it (or not)
    PAPER = 1  # L1: executes on the paper broker only
    APPROVAL = 2  # L2: orders wait for human approval
    AUTONOMOUS = 3  # L3: executes within limits without a human

    NAMES = {0: "L0 suggest", 1: "L1 paper", 2: "L2 approval", 3: "L3 autonomous"}


class IntentOrder(BaseModel):
    instrument: Instrument
    side: Literal["buy", "sell"]
    quantity: float = Field(..., gt=0)
    order_type: Literal["market", "limit"] = "market"
    limit_price: Optional[float] = Field(None, gt=0)


class IntentRequest(BaseModel):
    agent_id: str = Field(..., min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_.\-]+$")
    kind: Literal["target_weights", "orders"]
    target_weights: Optional[Dict[str, float]] = None
    orders: Optional[List[IntentOrder]] = None
    instruments: Dict[str, Instrument] = Field(
        default_factory=dict, description="instrument specs for target_weights symbols (default: equity)"
    )
    rationale: str = Field("", max_length=8000)
    model_id: Optional[str] = Field(None, max_length=64)
    idempotency_key: Optional[str] = Field(None, max_length=96)

    @field_validator("target_weights")
    @classmethod
    def _weights_finite(cls, v):
        if v is None:
            return v
        for sym, w in v.items():
            if not math.isfinite(w) or abs(w) > 10:
                raise ValueError(f"weight for {sym} must be finite and |w| ≤ 10")
        return v

    @model_validator(mode="after")
    def _payload_matches_kind(self) -> "IntentRequest":
        if self.kind == "target_weights" and not self.target_weights:
            raise ValueError("target_weights intents need target_weights")
        if self.kind == "orders" and not self.orders:
            raise ValueError("orders intents need orders")
        return self


class SizingConfig(BaseModel):
    """Deterministic sizing rules applied to target-weight intents."""

    max_weight: float = Field(0.20, gt=0, description="cap |w| per name")
    max_gross_weight: float = Field(1.0, gt=0, description="cap Σ|w|; scaled down proportionally")
    rebalance_band: float = Field(0.005, ge=0, description="skip trades smaller than this × equity")
    fractional_shares: bool = False


def size_target_weights(
    target: Dict[str, float],
    instruments: Dict[str, Instrument],
    current_qty: Dict[str, float],
    quotes: Dict[str, Quote],
    equity_value: float,
    cfg: SizingConfig,
) -> tuple[List[IntentOrder], List[str]]:
    """Target weights → orders. Returns (orders, notes). Pure function."""
    notes: List[str] = []
    w = {s: max(-cfg.max_weight, min(cfg.max_weight, x)) for s, x in target.items()}
    for s in target:
        if w[s] != target[s]:
            notes.append(f"{s}: weight {target[s]:.3f} capped at ±{cfg.max_weight:.3f}")
    gross = sum(abs(x) for x in w.values())
    if gross > cfg.max_gross_weight:
        k = cfg.max_gross_weight / gross
        w = {s: x * k for s, x in w.items()}
        notes.append(f"gross weight {gross:.3f} scaled to {cfg.max_gross_weight:.3f}")

    orders: List[IntentOrder] = []
    for sym in sorted(w):
        inst = instruments.get(sym) or equity(sym)
        q = quotes.get(sym)
        if q is None or q.mid <= 0:
            notes.append(f"{sym}: no quote, skipped")
            continue
        unit = q.mid * inst.multiplier
        target_qty = w[sym] * equity_value / unit
        delta = target_qty - current_qty.get(sym, 0.0)
        if not cfg.fractional_shares:
            delta = float(math.trunc(delta))
        if abs(delta) * unit < cfg.rebalance_band * equity_value or delta == 0:
            continue
        orders.append(IntentOrder(instrument=inst, side="buy" if delta > 0 else "sell", quantity=abs(delta)))
    return orders, notes
