import os

import pytest

from app.trading import db
from app.trading.brokers.paper import PaperBroker
from app.trading.market_data import StaticProvider
from app.trading.oms import OrderManager
from app.trading.risk_gateway import RiskLimits


@pytest.fixture
def trading_db(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    # Set TRADING_TEST_DATABASE_URL=postgresql://... to run against PostgreSQL
    # (CI does); otherwise each test gets a fresh SQLite file.
    url = os.getenv("TRADING_TEST_DATABASE_URL") or f"sqlite:///{tmp_path / 'trading.db'}"
    db.reset_engine_for_tests(url)
    if url.startswith("postgres"):
        from app.trading.models import Base

        Base.metadata.drop_all(db.get_engine())
    db.init_schema()
    yield url
    db.reset_engine_for_tests()
    monkeypatch.delenv("TRADING_DATABASE_URL", raising=False)


@pytest.fixture
def md():
    p = StaticProvider()
    p.set("AAPL", 199.95, 200.05)
    p.set("MSFT", 399.90, 400.10)
    p.set("SPY", 499.95, 500.05)
    return p


@pytest.fixture
def oms(trading_db, md, monkeypatch):
    monkeypatch.setenv("TRADING_HALT_ON_RECON_BREAK", "false")
    broker = PaperBroker(md, slippage_bps=0, fee_per_unit=0.0, min_fee=1.0)
    return OrderManager(broker, md, starting_equity=1_000_000, default_limits=RiskLimits())
