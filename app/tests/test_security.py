"""API-key scopes and CORS configuration."""

import pytest
from fastapi.testclient import TestClient

from app import security
from app.main import app

TRADE = {"asset": "SEC", "direction": "long", "quantity": 1, "entry_price": 10}


@pytest.fixture
def client():
    return TestClient(app)


def test_dev_without_keys_is_open(client, monkeypatch):
    monkeypatch.delenv("WRITE_API_KEYS", raising=False)
    monkeypatch.delenv("ADMIN_API_KEYS", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    assert client.post("/blotter/trade", json=TRADE).status_code == 200


def test_production_without_keys_fails_closed(client, monkeypatch):
    monkeypatch.delenv("WRITE_API_KEYS", raising=False)
    monkeypatch.delenv("ADMIN_API_KEYS", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    assert client.post("/blotter/trade", json=TRADE).status_code == 503
    assert client.get("/marketplace/registrations").status_code == 503


def test_scopes_enforced(client, monkeypatch):
    monkeypatch.setenv("WRITE_API_KEYS", "w-key")
    monkeypatch.setenv("ADMIN_API_KEYS", "a-key")
    assert client.post("/blotter/trade", json=TRADE).status_code == 401
    assert client.post("/blotter/trade", json=TRADE, headers={"X-API-Key": "nope"}).status_code == 403
    assert client.post("/blotter/trade", json=TRADE, headers={"X-API-Key": "w-key"}).status_code == 200
    assert client.post("/blotter/trade", json=TRADE, headers={"Authorization": "Bearer a-key"}).status_code == 200
    # PII endpoint: write key is not enough
    assert client.get("/marketplace/registrations", headers={"X-API-Key": "w-key"}).status_code == 403
    assert client.get("/marketplace/registrations", headers={"X-API-Key": "a-key"}).status_code == 200


def test_read_only_analytics_stay_open(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEYS", "a-key")
    r = client.post("/price/call/bs", json={"s": 100, "k": 100, "tau": 1, "r": 0.05, "sigma": 0.2})
    assert r.status_code == 200


def test_cors_rejects_wildcard(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(RuntimeError):
        security.cors_origins()
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com, http://localhost:3000")
    assert security.cors_origins() == ["https://app.example.com", "http://localhost:3000"]
