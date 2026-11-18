# CLAUDE.md — Derivatives Pricing Engine

## Project Overview

A production-ready, high-performance financial derivatives pricing engine consisting of **four layers**:

| Layer | Technology | Port |
|-------|-----------|------|
| Rust Core Engine | `cdylib` via PyO3 / maturin | — (compiled library) |
| Redis Cache | Docker (`redis:7.2-alpine`) | **6379** |
| Python API | FastAPI + uvicorn | **8000** |
| React Frontend | Vite + TypeScript + Tailwind CSS | **3000** |

---

## Quick Start

```bash
# One-command startup — starts Redis (Docker), backend, frontend
./start-local.sh

# Flags
./start-local.sh --release      # Rust release build
./start-local.sh --no-redis     # skip Redis; in-memory cache only
./start-local.sh --no-frontend  # backend + Redis only
./start-local.sh --mock         # skip Rust; use Python mock engine

# Or use Make targets
make dev
```

---

## Key Commands

### Environment Setup
```bash
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# source venv/bin/activate         # Linux / macOS
pip install -r requirements.txt
cd frontend && npm install

# Optional: install OpenBB for broader data sources (large install)
pip install openbb
```

### Build Rust Core (REQUIRED before running the API)
```bash
maturin develop               # dev build (fast, unoptimised)
maturin develop --release     # release build (production performance)
```
> If Rust is unavailable the server falls back to `pricing_engine_mock.py` automatically.

### Run Backend API
```bash
uvicorn app.main:app --reload --port 8000
# Swagger docs → http://localhost:8000/docs
# ReDoc        → http://localhost:8000/redoc
# Health check → http://localhost:8000/health
```

### Run Frontend
```bash
cd frontend
npm run dev       # http://localhost:3000
npm run build     # production build → frontend/dist/
npm run preview   # preview production build
```

### Testing
```bash
# Python (all)
pytest app/tests/ -v
pytest app/tests/ -v --cov=app --cov-report=term-missing

# Python (property-based only)
pytest app/tests/test_mathematical_consistency_properties.py -v
pytest app/tests/test_deriv_api_properties.py -v

# Rust unit + integration
cargo test --no-default-features   # pyo3 extension-module off so tests link

# Rust property-based (proptest)
cargo test --no-default-features --features proptest

# Performance benchmarks
cargo bench

# Frontend
cd frontend && npm test
cd frontend && npm run test:watch
```

### Code Quality
```bash
black app/ --check && isort app/ --check && flake8 app/
black app/ && isort app/          # auto-fix
cargo clippy -- -D warnings
cd frontend && npm run lint
cd frontend && npm run type-check
```

---

## Architecture

```
React UI (port 3000)
    │  HTTP / JSON (proxy → 8000)
    ▼
FastAPI (port 8000)   app/main.py
    ├── /price/*               Black-Scholes, FFT, Heston pricing
    ├── /greeks/*              Delta, Gamma, Theta, Vega, Rho
    ├── /market-data/*         Deriv API integration
    ├── /market-data/live/*    yfinance + OpenBB (Redis-cached) ← NEW
    │     ├── GET /live/quote/{symbol}
    │     ├── GET /live/history/{symbol}
    │     ├── GET /live/options/{symbol}
    │     ├── GET /live/iv/{symbol}
    │     ├── GET /live/batch?symbols=A,B,C
    │     ├── GET /live/news/{symbol}     (OpenBB only)
    │     ├── GET /live/cache/stats
    │     └── DELETE /live/cache
    ├── /portfolio/*           Moments, performance metrics
    ├── /risk/*                VaR, ES (historical / parametric / MC)
    ├── /optimize/*            MVO, Black-Litterman, HRP, Risk-Parity, Kelly
    ├── /scenarios/*           Custom, probabilistic, Monte Carlo, behavioural
    ├── /factors/*             OLS factor model, Fama-MacBeth, Smart Beta, crowding
    ├── /blotter/*             Trade entry, positions, attribution, P&L
    ├── /heston/*              Calibration, implied vol surface
    └── /health                System diagnostics
         │  PyO3 bindings (maturin)
         ▼
    Rust core  src/
    ├── black_scholes.rs           Analytical BS call/put
    ├── fft_pricing_enhanced.rs    Auto-optimised FFT
    ├── heston.rs                  Stochastic vol (numerical integration)
    ├── greeks.rs                  Analytical + numerical Greeks
    ├── monte_carlo.rs             Path simulation
    └── performance_monitor.rs     Metrics

Redis (port 6379) — Docker container
    Namespace: mktdata:*
    ├── mktdata:yf:quote:AAPL       → 5 min TTL  (real-time quote)
    ├── mktdata:yf:history:AAPL:…   → 1 hr  TTL  (OHLCV)
    ├── mktdata:yf:options:AAPL:…   → 5 min TTL  (options chain)
    ├── mktdata:openbb:quote:AAPL   → 5 min TTL
    └── mktdata:<deriv-api-hash>    → 5 min TTL  (Deriv API responses)
```

### Cache Hierarchy (per request)
```
L1  In-process TTLCache  (30 s,  per uvicorn worker, zero-latency)
L2  Redis               (5 min, shared across workers, sub-ms)
L3  Redis long-TTL      (1 hr,  OHLCV history, news)
─── Source API          (yfinance / OpenBB / Deriv) on cache miss
```

---

## New Modules (Redis + Live Data)

