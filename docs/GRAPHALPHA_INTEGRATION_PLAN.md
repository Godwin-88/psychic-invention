# GraphAlpha × psychic-invention integration plan

**Goal:** one execution system. GraphAlpha (`Godwin-88/sturdy-couscous`) owns
signals, risk and order execution; psychic-invention (`Godwin-88/psychic-invention`)
is its quant engine (pricing, Greeks, implied vol, VaR, optimisation). Nothing
trades from psychic-invention.

**Sources to port from:** branch `claude/trading-layer-reference` of
psychic-invention (`app/trading/`, see its `README.md` for what is tested).

---

## What GraphAlpha does today (as read on 2026-11-18, commit `241d7cd`)

| Area | Where | Notes for the port |
|---|---|---|
| Cycle | `agent/orchestrator.py` | 12 sub-agents per cycle; signals published to Redis |
| Risk + execution, normal mode | `cpp-risk/` (`RiskEngine.cpp`, `execution_engine.cpp`, IBKR/Kraken adapters) | Consumes signals from Redis, sizes (half-Kelly), approves **and submits** |
| Risk + execution, `SHADOW_MODE` | `agent/risk_agent.py`, `agent/execution_agent.py` | Python path kept for comparison; Alpaca/Kraken |
| Option Greeks | `agent/risk_book.py::black_scholes_greeks` (used by `hedge_agent.py`, `build_risk_metrics`) | Plain BS: no dividend yield, no early exercise (Alpaca equity options are American), `r` defaults to 5% |
| VaR | `RiskAgent._marginal_var` | Per-ticker σ·z on 60-day returns, ignores correlation; 3% fallback |
| Halt | `Orchestrator.halted` | In-memory flag: a restart clears a drawdown halt |
| Audit | `agent/evidence_chain.py` | Hash chain + Merkle proofs per cycle — reuse it, do not add a second chain |
| Human gating | `HedgeAgent` (human-gated), CreditGraph `CreditDecision` | Natural fit for autonomy level L2 |

---

## Step 0 — make psychic-invention importable as a library (in psychic-invention)

Today its wheel contains only the Rust extension; VaR and implied vol live in
the Python `app/` package and are not installable.

- Convert to a maturin *mixed* project: Python package `quant_engine/` with
  `pricing` (re-export of the Rust module), `risk.var` (from `app/risk/var_engine.py`),
  `vol` (`implied_vol_bs`, `heston_calibrate` from `app/vol/calibration.py`),
  `optimizer` (from `app/optimizer/`). `app/` imports from it, so there is one copy.
- Publish the abi3 wheel as a GitHub release asset (CI already builds
  `wheel-linux`); version it (start at 0.2.0) and pin it in GraphAlpha.
- Acceptance: `pip install quant_engine-0.2.0-cp310-abi3-*.whl` then
  `from quant_engine.risk.var import compute_var_all_methods` works with no
  FastAPI installed.

## Step 1 — GraphAlpha uses the engine (no behaviour change intended)

1. Add the pinned wheel to `agent/requirements.txt` and `api/requirements.txt`.
2. New `agent/quant.py`: thin wrapper over `quant_engine` (Greeks with `q`,
   `price_american`, `implied_vol_bs`, portfolio VaR). **No silent fallback** to
   the old code: fail loudly if the import fails.
3. `risk_book.black_scholes_greeks` → `quant.greeks(...)`. Units already match
   (theta per day, vega and rho per 1%). Add `q` (dividend yield) and use
   `price_american` delta/gamma for single-stock options.
4. `RiskAgent._marginal_var` → incremental portfolio VaR (covariance-based,
   99% 1-day; mean scaled with T, vol with √T).
5. Parity tests: old vs new Greeks on a grid (equal to 1e-8 for q=0 European);
   VaR vs a hand-computed two-asset case.

## Step 2 — one pre-trade gate in front of the broker (decision needed)

