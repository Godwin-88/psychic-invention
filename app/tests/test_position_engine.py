"""FIFO position engine and TradeStore accounting."""

import threading

import pytest

from app.blotter.position_engine import build_books, pnl_totals, position_views
from app.blotter.trade_store import TradeStore


def _t(asset, direction, qty, price, date="2024-01-01", **kw):
    return {"asset": asset, "direction": direction, "quantity": qty, "entry_price": price, "entry_date": date, **kw}


def test_sell_closes_long_and_realises_pnl():
    # The old store booked this sell as a separate short: two positions, no realised P&L.
    books = build_books([_t("AAPL", "long", 10, 100), _t("AAPL", "short", 10, 110, "2024-01-02")])
    assert position_views(books, {"AAPL": 120}) == []
    totals = pnl_totals(books, {"AAPL": 120})
    assert totals["realized_pnl"] == pytest.approx(100.0)
    assert totals["unrealized_pnl"] == 0


def test_partial_close_uses_fifo_lots():
    books = build_books(
        [
            _t("X", "long", 10, 100, "2024-01-01"),
            _t("X", "long", 10, 120, "2024-01-02"),
            _t("X", "short", 15, 130, "2024-01-03"),
        ]
    )
    (pos,) = position_views(books, {"X": 125})
    # FIFO: 10 @100 and 5 @120 closed → realised 10·30 + 5·10 = 350; 5 @120 left.
    assert pos.realized_pnl == pytest.approx(350.0)
    assert pos.quantity == 5 and pos.direction == "long"
    assert pos.entry_price == pytest.approx(120.0)
    assert pos.unrealized_pnl == pytest.approx(25.0)


def test_flip_from_long_to_short():
    books = build_books([_t("X", "long", 5, 50), _t("X", "short", 8, 55, "2024-01-02")])
    (pos,) = position_views(books, {"X": 52})
    assert pos.direction == "short" and pos.quantity == 3
    assert pos.entry_price == pytest.approx(55.0)
    assert pos.realized_pnl == pytest.approx(25.0)
    assert pos.unrealized_pnl == pytest.approx(9.0)  # short 3 from 55 to 52


def test_short_then_cover():
    books = build_books([_t("X", "short", 4, 200), _t("X", "long", 4, 180, "2024-01-02")])
    assert pnl_totals(books, {})["realized_pnl"] == pytest.approx(80.0)


def test_fees_and_multiplier():
    books = build_books(
        [
            _t("SPY240621C500", "long", 2, 3.50, fees=1.30, multiplier=100),
            _t("SPY240621C500", "short", 2, 4.25, "2024-01-05", fees=1.30, multiplier=100),
        ]
    )
    t = pnl_totals(books, {})
    assert t["realized_pnl"] == pytest.approx(150.0)  # 0.75 × 2 × 100
    assert t["fees"] == pytest.approx(2.60)
    assert t["net_pnl"] == pytest.approx(147.40)


def test_decimal_arithmetic_has_no_float_drift():
    trades = [_t("X", "long", 0.1, 0.1, f"2024-01-{i + 1:02d}") for i in range(10)]
    trades.append(_t("X", "short", 1.0, 0.3, "2024-02-01"))
    assert pnl_totals(build_books(trades), {})["realized_pnl"] == 0.2  # exact


def test_missing_price_is_flagged_and_marked_at_cost():
    (pos,) = position_views(build_books([_t("X", "long", 1, 10)]), {})
    assert not pos.price_available and pos.unrealized_pnl == 0


def test_invalid_trades_rejected():
    with pytest.raises(ValueError):
        build_books([_t("X", "buy", 1, 10)])
    with pytest.raises(ValueError):
        build_books([_t("X", "long", -1, 10)])
    with pytest.raises(ValueError):
        build_books([_t("X", "long", 1, 10, multiplier=1), _t("X", "long", 1, 10, multiplier=100)])


def test_trade_store_timeseries_and_as_of():
    store = TradeStore()
    store.add_trade("A", "long", 10, 100, "2024-01-01")
    store.add_trade("A", "short", 5, 110, "2024-01-03")
    ts = store.get_pnl_timeseries(
        [
            {"date": "2024-01-02", "prices": {"A": 105}},
            {"date": "2024-01-04", "prices": {"A": 120}},
        ]
    )
    assert ts[0]["realized_pnl"] == 0 and ts[0]["unrealized_pnl"] == pytest.approx(50)
    assert ts[1]["realized_pnl"] == pytest.approx(50) and ts[1]["unrealized_pnl"] == pytest.approx(100)
    assert ts[1]["cumulative_pnl"] == pytest.approx(150)


def test_trade_store_is_thread_safe():
    store = TradeStore()

    def worker():
        for _ in range(200):
            store.add_trade("A", "long", 1, 10, "2024-01-01")

    threads = [threading.Thread(target=worker) for _ in range(8)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    (pos,) = store.get_positions({"A": 10})
    assert pos.quantity == 1600
    assert len({t["id"] for t in store.get_history()}) == 1600


def test_trade_store_validates_inputs():
    store = TradeStore()
    with pytest.raises(ValueError):
        store.add_trade("A", "long", 0, 10)
    with pytest.raises(ValueError):
        store.add_trade("A", "long", 1, 10, fees=-1)
    with pytest.raises(ValueError):
        store.add_trade("A", "long", 1, 10, entry_date="01/02/2024")


def test_blotter_routes_net_positions():
    from fastapi.testclient import TestClient

    from app.blotter import trade_store
    from app.main import app

    trade_store._store = TradeStore()
    c = TestClient(app)
    assert c.post("/blotter/trade", json={"asset": "Z", "direction": "long", "quantity": 10, "entry_price": 50, "entry_date": "2024-01-01"}).status_code == 200
    assert c.post("/blotter/trade", json={"asset": "Z", "direction": "short", "quantity": 4, "entry_price": 60, "entry_date": "2024-01-02", "fees": 1}).status_code == 200
    assert c.post("/blotter/trade", json={"asset": "Z", "direction": "long", "quantity": -5, "entry_price": 60}).status_code == 422
    pos = c.post("/blotter/positions", json={"current_prices": {"Z": 55}}).json()["positions"]
    assert len(pos) == 1 and pos[0]["quantity"] == 6 and pos[0]["realized_pnl"] == 40
    pnl = c.post("/blotter/pnl", json={"current_prices": {"Z": 55}}).json()
    assert pnl["net_pnl"] == pytest.approx(40 + 30 - 1)
