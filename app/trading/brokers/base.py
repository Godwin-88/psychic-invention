"""Broker adapter interface. The OMS talks only to this."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Literal, Optional, Protocol


@dataclass(frozen=True)
class BrokerOrder:
    client_order_id: str
    symbol: str
    side: Literal["buy", "sell"]
    quantity: float
    order_type: Literal["market", "limit"]
    limit_price: Optional[float]
    time_in_force: str
    asset_class: str = "equity"


@dataclass(frozen=True)
class BrokerFill:
    broker_fill_id: str
    client_order_id: str
    quantity: float
    price: float
    fee: float
    ts: datetime
    broker_order_id: Optional[str] = None


@dataclass
class BrokerAck:
    accepted: bool
    broker_order_id: Optional[str] = None
    status: str = "submitted"  # submitted | filled | partially_filled | rejected
    reason: Optional[str] = None
    fills: List[BrokerFill] = field(default_factory=list)


class BrokerError(RuntimeError):
    """Transport or protocol failure talking to a broker."""


class BrokerAdapter(Protocol):
    name: str
    live: bool  # True only for adapters that move real money

    def submit(self, order: BrokerOrder) -> BrokerAck: ...

    def cancel(self, broker_order_id: str) -> bool: ...

    def fills_since(self, since: Optional[datetime]) -> List[BrokerFill]: ...

    def positions(self) -> Dict[str, float]: ...

    def account_equity(self) -> Optional[float]: ...
