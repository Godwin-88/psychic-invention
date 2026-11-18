# Trading layer — reference implementation (not for this repo's roadmap)

This branch holds a trading layer built for psychic-invention before deciding
that execution belongs in **GraphAlpha** (`Godwin-88/sturdy-couscous`), with
psychic-invention serving as its quant engine (pricing, Greeks, VaR,
optimisation). Keep it as a reference to port from; it is not merged.

## Status

| Module | What it is | Status |
|---|---|---|
| `db.py`, `models.py`, `migrations/` | SQLAlchemy ledger (orders, fills, intents, risk config, audit); production requires PostgreSQL; Alembic migration | Tested on SQLite and PostgreSQL 16 |
| `audit.py` | Append-only, hash-chained audit log with tamper detection | Tested |
| `risk_gateway.py` | Pure pre-trade checks: kill switch, fat-finger cap, position/gross/concentration, price collar, spread, stale quote, rate limit, VaR budget, $delta/vega/gamma, drawdown and daily-loss breakers (risk-reducing exemptions) | 21 tests |
| `oms.py` | Order state machine, idempotency keys (race-safe), fill application, approvals with risk re-check, kill switch, reconciliation, live-trading opt-in | 17 tests (SQLite + PostgreSQL) |
| `brokers/paper.py`, `brokers/alpaca.py` | Deterministic paper broker; Alpaca v2 REST adapter (paper by default) | Paper tested; Alpaca tested against mocked HTTP only |
| `routes.py` | `/v1/trading/*` REST API with write/admin scopes | Not yet covered by tests |
| `agents/intents.py`, `agents/pipeline.py` | Intents, deterministic sizing, autonomy levels L0–L3, approval flow | Written, **untested** |
| Tool server / MCP / Claude agent runner / evals | Planned | Not started |

## Porting notes for GraphAlpha

- The gateway (`evaluate`) is dependency-free apart from the pricing engine for
  option Greeks; it can replace or front `agent/risk_agent.py` /
  `cpp-risk` approval with the same check list.
- Idempotent `client_order_id`s and fill de-duplication map directly onto
  Alpaca's `client_order_id` and activity ids.
- Autonomy levels and the approval queue fit GraphAlpha's human-approved
  `CreditDecision` pattern.