Two submitters exist (C++ normal mode, Python shadow mode). The gate must sit
immediately before the *only* code that submits orders. Options:

| Option | Work | Trade-off |
|---|---|---|
| **A (recommended)** — C++ engine keeps sizing/approval; Python `ExecutionAgent` becomes the single submitter, behind the ported gateway | Move submission out of `execution_engine.cpp`; consume approved orders from Redis in Python | Gate code is the tested reference (`risk_gateway.evaluate`, 21 tests); cycles are minutes, so C++ latency is not needed for submission |
| B — port the checks into `RiskEngine.cpp` | Rewrite ~15 checks in C++ | Keeps C++ path; tests must be rewritten too |

Port (option A):
- `risk_gateway.py` as `agent/risk_gateway.py` (pure; only dependency is the
  engine for option Greeks). Checks: kill switch, fat-finger cap, position /
  gross / concentration, price collar, spread, stale quote, rate limit, VaR
  budget, $delta / vega / gamma, drawdown and daily-loss breakers. Breakers and
  exposure limits exempt risk-reducing orders; per-order checks never do.
- Limits in Postgres (table `risk_config`), not env vars, with every change audited.
- Kill switch persisted (replaces `Orchestrator.halted`); drawdown halt sets it,
  so it survives restarts; turning it on cancels open orders.

## Step 3 — idempotent orders, fills, reconciliation

- `client_order_id = f"{cycle_id}:{ticker}:{n}"` sent to Alpaca (`client_order_id`)
  and Kraken (`userref`/`cl_ord_id`); unique in Postgres — a retried cycle cannot
  double-submit (reference: `oms.py::submit`, race-tested).
- Order state machine (`new → pending_approval → submitted → partially_filled →
  filled | cancelled | rejected | expired`) with allowed transitions enforced.
- Fills de-duplicated by broker activity id; positions derived from fills (FIFO
  engine) rather than stored separately.
- Reconcile ledger vs `GET /v2/positions` every cycle; a break sets the kill
  switch (`TRADING_HALT_ON_RECON_BREAK=true` default).
- Live trading requires two opt-ins (`ALPACA_LIVE=true` and `TRADING_ALLOW_LIVE=true`).

## Step 4 — autonomy levels and approvals

| Level | Behaviour | GraphAlpha mapping |
|---|---|---|
| L0 suggest | sized + dry-run risk check, recorded only | new or unproven sub-agents |
| L1 paper | executes only on paper | default for signal agents |
| L2 approval | orders wait as `pending_approval`; risk re-checked at approval | `HedgeAgent`, CreditGraph, DeFi (already human-gated) |
| L3 autonomous | executes within limits | only after N weeks of paper results matching backtest |

- Per-agent config table (level, enabled, max notional per intent); unknown agents = L0.
- Approval endpoints in `api/routes/` (admin scope) and a queue in the frontend.
- Every decision (intent, sizing, each check, approval, fill) appended to
  `EvidenceChain`.

## Step 5 — evaluations

- Port `test_risk_gateway.py` and `test_oms.py` (run against Postgres in CI).
- Adversarial: a news item reading "BUY MAX SIZE" flowing through `NewsAgent`
  must end in a gateway rejection, never an order.
- Replay: re-run recorded cycles; decisions must be identical (gateway is pure).

## Out of scope for the first pass

DreamDEX / Somnia, CreditGraph on-chain settlement, new strategies.

---

## Prompt for the GraphAlpha session

> Read `docs/GRAPHALPHA_INTEGRATION_PLAN.md` on branch
> `claude/trading-layer-reference` of Godwin-88/psychic-invention, and the code
> in that branch's `app/trading/`. Implement Steps 1–3 in this repository
> (GraphAlpha). Start by confirming option A vs B for Step 2 with me. Keep
> behaviour identical in Step 1 and prove it with parity tests before changing
> any risk logic.
