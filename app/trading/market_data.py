"""
Point-in-time market data for trading decisions.

Every risk check and fill uses a `Quote` snapshot that carries its source and
timestamp, so a decision can be reproduced and stale prices can be refused.
yfinance is fine for research but is not licensed for trading; production
should register a licensed provider (broker feed, Polygon, Databento) behind
the same `MarketDataProvider` interface.
"""

from __future__ import annotations

import hashlib
import json
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Dict, Iterable, Optional, Protocol


@dataclass(frozen=True)
class Quote:
    symbol: str
    bid: float
    ask: float
    last: float
    ts: datetime
    source: str
    # Option analytics, when the source supplies them
    implied_vol: Optional[float] = None
    underlying_price: Optional[float] = None

    @property
    def mid(self) -> float:
        if self.bid > 0 and self.ask > 0:
            return 0.5 * (self.bid + self.ask)
        return self.last

    @property
    def spread(self) -> float:
        return max(self.ask - self.bid, 0.0) if self.bid > 0 and self.ask > 0 else 0.0

    def age_seconds(self, now: Optional[datetime] = None) -> float:
        now = now or datetime.now(timezone.utc)
        return (now - self.ts).total_seconds()

    def to_dict(self) -> dict:
        d = asdict(self)
        d["ts"] = self.ts.isoformat()
        return d


class MarketDataProvider(Protocol):
    name: str

    def quote(self, symbol: str) -> Optional[Quote]: ...


class StaticProvider:
    """In-memory quotes (paper trading, tests, replays)."""

    name = "static"

    def __init__(self, quotes: Optional[Dict[str, Quote]] = None):
        self._q: Dict[str, Quote] = dict(quotes or {})
        self._lock = threading.Lock()

    def set(self, symbol: str, bid: float, ask: float, last: Optional[float] = None, **kw) -> Quote:
        q = Quote(
            symbol=symbol,
            bid=bid,
            ask=ask,
            last=last if last is not None else 0.5 * (bid + ask),
            ts=kw.pop("ts", datetime.now(timezone.utc)),
            source=kw.pop("source", self.name),
            **kw,
        )
        with self._lock:
            self._q[symbol] = q
        return q

    def quote(self, symbol: str) -> Optional[Quote]:
        with self._lock:
            return self._q.get(symbol)


class YFinanceProvider:
    """Delayed quotes from yfinance. Research and paper trading only."""

    name = "yfinance"

    def quote(self, symbol: str) -> Optional[Quote]:  # pragma: no cover - network
        try:
            import yfinance as yf

            info = yf.Ticker(symbol).fast_info
            last = float(info["last_price"])
            bid = float(getattr(info, "bid", 0) or 0) or last
            ask = float(getattr(info, "ask", 0) or 0) or last
            return Quote(symbol, bid, ask, last, datetime.now(timezone.utc), self.name)
        except Exception:
            return None


def snapshot_hash(quotes: Iterable[Quote]) -> str:
    """Hash of the market data a decision was based on (stored with intents)."""
    body = json.dumps(sorted((q.to_dict() for q in quotes), key=lambda d: d["symbol"]), sort_keys=True)
    return hashlib.sha256(body.encode()).hexdigest()


_provider: MarketDataProvider = StaticProvider()


def get_provider() -> MarketDataProvider:
    return _provider


def set_provider(p: MarketDataProvider) -> None:
    global _provider
    _provider = p
