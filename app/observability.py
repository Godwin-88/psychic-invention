"""Prometheus metrics: HTTP latency/volume and trading counters (GET /metrics)."""

from __future__ import annotations

import time

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

HTTP_REQUESTS = Counter(
    "http_requests_total", "HTTP requests", ["method", "route", "status"]
)
HTTP_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "route"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)
ORDERS = Counter("trading_orders_total", "Orders by final status of submission", ["status", "source"])
RISK_REJECTIONS = Counter("trading_risk_rejections_total", "Risk gateway rejections by failed check", ["check"])
INTENTS = Counter("trading_intents_total", "Agent intents by outcome", ["agent", "status"])
KILL_SWITCH = Counter("trading_kill_switch_changes_total", "Kill switch changes", ["state"])


def _route_template(request: Request) -> str:
    route = request.scope.get("route")
    return getattr(route, "path", None) or "unmatched"


def install(app: FastAPI) -> None:
    @app.middleware("http")
    async def _metrics(request: Request, call_next):
        start = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        finally:
            route = _route_template(request)
            HTTP_REQUESTS.labels(request.method, route, str(status)).inc()
            HTTP_LATENCY.labels(request.method, route).observe(time.perf_counter() - start)

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


def record_order(order: dict) -> None:
    ORDERS.labels(order.get("status", "unknown"), (order.get("source") or "manual").split(":")[0]).inc()
    decision = order.get("risk_decision") or {}
    for c in decision.get("checks", []):
        if not c.get("passed"):
            RISK_REJECTIONS.labels(c.get("name", "unknown")).inc()
