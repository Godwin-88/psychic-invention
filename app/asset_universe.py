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


YF_PERIODS = ("1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd")


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


@router.get("/quote/{symbol}")
def get_asset_quote(symbol: str) -> dict:
    """
    Fetch current spot price, name, and currency for a symbol via yfinance.
    """
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol.strip().upper())
        info = ticker.info or {}
        spot = (
            info.get("regularMarketPrice")
            or info.get("currentPrice")
            or info.get("previousClose")
        )
        if spot is None:
            hist = ticker.history(period="1d")
            spot = float(hist["Close"].iloc[-1]) if not hist.empty else None
        if spot is None:
            raise HTTPException(status_code=404, detail=f"No price found for {symbol}")
        return {
            "symbol": symbol.upper(),
            "spot": float(spot),
            "name": info.get("shortName", symbol),
            "currency": info.get("currency", "USD"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/options/{symbol}")
def get_asset_options(
    symbol: str,
    n_expiries: int = Query(3, ge=1, le=6, description="Number of nearest expiries to include"),
    moneyness_range: float = Query(0.20, ge=0.05, le=0.50, description="Strike range around ATM as fraction"),
) -> dict:
    """
    Fetch real option chain data from yfinance for Heston calibration.
    Returns call options (strike, expiry_years, mid_price, implied_vol) near ATM.
    """
    try:
        import yfinance as yf
        import math
        from datetime import date as date_cls

        ticker = yf.Ticker(symbol.strip().upper())

        # Current spot price
        info = ticker.info or {}
        spot = (
            info.get("regularMarketPrice")
            or info.get("currentPrice")
            or info.get("previousClose")
        )
        if spot is None:
            hist = ticker.history(period="1d")
            spot = float(hist["Close"].iloc[-1]) if not hist.empty else None
        if spot is None:
            raise HTTPException(status_code=404, detail=f"No spot price for {symbol}")
        spot = float(spot)

        # Available expiries
        expirations = ticker.options
        if not expirations:
            raise HTTPException(status_code=404, detail=f"No options data for {symbol}")

        today = date_cls.today()
        options_out = []

        for exp_str in expirations[:n_expiries]:
            try:
                exp_date = date_cls.fromisoformat(exp_str)
                tau = (exp_date - today).days / 365.0
                if tau <= 0.01:
                    continue

                chain = ticker.option_chain(exp_str)
                calls = chain.calls

                if calls is None or calls.empty:
                    continue

                # Filter strikes within moneyness_range of spot
                lo = spot * (1 - moneyness_range)
                hi = spot * (1 + moneyness_range)
                calls = calls[(calls["strike"] >= lo) & (calls["strike"] <= hi)]

                for _, row in calls.iterrows():
                    strike = float(row["strike"])
                    bid = float(row.get("bid", 0) or 0)
                    ask = float(row.get("ask", 0) or 0)
                    last = float(row.get("lastPrice", 0) or 0)
                    iv = float(row.get("impliedVolatility", 0) or 0)

                    # Use bid/ask mid if valid, else lastPrice
                    if bid > 0 and ask > 0:
                        mid = (bid + ask) / 2
                    elif last > 0:
                        mid = last
                    else:
                        continue

                    if mid <= 0 or math.isnan(mid) or math.isnan(iv):
                        continue

                    options_out.append({
                        "strike": round(strike, 2),
                        "expiry": round(tau, 4),
                        "expiry_str": exp_str,
                        "price": round(mid, 4),
                        "implied_vol": round(iv, 4),
                        "moneyness": round(strike / spot, 4),
                    })
            except Exception:
                continue

        if not options_out:
            raise HTTPException(status_code=404, detail=f"No valid options data found for {symbol}")

        return {
            "symbol": symbol.upper(),
            "spot": spot,
            "n_contracts": len(options_out),
            "contracts": options_out,
        }

    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(status_code=503, detail="yfinance not installed")
    except Exception as e:
        logger.exception("Options fetch failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
