"""
Trading persistence: engine and session factory.

The trading ledger (orders, fills, intents, audit log) lives in a SQL
database, never in process memory, so every worker sees the same state.

Configuration
-------------
TRADING_DATABASE_URL  preferred; falls back to DATABASE_URL.
                      Development default: sqlite:///./trading.db
APP_ENV=production    requires a PostgreSQL URL. Trading endpoints return 503
                      until one is configured (fail closed).
"""

from __future__ import annotations

import os
import threading
from contextlib import contextmanager
from typing import Iterator, Optional

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.security import is_production

_DEV_DEFAULT = "sqlite:///./trading.db"

_lock = threading.Lock()
_engine: Optional[Engine] = None
_factory: Optional[sessionmaker] = None


class TradingUnavailable(RuntimeError):
    """Raised when the trading ledger cannot be used in this configuration."""


def database_url() -> Optional[str]:
    url = os.getenv("TRADING_DATABASE_URL") or os.getenv("DATABASE_URL")
    if url:
        return url
    return None if is_production() else _DEV_DEFAULT


def check_configuration() -> str:
    """Return the URL to use, or raise TradingUnavailable (production fail-closed)."""
    url = database_url()
    if url is None:
        raise TradingUnavailable(
            "Trading requires TRADING_DATABASE_URL or DATABASE_URL (PostgreSQL) in production"
        )
    if is_production() and not url.startswith(("postgresql", "postgres")):
        raise TradingUnavailable("Production trading ledger must be PostgreSQL")
    return url


def get_engine() -> Engine:
    global _engine, _factory
    if _engine is None:
        with _lock:
            if _engine is None:
                url = check_configuration()
                kwargs = {"pool_pre_ping": True, "future": True}
                if url.startswith("sqlite"):
                    kwargs["connect_args"] = {"check_same_thread": False}
                _engine = create_engine(url, **kwargs)
                if url.startswith("sqlite"):
                    _enable_sqlite_fk(_engine)
                _factory = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
    return _engine


def _enable_sqlite_fk(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, _record):  # pragma: no cover - trivial
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


def init_schema() -> None:
    """Create tables if absent (development/tests). Production uses Alembic."""
    from .models import Base

    Base.metadata.create_all(get_engine())


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional scope: commit on success, roll back on error."""
    get_engine()
    assert _factory is not None
    session = _factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def reset_engine_for_tests(url: Optional[str] = None) -> None:
    """Dispose the engine; tests call this after changing the URL."""
    global _engine, _factory
    with _lock:
        if _engine is not None:
            _engine.dispose()
        _engine = None
        _factory = None
    if url:
        os.environ["TRADING_DATABASE_URL"] = url
