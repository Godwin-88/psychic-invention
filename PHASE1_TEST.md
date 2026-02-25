# Transact Setup & Test — Phase 1 + Phase 2

## 1. Fix venv (if broken)

If `pip install` failed with `ModuleNotFoundError: No module named 'pip'`:

1. **Close all terminals** using the venv
2. Delete the venv folder: `Remove-Item -Recurse -Force venv`
3. Create a fresh venv: `python -m venv venv`
4. Activate: `.\venv\Scripts\Activate.ps1`

## 2. Install dependencies

**Option A — Minimal (Phase 1 + 2):**
```powershell
.\venv\Scripts\Activate.ps1
python -m pip install setuptools wheel
pip install fastapi "uvicorn[standard]" pydantic numpy scipy pandas httpx requests cvxpy
```

**Option B — Full requirements:**
```powershell
pip install -r requirements.txt
```

## 3. Start the backend

```powershell
cd c:\Users\USER\Downloads\Portfolio\psychic-invention
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

API will run at `http://localhost:8000`

---

## 4. Phase 1 endpoints

Open `http://localhost:8000/docs` and try:

| Endpoint | Body |
|----------|------|
| `POST /portfolio/moments` | `{"returns": [[0.01,-0.005,0.02],[0.02,0.01,-0.01],[0.015,0.02,0.01]], "weights": [0.33,0.33,0.34]}` |
| `POST /portfolio/performance` | `{"portfolio_returns": [0.01,0.02,-0.01,0.015], "risk_free_rate": 0.02, "portfolio_beta": 1.0}` |
| `POST /risk/var` | `{"returns": [[0.01,-0.01],[0.02,0.005]], "weights": [0.5,0.5], "alpha": 0.05, "portfolio_value": 1000000}` |
| `POST /optimize/mvo` | `{"covariance": [[0.04,0.02],[0.02,0.09]], "expected_returns": [0.08,0.12], "risk_free_rate": 0.02}` |
| `POST /optimize/mvo/frontier` | `{"covariance": [[0.04,0.02,0.01],[0.02,0.09,0.015],[0.01,0.015,0.06]], "expected_returns": [0.08,0.12,0.06], "risk_free_rate": 0.02, "n_points": 50}` |
| `POST /blotter/trade` | `{"asset": "AAPL", "direction": "long", "quantity": 100, "entry_price": 150}` |
| `POST /blotter/positions` | `{"current_prices": {"AAPL": 155, "MSFT": 400}}` |
| `GET /blotter/history` | (no body) |

---

## 5. Phase 2 endpoints

| Endpoint | Body |
|----------|------|
| `POST /optimize/blm` | `{"covariance": [[0.04,0.02,0.01],[0.02,0.09,0.015],[0.01,0.015,0.06]], "market_weights": [0.5,0.3,0.2], "P": [[0,1,-1]], "Q": [0.02], "tau": 0.05, "risk_free_rate": 0.02}` |
| `POST /optimize/risk-parity` | `{"covariance": [[0.04,0.02],[0.02,0.09]], "expected_returns": [0.08,0.12], "rho": 0}` |
| `POST /optimize/risk-parity` (RRP) | `{"covariance": [[0.04,0.02],[0.02,0.09]], "expected_returns": [0.08,0.12], "rho": 0.3}` |
| `POST /optimize/hrp` | `{"covariance": [[0.04,0.02,0.01],[0.02,0.09,0.015],[0.01,0.015,0.06]]}` |
| `POST /optimize/kelly/single` | `{"p": 0.55, "q": 0.45}` or `{"p": 0.6, "q": 0.4, "a": 1, "b": 2}` |
| `POST /optimize/kelly` | `{"returns": [[0.01,-0.005],[0.02,0.01],[0.015,0.02],[0.005,-0.01]], "fractional": 0.5}` |

**BLM view matrix (P, Q):**
- `P`: K×N pick matrix. Row `[0,1,-1]` = "asset 1 minus asset 2"
- `Q`: K×1 view returns. `[0.02]` = "outperform by 2%"

**Risk Parity rho:**
- `rho=0`: pure ERC (Equal Risk Contribution)
- `rho>0`: Relaxed RRP, tilt toward higher returns

---

## 6. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000/transact` for the full UI.

---

## 7. Phase 3 endpoints

| Endpoint | Body |
|----------|------|
| `POST /factors/estimate` | `{"returns": [[0.01,-0.005],[0.02,0.01],[0.015,0.02]], "factors": [[0.02],[-0.01],[0.015]]}` |
| `POST /factors/fama-macbeth` | Same as above |
| `POST /portfolio/coskewness` | `{"returns": [[0.01,-0.01],[0.02,0.005],[0.015,0.01]], "weights": [0.33,0.33,0.34]}` |
| `POST /heston/calibrate` | `{"s": 100, "r": 0.05, "strikes": [95,100,105], "expiries": [0.25,0.25,0.25], "market_prices": [10,5,2]}` |
| `POST /vol/implied-surface` | Same as heston (returns IV per option) |
| `POST /factors/smart-beta` | `{"factor_scores": [0.8,-0.3,0.5,0.2], "returns": [[0.01],[0.02],[-0.01]], "method": "quintile"}` |
| `POST /factors/crowding` | `{"factor_loadings": [[0.9,0.1],[0.8,0.2],[0.7,0.3]]}` |

---

## 8. Phase 4 endpoints (Scenarios & Behavioral, Blotter Attribution)

| Endpoint | Body |
|----------|------|
| `POST /scenarios/define` | `{"name": "RateHike", "return_shocks": [-0.01,-0.005,0], "corr_shift": 0.2}` |
| `POST /scenarios/run` | `{"returns": [[0.01,-0.005],[0.02,0.01]], "weights": [0.5,0.5], "historical": "GFC_2008"}` |
| `POST /scenarios/probabilistic` | `{"scenario_returns": [[0.08,0.12],[0.02,0.03],[-0.05,-0.02]], "scenario_probs": [0.5,0.3,0.2], "target_return": 0.06}` |
| `POST /scenarios/monte-carlo` | `{"returns": [[0.01,-0.005],[0.02,0.01],[0.015,0.02]], "weights": [0.33,0.33,0.34], "portfolio_value": 1000000, "n_paths": 50000}` |
| `POST /scenarios/behavioral` | `{"returns": [[0.01,-0.005],[0.02,0.01]], "weights": [0.5,0.5], "mode": "prospect"}` or `"mode": "herding", "correlation_shift": 0.3` |
| `POST /blotter/attribution` | `{"portfolio_returns": [0.01,0.02,-0.01], "market_returns": [0.015,0.012,-0.005]}` |
| `POST /blotter/pnl` | `{"current_prices": {"AAPL": 155}}` or `{"price_history": [{"date":"2024-01-01","prices":{"AAPL":150}}]}` |