| Path | Purpose |
|------|---------|
| `app/cache/__init__.py` | Package export |
| `app/cache/redis_cache.py` | `RedisMarketDataCache` — async L1+L2 cache; auto-fallback to in-memory |
| `app/market_data/__init__.py` | Package export |
| `app/market_data/live_data.py` | `get_yf_quote/history/options/iv`, `get_openbb_quote/history/news` |
| `docker-compose.yml` | Redis 7.2-alpine service + optional Redis Commander UI |
| `.env.example` | All environment variables with comments |

## Module Map

| Path | Purpose |
|------|---------|
| `app/main.py` | FastAPI app, CORS, middleware, all pricing endpoints |
| `app/transact_routes.py` | Transact-tab routes: portfolio, risk, optimizer, blotter, scenarios, factors |
| `app/portfolio_engine.py` | Portfolio moments & performance metrics (Sharpe, Sortino, M2…) |
| `app/risk/var_engine.py` | VaR / ES: historical, parametric, Monte Carlo |
| `app/optimizer/mvo.py` | Mean-Variance Optimization via cvxpy |
| `app/optimizer/black_litterman.py` | Black-Litterman model |
| `app/optimizer/hrp.py` | Hierarchical Risk Parity |
| `app/optimizer/risk_parity.py` | ERC / Relaxed Risk Parity |
| `app/optimizer/kelly.py` | Kelly criterion (single & multi-asset) |
| `app/blotter/trade_store.py` | In-memory trade blotter |
| `app/blotter/attribution.py` | Performance attribution (alpha, beta, factor, residual) |
| `app/scenarios/scenario_engine.py` | Custom & historical stress tests (GFC, COVID, Quant Melt) |
| `app/scenarios/monte_carlo.py` | MC portfolio simulation (normal / t-dist) |
| `app/scenarios/behavioral.py` | Prospect theory utility & herding VaR |
| `app/factors/factor_model.py` | OLS factor model |
| `app/factors/fama_macbeth.py` | Fama-MacBeth two-stage regression |
| `app/factors/smart_beta.py` | Quintile & signal-weighted smart beta |
| `app/factors/crowding.py` | Factor crowding / herding index |
| `app/vol/calibration.py` | Heston calibration (vega-weighted least squares) & implied vol (Brent) |
| `app/higher_moments.py` | Coskewness matrix |
| `app/deriv_api_client.py` | Deriv API WebSocket client + L1/L2 cache |
| `app/market_data_endpoints.py` | Market data FastAPI router |
| `app/error_handling.py` | Structured error types + logging (JSON) |
| `app/health_check.py` | `/health` and `/health/detailed` reports |
| `frontend/src/App.tsx` | React router root |
| `frontend/src/components/Transact/TransactPage.tsx` | Transact tab shell (Portfolio / Risk / Optimizer / Scenarios / Blotter) |
| `frontend/src/config/api.ts` | Axios base URL (`VITE_API_URL`) |
| `frontend/src/hooks/useApi.ts` | Generic API fetch hook |

---

## Environment Variables

Copy `.env.example` → `.env` and fill in values. `start-local.sh` auto-loads `.env`.

### Backend (`.env` at project root)
```bash
# Redis (Docker — started by start-local.sh)
REDIS_URL=redis://localhost:6379/0
CACHE_TTL_L1=30       # in-process L1 TTL (seconds)
CACHE_TTL_L2=300      # Redis L2 TTL — real-time quotes, options, IV
CACHE_TTL_L3=3600     # Redis L3 TTL — OHLCV history, news

# Deriv API
DERIV_API_KEY=your_key
DERIV_APP_ID=your_app_id

# OpenBB (optional)
# OPENBB_PAT=your_personal_access_token

MAX_CONCURRENT_REQUESTS=1000
RATE_LIMIT_PER_SECOND=10
```

### Frontend (`frontend/.env`)
```bash
VITE_API_URL=http://localhost:8000
VITE_ENV=development
VITE_ENABLE_DEMO=true
```

---

## Common Pitfalls

1. **Import error for `pricing_engine`** — Rust library not built. Run `maturin develop` first.
2. **cvxpy not installed** → MVO/Kelly endpoints return 503. `pip install cvxpy`.
3. **Port 8000 in use** → Kill existing process: `lsof -ti:8000 | xargs kill -9`.
4. **CORS errors in browser** — Backend CORS is set to `localhost:3000`. Frontend must run on port 3000.
5. **Feller condition violated** → Heston endpoints return 400 if `2κθ ≤ σᵥ²`. Adjust parameters.
6. **Redis connection refused** → Docker not running. Run `docker compose up -d redis` or use `--no-redis` flag.
7. **`redis.asyncio` AttributeError** → `redis` package too old. `pip install "redis>=5.0"`.
8. **OpenBB import error** → OpenBB is optional. Install with `pip install openbb` or endpoints silently fall back to yfinance.
9. **yfinance returns empty data** → Yahoo Finance rate-limit or symbol not found. Check symbol spelling; wait 30s and retry.
10. **Redis cache stale after code change** → `curl -X DELETE http://localhost:8000/market-data/live/cache` to flush.

---

## Deployment

- **Backend** → Render.com (`render.yaml`). Build: install Rust + pip + maturin. Start: gunicorn + uvicorn workers.
- **Frontend** → Vercel (`vercel.json`). Static build: `npm run build` → `dist/`.

---

## Code Style Conventions

- **Python**: Black (line length 88), isort, type hints on public functions.
- **Rust**: `cargo fmt`, `clippy` with no warnings.
- **TypeScript**: strict mode, functional components, custom hooks for API calls.
- **API responses**: always JSON with a `model` field identifying the pricing model used.
- **Error handling**: raise `HTTPException` with descriptive `detail` strings; never swallow exceptions silently.
