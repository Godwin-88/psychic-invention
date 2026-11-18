"""
Deterministic paper broker.

Market orders fill immediately at the touch (ask for buys, bid for sells)
plus a configurable slippage; limit orders fill only when marketable against
the current quote, otherwise they rest until `match_resting()` is called with
new quotes. Fees: per-unit commission with a per-order minimum.
"""

from __future__ import annotations

import itertools
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional

from ..market_data import MarketDataProvider
from .base import BrokerAck, BrokerFill, BrokerOrder


class PaperBroker:
    name = "paper"
    live = False

    def __init__(
        self,
        market_data: MarketDataProvider,
        slippage_bps: float = 1.0,
        fee_per_unit: float = 0.005,
        min_fee: float = 1.0,
        starting_cash: float = 1_000_000.0,
        multipliers: Optional[Dict[str, float]] = None,
    ):
        self.md = market_data
        self.slippage_bps = slippage_bps
        self.fee_per_unit = fee_per_unit
        self.min_fee = min_fee
        self.cash = starting_cash
        self._multipliers = dict(multipliers or {})
        self._positions: Dict[str, float] = {}
        self._fills: List[BrokerFill] = []
        self._resting: Dict[str, BrokerOrder] = {}
        self._ids = itertools.count(1)
        self._lock = threading.Lock()

    # ── helpers ───────────────────────────────────────────────────────────────
    def _fill(self, order: BrokerOrder, price: float, mult: float) -> BrokerFill:
        fee = max(self.min_fee, self.fee_per_unit * order.quantity * (mult if mult > 1 else 1))
        fill = BrokerFill(
            broker_fill_id=f"paper-fill-{next(self._ids)}",
            client_order_id=order.client_order_id,
            quantity=order.quantity,
            price=round(price, 6),
            fee=round(fee, 6),
            ts=datetime.now(timezone.utc),
        )
        signed = order.quantity if order.side == "buy" else -order.quantity
        self._positions[order.symbol] = self._positions.get(order.symbol, 0.0) + signed
        if abs(self._positions[order.symbol]) < 1e-12:
            del self._positions[order.symbol]
        self.cash -= signed * price * mult + fee
        self._fills.append(fill)
        return fill

    def _marketable_price(self, order: BrokerOrder) -> Optional[float]:
        q = self.md.quote(order.symbol)
        if q is None:
            return None
        touch = q.ask if order.side == "buy" else q.bid
        if not touch or touch <= 0:
            touch = q.mid
        slip = touch * self.slippage_bps / 1e4
        px = touch + slip if order.side == "buy" else touch - slip
        if order.order_type == "limit" and order.limit_price is not None:
            if order.side == "buy" and touch > order.limit_price:
                return None
            if order.side == "sell" and touch < order.limit_price:
                return None
            px = min(px, order.limit_price) if order.side == "buy" else max(px, order.limit_price)
        return px

    def set_multiplier(self, symbol: str, multiplier: float) -> None:
        self._multipliers[symbol] = multiplier

    # ── BrokerAdapter ────────────────────────────────────────────────────────
    def submit(self, order: BrokerOrder) -> BrokerAck:
        with self._lock:
            broker_id = f"paper-{next(self._ids)}"
            if self.md.quote(order.symbol) is None:
                return BrokerAck(False, broker_id, "rejected", f"no quote for {order.symbol}")
            px = self._marketable_price(order)
            mult = self._multipliers.get(order.symbol, 100.0 if order.asset_class == "option" else 1.0)
            if px is None:
                if order.time_in_force == "ioc":
                    return BrokerAck(True, broker_id, "cancelled", "IOC not marketable")
                self._resting[broker_id] = order
                return BrokerAck(True, broker_id, "submitted")
            fill = self._fill(order, px, mult)
            return BrokerAck(True, broker_id, "filled", fills=[fill])

    def match_resting(self) -> List[BrokerFill]:
        """Fill resting limit orders that became marketable."""
        out = []
        with self._lock:
            for bid, order in list(self._resting.items()):
                px = self._marketable_price(order)
                if px is not None:
                    mult = self._multipliers.get(order.symbol, 100.0 if order.asset_class == "option" else 1.0)
                    out.append(self._fill(order, px, mult))
                    del self._resting[bid]
        return out

    def cancel(self, broker_order_id: str) -> bool:
        with self._lock:
            return self._resting.pop(broker_order_id, None) is not None

    def fills_since(self, since: Optional[datetime]) -> List[BrokerFill]:
        with self._lock:
            return [f for f in self._fills if since is None or f.ts > since]

    def positions(self) -> Dict[str, float]:
        with self._lock:
            return dict(self._positions)

    def account_equity(self) -> Optional[float]:
        with self._lock:
            mv = 0.0
            for sym, qty in self._positions.items():
                q = self.md.quote(sym)
                if q is None:
                    return None
                mv += qty * q.mid * self._multipliers.get(sym, 1.0)
            return self.cash + mv
