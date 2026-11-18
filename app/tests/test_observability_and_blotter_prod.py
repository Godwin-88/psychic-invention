"""Prometheus /metrics and the production-only Postgres blotter requirement."""

from fastapi.testclient import TestClient

from app.main import app


def test_metrics_endpoint_counts_requests_by_route():
    c = TestClient(app)
    c.post("/price/call/bs", json={"s": 100, "k": 100, "tau": 1, "r": 0.05, "sigma": 0.2})
    body = c.get("/metrics").text
    assert 'http_requests_total{method="POST",route="/price/call/bs",status="200"}' in body
    assert "http_request_duration_seconds_bucket" in body


def test_blotter_requires_postgres_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("WRITE_API_KEYS", "k")
    c = TestClient(app)
    for method, path, body in [
        ("get", "/blotter/positions", None),
        ("get", "/blotter/history", None),
        ("get", "/blotter/context", None),
        ("post", "/blotter/pnl", {"current_prices": {"A": 1}}),
        ("post", "/blotter/trade", {"asset": "A", "direction": "long", "quantity": 1, "entry_price": 1}),
    ]:
        kw = {"json": body} if body is not None else {}
        r = getattr(c, method)(path, headers={"X-API-Key": "k"}, **kw)
        assert r.status_code == 503, (path, r.status_code, r.text)
        assert "DATABASE_URL" in r.json()["detail"]


def test_blotter_in_memory_still_works_in_development(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    c = TestClient(app)
    assert c.get("/blotter/positions").status_code == 200
