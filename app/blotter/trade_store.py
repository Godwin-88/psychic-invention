"""
Trade Store — in-memory trade ledger with FIFO position accounting.

Positions, realised and unrealised P&L come from app.blotter.position_engine
(shared with the Postgres blotter). State is per process: with several
workers, set DATABASE_URL so the Postgres blotter is used instead.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import List, Optional

from .position_engine import PositionView, build_books, pnl_totals, position_views

# Backwards-compatible name: positions are PositionView objects with the old
# fields (asset, quantity, direction, entry_price, entry_date, current_price,
# unrealized_pnl, unrealized_pnl_pct) plus realised P&L, fees and exposure.
Position = PositionView


@dataclass
class Trade:
    """Single trade record (a fill)."""

    id: str
    asset: str
    direction: str  # "long" = buy, "short" = sell
    quantity: float
    entry_price: float
    entry_date: str
    model_used: Optional[str] = None
    theoretical_price_at_entry: Optional[float] = None
    strategy_tag: Optional[str] = None
    asset_class: Optional[str] = None
    fees: float = 0.0
    multiplier: float = 1.0
    seq: int = 0


class TradeStore:
    """Thread-safe in-memory trade ledger."""

    def __init__(self):
        self._trades: List[Trade] = []
        self._lock = threading.Lock()
        self._seq = 0

    def add_trade(
        self,
        asset: str,
        direction: str,
        quantity: float,
        entry_price: float,
        entry_date: Optional[str] = None,
        model_used: Optional[str] = None,
        theoretical_price: Optional[float] = None,
        strategy_tag: Optional[str] = None,
        asset_class: Optional[str] = None,
        fees: float = 0.0,
        multiplier: float = 1.0,
    ) -> Trade:
        direction = direction.lower()
        if direction not in ("long", "short"):
            raise ValueError("direction must be 'long' or 'short'")
        if not quantity or quantity <= 0:
            raise ValueError("quantity must be positive (use direction for the side)")
        if entry_price is None or entry_price <= 0:
            raise ValueError("entry_price must be positive")
        if fees < 0:
            raise ValueError("fees cannot be negative")
        if multiplier <= 0:
            raise ValueError("multiplier must be positive")
        if entry_date:
            datetime.strptime(entry_date, "%Y-%m-%d")  # validate format
        with self._lock:
            existing = next((t for t in self._trades if t.asset == asset), None)
            if existing is not None and existing.multiplier != multiplier:
                raise ValueError(
                    f"multiplier for {asset} is {existing.multiplier}, got {multiplier}"
                )
            self._seq += 1
            trade = Trade(
                id=str(uuid.uuid4()),
                asset=asset,
                direction=direction,
                quantity=float(quantity),
                entry_price=float(entry_price),
                entry_date=entry_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                model_used=model_used,
                theoretical_price_at_entry=theoretical_price,
                strategy_tag=strategy_tag,
                asset_class=asset_class,
                fees=float(fees),
                multiplier=float(multiplier),
                seq=self._seq,
            )
            self._trades.append(trade)
            return trade

    def _ordered(self) -> List[dict]:
        with self._lock:
            trades = sorted(self._trades, key=lambda t: (t.entry_date, t.seq))
        return [asdict(t) for t in trades]

    def get_trades(
        self,
        asset: Optional[str] = None,
        strategy_tag: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> List[Trade]:
        with self._lock:
            out = list(self._trades)
        if asset:
            out = [t for t in out if t.asset == asset]
        if strategy_tag:
            out = [t for t in out if t.strategy_tag == strategy_tag]
        if from_date:
            out = [t for t in out if t.entry_date >= from_date]
        if to_date:
            out = [t for t in out if t.entry_date <= to_date]
        return out

    def get_positions(
        self,
        current_prices: dict,
        as_of_date: Optional[str] = None,
        include_flat: bool = False,
    ) -> List[PositionView]:
        """Net FIFO positions per asset. Assets without a price are marked at cost."""
        books = build_books(self._ordered(), as_of_date)
        return position_views(books, current_prices or {}, include_flat)

    def get_pnl_summary(self, current_prices: dict, as_of_date: Optional[str] = None) -> dict:
        return pnl_totals(build_books(self._ordered(), as_of_date), current_prices or {})

    def get_cumulative_pnl(
        self,
        current_prices: dict,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> float:
        """Net P&L (realised + unrealised − fees) as of `to_date` (default: all trades)."""
        return self.get_pnl_summary(current_prices, to_date)["net_pnl"]

    def get_history(self) -> List[dict]:
        return [
            {
                "id": t["id"],
                "asset": t["asset"],
                "direction": t["direction"],
                "quantity": t["quantity"],
                "entry_price": t["entry_price"],
                "entry_date": t["entry_date"],
                "model_used": t["model_used"],
                "theoretical_price_at_entry": t["theoretical_price_at_entry"],
                "strategy_tag": t["strategy_tag"],
                "fees": t["fees"],
                "multiplier": t["multiplier"],
            }
            for t in self._ordered()
        ]

    def get_pnl_timeseries(
        self,
        price_history: List[dict],
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> List[dict]:
        """
        Net P&L through time.
        price_history: [{"date": "2024-01-01", "prices": {"AAPL": 150}}, ...]
        Returns [{"date", "cumulative_pnl", "realized_pnl", "unrealized_pnl",
                  "fees", "positions_value"}, ...]
        """
        trades = self._ordered()
        out = []
        for ph in sorted(price_history, key=lambda x: x.get("date", "")):
            date = ph.get("date", "")
            if (from_date and date < from_date) or (to_date and date > to_date):
                continue
            totals = pnl_totals(build_books(trades, date), ph.get("prices", {}))
            out.append(
                {
                    "date": date,
                    "cumulative_pnl": totals["net_pnl"],
                    "realized_pnl": totals["realized_pnl"],
                    "unrealized_pnl": totals["unrealized_pnl"],
                    "fees": totals["fees"],
                    "positions_value": totals["net_exposure"],
                }
            )
        return out

    def clear(self) -> None:
        with self._lock:
            self._trades.clear()
            self._seq = 0


_store: Optional[TradeStore] = None
_store_lock = threading.Lock()


def get_trade_store() -> TradeStore:
    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                _store = TradeStore()
    return _store
