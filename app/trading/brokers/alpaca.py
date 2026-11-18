"""
Alpaca Trading API v2 adapter (US equities).

Defaults to Alpaca's paper environment. Live trading requires BOTH
ALPACA_LIVE=true here and TRADING_ALLOW_LIVE=true in the OMS — two separate,
explicit opt-ins.

Environment: ALPACA_API_KEY_ID, ALPACA_API_SECRET_KEY, ALPACA_LIVE.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx

from .base import BrokerAck, BrokerError, BrokerFill, BrokerOrder

PAPER_URL = "https://paper-api.alpaca.markets"
LIVE_URL = "https://api.alpaca.markets"

_STATUS = {
    "new": "submitted",
    "accepted": "submitted",
    "pending_new": "submitted",
    "partially_filled": "partially_filled",
    "filled": "filled",
    "canceled": "cancelled",
    "expired": "expired",
    "rejected": "rejected",
}


def _parse_ts(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


class AlpacaBroker:
    name = "alpaca"

    def __init__(
        self,
        key_id: Optional[str] = None,
        secret: Optional[str] = None,
        live: Optional[bool] = None,
        transport: Optional[httpx.BaseTransport] = None,
        timeout: float = 10.0,
    ):
        self.live = bool(live if live is not None else os.getenv("ALPACA_LIVE", "").lower() == "true")
        key_id = key_id or os.getenv("ALPACA_API_KEY_ID")
        secret = secret or os.getenv("ALPACA_API_SECRET_KEY")
        if not key_id or not secret:
            raise BrokerError("ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY are required")
        self._http = httpx.Client(
            base_url=LIVE_URL if self.live else PAPER_URL,
            headers={"APCA-API-KEY-ID": key_id, "APCA-API-SECRET-KEY": secret},
            timeout=timeout,
            transport=transport,
        )

    def _request(self, method: str, path: str, **kw) -> httpx.Response:
        try:
            resp = self._http.request(method, path, **kw)
        except httpx.HTTPError as e:
            raise BrokerError(f"Alpaca {method} {path} failed: {e}") from e
        return resp

    def submit(self, order: BrokerOrder) -> BrokerAck:
        if order.asset_class != "equity":
            return BrokerAck(False, None, "rejected", "AlpacaBroker supports equities only")
        body = {
            "symbol": order.symbol,
            "qty": str(order.quantity),
            "side": order.side,
            "type": order.order_type,
            "time_in_force": order.time_in_force,
            "client_order_id": order.client_order_id,
        }
        if order.order_type == "limit":
            body["limit_price"] = str(order.limit_price)
        resp = self._request("POST", "/v2/orders", json=body)
        if resp.status_code in (403, 422):
            msg = resp.json().get("message", resp.text) if resp.content else resp.reason_phrase
            return BrokerAck(False, None, "rejected", f"Alpaca rejected: {msg}")
        if resp.status_code >= 400:
            raise BrokerError(f"Alpaca submit HTTP {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        return BrokerAck(True, data["id"], _STATUS.get(data.get("status", "new"), "submitted"))

    def cancel(self, broker_order_id: str) -> bool:
        resp = self._request("DELETE", f"/v2/orders/{broker_order_id}")
        if resp.status_code in (200, 204):
            return True
        if resp.status_code in (404, 422):  # unknown or no longer cancelable
            return False
        raise BrokerError(f"Alpaca cancel HTTP {resp.status_code}")

    def fills_since(self, since: Optional[datetime]) -> List[BrokerFill]:
        params = {"direction": "asc", "page_size": 100}
        if since:
            params["after"] = since.astimezone(timezone.utc).isoformat()
        resp = self._request("GET", "/v2/account/activities/FILL", params=params)
        if resp.status_code >= 400:
            raise BrokerError(f"Alpaca activities HTTP {resp.status_code}")
        return [
            BrokerFill(
                broker_fill_id=a["id"],
                client_order_id="",
                broker_order_id=a.get("order_id"),
                quantity=float(a["qty"]),
                price=float(a["price"]),
                fee=0.0,
                ts=_parse_ts(a["transaction_time"]),
            )
            for a in resp.json()
        ]

    def positions(self) -> Dict[str, float]:
        resp = self._request("GET", "/v2/positions")
        if resp.status_code >= 400:
            raise BrokerError(f"Alpaca positions HTTP {resp.status_code}")
        out = {}
        for p in resp.json():
            qty = float(p["qty"])
            out[p["symbol"]] = -abs(qty) if p.get("side") == "short" else qty
        return out

    def account_equity(self) -> Optional[float]:
        resp = self._request("GET", "/v2/account")
        if resp.status_code >= 400:
            raise BrokerError(f"Alpaca account HTTP {resp.status_code}")
        return float(resp.json()["equity"])
