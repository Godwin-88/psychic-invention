"""
Position engine: FIFO lot matching with realised / unrealised P&L.

Shared by the in-memory TradeStore and the Postgres blotter so both compute
positions identically.

Conventions
-----------
- A trade is a buy (``direction="long"``) or a sell (``direction="short"``)
  of ``quantity > 0`` units at ``entry_price``. A sell against an open long
  closes it (FIFO) and realises P&L; a sell beyond the long opens a short,
  and vice versa. Positions are netted per asset.
- ``multiplier`` is the contract multiplier (1 for cash equities, 100 for a
  standard US equity option). Notional = quantity × price × multiplier.
- ``fees`` are total commissions for the trade in account currency. They are
  reported separately and deducted in ``net_pnl``.
- Arithmetic is in ``Decimal``; results are returned as ``float`` for JSON.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from decimal import Decimal
from typing import Deque, Dict, Iterable, List, Mapping, Optional

ZERO = Decimal("0")


def D(x) -> Decimal:
    """Convert to Decimal through str so 0.1 stays 0.1."""
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


@dataclass
class Lot:
    qty: Decimal  # signed: > 0 long, < 0 short
    price: Decimal
    date: str


@dataclass
class AssetBook:
    asset: str
    multiplier: Decimal
    lots: Deque[Lot]
    realized: Decimal = ZERO
    fees: Decimal = ZERO
    first_open_date: Optional[str] = None

    @property
    def net_qty(self) -> Decimal:
        return sum((lot.qty for lot in self.lots), ZERO)

    @property
    def avg_price(self) -> Decimal:
        q = self.net_qty
        if q == 0:
            return ZERO
        return sum((lot.qty * lot.price for lot in self.lots), ZERO) / q


@dataclass
class PositionView:
    asset: str
    quantity: float  # absolute
    direction: str  # "long" | "short" | "flat"
    entry_price: float  # FIFO average cost of the open lots
    entry_date: Optional[str]
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    realized_pnl: float
    fees: float
    net_pnl: float  # realised + unrealised − fees
    market_value: float  # signed
    multiplier: float
    price_available: bool

    def to_dict(self) -> dict:
        return dict(self.__dict__)


def _apply(book: AssetBook, side_qty: Decimal, price: Decimal, date: str) -> None:
    """Apply a signed fill to the book with FIFO matching."""
    remaining = side_qty
    while remaining != 0 and book.lots and (book.lots[0].qty > 0) != (remaining > 0):
        lot = book.lots[0]
        closable = min(abs(lot.qty), abs(remaining))
        # Closing a long at `price`: (price − lot.price) per unit; a short: the reverse.
        sign = Decimal(1) if lot.qty > 0 else Decimal(-1)
        book.realized += sign * (price - lot.price) * closable * book.multiplier
        lot.qty -= sign * closable
        remaining += sign * closable
        if lot.qty == 0:
            book.lots.popleft()
    if remaining != 0:
        if not book.lots:
            book.first_open_date = date
        book.lots.append(Lot(qty=remaining, price=price, date=date))
    if not book.lots:
        book.first_open_date = None


def build_books(trades: Iterable[Mapping], as_of_date: Optional[str] = None) -> Dict[str, AssetBook]:
    """Replay trades (already in execution order) into per-asset books."""
    books: Dict[str, AssetBook] = {}
    for t in trades:
        date = str(t.get("entry_date") or "")
        if as_of_date and date > as_of_date:
            continue
        direction = str(t["direction"]).lower()
        if direction not in ("long", "short"):
            raise ValueError(f"direction must be 'long' or 'short', got {direction!r}")
        qty = D(t["quantity"])
        if qty <= 0:
            raise ValueError("quantity must be positive")
        asset = t["asset"]
        mult = D(t.get("multiplier") or 1)
        book = books.get(asset)
        if book is None:
            book = books[asset] = AssetBook(asset=asset, multiplier=mult, lots=deque())
        elif book.multiplier != mult:
            raise ValueError(f"inconsistent multiplier for {asset}: {book.multiplier} vs {mult}")
        signed = qty if direction == "long" else -qty
        _apply(book, signed, D(t["entry_price"]), date)
        book.fees += D(t.get("fees") or 0)
    return books


def position_views(
    books: Mapping[str, AssetBook],
    current_prices: Mapping[str, float],
    include_flat: bool = False,
) -> List[PositionView]:
    out: List[PositionView] = []
    for asset, book in books.items():
        q = book.net_qty
        if q == 0 and not include_flat:
            continue
        avg = book.avg_price
        has_price = asset in current_prices and current_prices[asset] is not None
        cur = D(current_prices[asset]) if has_price else avg
        unreal = (cur - avg) * q * book.multiplier
        cost = abs(avg * q * book.multiplier)
        out.append(
            PositionView(
                asset=asset,
                quantity=float(abs(q)),
                direction="flat" if q == 0 else ("long" if q > 0 else "short"),
                entry_price=float(avg),
                entry_date=book.first_open_date,
                current_price=float(cur),
                unrealized_pnl=float(unreal),
                unrealized_pnl_pct=float(unreal / cost * 100) if cost else 0.0,
                realized_pnl=float(book.realized),
                fees=float(book.fees),
                net_pnl=float(book.realized + unreal - book.fees),
                market_value=float(cur * q * book.multiplier),
                multiplier=float(book.multiplier),
                price_available=has_price,
            )
        )
    return out


def pnl_totals(books: Mapping[str, AssetBook], current_prices: Mapping[str, float]) -> dict:
    views = position_views(books, current_prices, include_flat=True)
    realized = sum(v.realized_pnl for v in views)
    unrealized = sum(v.unrealized_pnl for v in views)
    fees = sum(v.fees for v in views)
    return {
        "realized_pnl": realized,
        "unrealized_pnl": unrealized,
        "fees": fees,
        "net_pnl": realized + unrealized - fees,
        "gross_exposure": sum(abs(v.market_value) for v in views),
        "net_exposure": sum(v.market_value for v in views),
    }
