"""
Trading ledger schema.

Money and quantities are Numeric (exact decimal). JSON payloads are stored
as text so the schema works on PostgreSQL and SQLite alike.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

MONEY = Numeric(24, 8)
QTY = Numeric(24, 8)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class OrderStatus:
    NEW = "new"  # recorded, not yet risk-checked
    REJECTED = "rejected"  # failed the pre-trade risk gateway or broker validation
    PENDING_APPROVAL = "pending_approval"  # passed risk; waiting for a human (L2)
    SUBMITTED = "submitted"  # sent to broker, acknowledged
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

    TERMINAL = frozenset({REJECTED, FILLED, CANCELLED, EXPIRED})
    OPEN = frozenset({SUBMITTED, PARTIALLY_FILLED})

    # Allowed transitions of the order state machine.
    TRANSITIONS = {
        NEW: {REJECTED, PENDING_APPROVAL, SUBMITTED},
        PENDING_APPROVAL: {SUBMITTED, REJECTED, CANCELLED, EXPIRED},
        SUBMITTED: {PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED, EXPIRED},
        PARTIALLY_FILLED: {PARTIALLY_FILLED, FILLED, CANCELLED, EXPIRED},
    }


class Order(Base):
    __tablename__ = "trading_orders"
    __table_args__ = (
        UniqueConstraint("client_order_id", name="uq_orders_client_order_id"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_symbol", "symbol"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    # Idempotency key supplied by the caller: resubmitting returns the same order.
    client_order_id: Mapped[str] = mapped_column(String(128), nullable=False)
    account: Mapped[str] = mapped_column(String(64), default="default")
    symbol: Mapped[str] = mapped_column(String(64), nullable=False)
    instrument_json: Mapped[str] = mapped_column(Text, nullable=False)
    side: Mapped[str] = mapped_column(String(4), nullable=False)  # buy | sell
    quantity: Mapped[Decimal] = mapped_column(QTY, nullable=False)
    order_type: Mapped[str] = mapped_column(String(8), default="market")  # market | limit
    limit_price: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    time_in_force: Mapped[str] = mapped_column(String(4), default="day")
    status: Mapped[str] = mapped_column(String(24), default=OrderStatus.NEW)
    filled_quantity: Mapped[Decimal] = mapped_column(QTY, default=Decimal("0"))
    avg_fill_price: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    broker: Mapped[str] = mapped_column(String(32), default="paper")
    broker_order_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="manual")  # manual | agent:<id>
    intent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("trading_intents.id"), nullable=True
    )
    reference_price: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    risk_decision_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    fills: Mapped[list["Fill"]] = relationship(back_populates="order", order_by="Fill.ts")


class Fill(Base):
    __tablename__ = "trading_fills"
    __table_args__ = (UniqueConstraint("broker_fill_id", name="uq_fills_broker_fill_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trading_orders.id"), nullable=False, index=True
    )
    broker_fill_id: Mapped[str] = mapped_column(String(128), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(QTY, nullable=False)
    price: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    fee: Mapped[Decimal] = mapped_column(MONEY, default=Decimal("0"))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    order: Mapped[Order] = relationship(back_populates="fills")


class IntentStatus:
    SUGGESTED = "suggested"  # L0: recorded for a human, never executed
    PENDING_APPROVAL = "pending_approval"  # L2: waiting for a human
    APPROVED = "approved"
    REJECTED = "rejected"  # by risk, sizing, policy or a human
    EXECUTED = "executed"  # orders submitted
    PARTIALLY_EXECUTED = "partially_executed"


class Intent(Base):
    """What an agent wants (target weights or orders), with its reasoning."""

    __tablename__ = "trading_intents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    agent_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # target_weights | orders
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, default="")
    autonomy_level: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    sized_orders_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    model_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    data_snapshot_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class AgentConfig(Base):
    """Per-agent autonomy level and limits. Unknown agents run at L0."""

    __tablename__ = "trading_agents"

    agent_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    autonomy_level: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_intent_notional: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class RiskConfig(Base):
    """Risk limits and the global kill switch (single row, key='default')."""

    __tablename__ = "trading_risk_config"

    key: Mapped[str] = mapped_column(String(32), primary_key=True, default="default")
    limits_json: Mapped[str] = mapped_column(Text, nullable=False)
    kill_switch: Mapped[bool] = mapped_column(Boolean, default=False)
    kill_switch_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    peak_equity: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    day_start_equity: Mapped[Optional[Decimal]] = mapped_column(MONEY, nullable=True)
    day: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class AuditEvent(Base):
    """Append-only, hash-chained log of every trading decision."""

    __tablename__ = "trading_audit_log"

    seq: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    actor: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
