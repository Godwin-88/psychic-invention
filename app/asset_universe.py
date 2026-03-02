"""
Asset Universe API — yfinance-backed symbol search and types.

Provides a rich asset universe via Yahoo Finance Lookup:
- Asset types: equity, currency, cryptocurrency, etf, index, future, mutualfund
- Search scoped by type: when user selects "forex", results are currency pairs only.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

router = APIRouter(prefix="/assets", tags=["assets"])

logger = logging.getLogger(__name__)

# yfinance Lookup types — maps to our asset categories
# When type=forex → we call get_currency(); type=crypto → get_cryptocurrency(); etc.
YF_LOOKUP_TYPES = [
    "all",
    "equity",
    "currency",
    "cryptocurrency",
    "etf",
    "index",
    "future",
    "mutualfund",
]

ASSET_TYPE_LABELS = {
    "all": "All",
    "equity": "Equities",
    "currency": "Forex",
    "cryptocurrency": "Crypto",
    "etf": "ETFs",
    "index": "Indices",
    "future": "Commodities",
    "mutualfund": "Mutual Funds",
}


@router.get("/types")
def get_asset_types() -> List[dict]:
    """
    Return asset types supported by yfinance.
    Use these in search ?type= to scope results (e.g. forex → currency pairs only).
    """
    return [
        {"id": t, "label": ASSET_TYPE_LABELS.get(t, t)}
        for t in YF_LOOKUP_TYPES
    ]


def _map_type_to_yf_method(lookup_type: str):
    """Map API type to yfinance Lookup method name."""
    mapping = {
        "all": "get_all",
        "equity": "get_stock",
        "currency": "get_currency",
        "cryptocurrency": "get_cryptocurrency",
        "etf": "get_etf",
        "index": "get_index",
        "future": "get_future",
        "mutualfund": "get_mutualfund",
    }
    return mapping.get(lookup_type, "get_all")


@router.get("/search")
def search_assets(
    q: str = Query(..., min_length=1, description="Search query (symbol or name fragment)"),
    type: str = Query("all", description="Asset type filter (all, equity, currency, cryptocurrency, etf, index, future, mutualfund)"),
    count: int = Query(50, ge=5, le=100, description="Max results to return"),
) -> List[dict]:
    """
    Search assets via yfinance Lookup. Results are filtered by asset type.
    - type=currency → forex pairs only
    - type=cryptocurrency → crypto only
    - type=equity → stocks only
    - etc.
    """
    if type and type not in YF_LOOKUP_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Use one of: {', '.join(YF_LOOKUP_TYPES)}")

    try:
        import yfinance as yf
        lookup = yf.Lookup(q.strip(), raise_errors=False)
        method_name = _map_type_to_yf_method(type)
        method = getattr(lookup, method_name, lookup.get_all)
        df = method(count=count)

        if df is None or df.empty:
            return []

        out = []
        seen = set()
        for symbol in df.index:
            if symbol in seen or not symbol:
                continue
            seen.add(symbol)
            row = df.loc[symbol]
            try:
                name = str(row.get("shortName", row.get("longName", symbol)))
            except Exception:
                name = str(symbol)
            if name == "nan" or not name:
                name = str(symbol)
            out.append({
                "symbol": str(symbol),
                "type": type,
                "name": name[:80],
            })
            if len(out) >= count:
                break

        return out

    except ImportError:
        logger.error("yfinance not installed")
        raise HTTPException(status_code=503, detail="Asset search requires yfinance")
    except Exception as e:
        logger.exception("Asset search failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


YF_PERIODS = ("1d", "5d", "1mo", "3mo", "6mo", "1y", "ytd")


@router.get("/history")
def get_asset_history(
    symbol: str = Query(..., min_length=1, description="Asset symbol (e.g. AAPL, BTC-USD)"),
    period: str = Query("1mo", description="Period: 1d, 5d, 1mo, 3mo, 6mo, 1y, ytd"),
) -> List[dict]:
    """
    Fetch OHLC historical data via yfinance for charting.
    """
    if period not in YF_PERIODS:
        raise HTTPException(status_code=400, detail=f"Invalid period. Use one of: {', '.join(YF_PERIODS)}")

    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol.strip())
        df = ticker.history(period=period)

        if df is None or df.empty:
            return []

        import math
        out = []
        for ts, row in df.iterrows():
            def _num(v):
                try:
                    f = float(v)
                    return None if math.isnan(f) else f
                except (TypeError, ValueError):
                    return None
            out.append({
                "date": ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts),
                "open": _num(row.get("Open")),
                "high": _num(row.get("High")),
                "low": _num(row.get("Low")),
                "close": _num(row.get("Close")),
                "volume": _num(row.get("Volume")),
            })
        return out

    except ImportError:
        logger.error("yfinance not installed")
        raise HTTPException(status_code=503, detail="History requires yfinance")
    except Exception as e:
        logger.exception("Asset history failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
