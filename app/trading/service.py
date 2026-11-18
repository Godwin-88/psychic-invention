"""
Process-wide trading service wiring (broker, market data, OMS).

Environment
-----------
TRADING_BROKER         paper (default) | alpaca
TRADING_MARKET_DATA    static (default; quotes set via the paper endpoint or code)
                       | yfinance (delayed; research/paper only)
TRADING_STARTING_EQUITY  paper account size (default 1,000,000)
"""

from __future__ import annotations

import os
import threading
from typing import Optional

from .market_data import MarketDataProvider, StaticProvider, YFinanceProvider, get_provider, set_provider
from .oms import OrderManager

_lock = threading.Lock()
_oms: Optional[OrderManager] = None


def _market_data() -> MarketDataProvider:
    kind = os.getenv("TRADING_MARKET_DATA", "static").lower()
    if kind == "yfinance":
        set_provider(YFinanceProvider())
    elif not isinstance(get_provider(), StaticProvider):
        set_provider(StaticProvider())
    return get_provider()


def _broker(md: MarketDataProvider):
    kind = os.getenv("TRADING_BROKER", "paper").lower()
    if kind == "alpaca":
        from .brokers.alpaca import AlpacaBroker

        return AlpacaBroker()
    from .brokers.paper import PaperBroker

    return PaperBroker(md, starting_cash=float(os.getenv("TRADING_STARTING_EQUITY", "1000000")))


def get_oms() -> OrderManager:
    global _oms
    if _oms is None:
        with _lock:
            if _oms is None:
                from .db import get_engine, init_schema

                get_engine()  # raises TradingUnavailable if misconfigured
                if not os.getenv("TRADING_SKIP_CREATE_ALL"):
                    init_schema()  # idempotent; production should run `alembic upgrade head`
                md = _market_data()
                _oms = OrderManager(_broker(md), md)
    return _oms


def set_oms(oms: Optional[OrderManager]) -> None:
    """Install a specific OMS (tests) or clear it."""
    global _oms
    _oms = oms
