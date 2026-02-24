# Transact Application Specification
## Augmenting the Derivatives Pricing Engine with WQU Portfolio Management M1–M7

**Version:** 1.2
**Date:** 2026-02-25
**Stack:** Rust Core · FastAPI · React + TypeScript + Tailwind CSS
**Data Layer:** OpenBB Platform (market data · fundamentals · macro) · Nautilus Trader (execution · backtesting) · Deriv API (synthetic derivatives only)
**Knowledge Base:** WQU Portfolio Management Modules 1–7 + Existing DPE

---

## 1. Application Overview

The **Transact Application** extends the production-ready Derivatives Pricing Engine (DPE) into a full-stack institutional portfolio management and trading platform. It fuses the DPE's high-performance pricing core (Black-Scholes, FFT, Heston, Greeks) with the complete M1–M7 portfolio management curriculum: VaR/CVaR, mean-variance optimization, Black-Litterman, Kelly Criterion, Risk Parity, Factor Models, Smart Beta, and Hierarchical Risk Parity.

### Navigation Structure

```
┌─────────────────────────────────────┐
│  TRANSACT                           │
├─────────────────────────────────────┤
│  Overview          (summary dash)   │
├─────────────────────────────────────┤
│  1. Pricer                          │
│  2. Portfolio                       │
│  3. Risk                            │
│  4. Optimizer                       │
│  5. Volatility Lab                  │
│  6. Factor Lab                      │
│  7. Scenarios                       │
│  8. Blotter                         │
├─────────────────────────────────────┤
│  Settings                           │
└─────────────────────────────────────┘
```

---

## 2. Knowledge Source Map (M1–M7 → Menu Items)

| Module | Topic | Primary Menu |
|--------|-------|-------------|
| M1 L1 | Sample moments, Beta, Sharpe/Treynor/Sortino/M²/IR | Portfolio |
| M1 L2 | VaR (parametric, non-parametric, Monte Carlo), CVaR | Risk |
| M1 L4 | MVO mathematics, GMV, tangency portfolio, QP | Optimizer |
| M2 L2 | Coskewness (M₃), Cokurtosis (M₄), Kronecker products | Portfolio, Risk |
| M2 L4 | Factor models (macro/fundamental/latent), covariance structure | Factor Lab |
| M3 L1 | Black-Litterman model, reverse optimization, Bayesian views | Optimizer |
| M3 L2 | Critical Line Algorithm, corner portfolios | Optimizer |
| M3 L4 | Probabilistic Scenario Optimization | Scenarios |
| M4 | Behavioral Finance, Prospect Theory, herding biases | Scenarios |
| M5 L1 | Kelly Criterion, optimal growth, G(f) = p·ln(1+f) + q·ln(1-f) | Optimizer |
| M5 L3 | Risk Parity (ERC), Relaxed Risk Parity (SOCP, Gambeta-Kwon) | Optimizer |
| M6 L1 | Factor anomalies, Fama-MacBeth, risk premia estimation | Factor Lab |
| M6 L2 | Smart Beta, herding risk, 2007 Quant Meltdown context | Factor Lab |
| M7 L4 | HRP: clustering → quasi-diagonalization → recursive bisection | Optimizer |
| M7 L1-3 | Correlation distance, MST, covariance shrinkage (LW, OAS) | Risk, Optimizer |
| DPE | BS/FFT/Heston pricing, Greeks, vol surface, Deriv API | Pricer, Vol Lab |

---

## 3. Menu Item Specifications

---

### Menu 1: Pricer
**Source:** Existing DPE (BS, FFT, Heston) · M1 (Beta, CAPM) · M2 (Factor decomposition)

#### Purpose
Real-time multi-model derivatives pricing workspace. Price calls/puts using three models simultaneously, view Greeks, compare theoretical vs market price, and visualize option chains.

#### Key Features

**3.1.1 Multi-Model Pricing Panel**
- Inputs: Spot price S, Strike K, Time-to-expiry τ, Risk-free rate r_f, Volatility σ (or calibrated Heston params)
- Models side-by-side:
  - Black-Scholes: closed-form `POST /price/{call|put}/bs`
  - Enhanced FFT (Carr-Madan): auto-optimized α, n, Δv `POST /price/{call|put}/fft-optimized`
  - Heston: adaptive Simpson integration, Feller condition check `POST /price/{call|put}/heston`
- Model agreement indicator: flag when |FFT - BS| > 1% or |Heston - BS| > threshold
- Live pull from Deriv API for spot price (L1 cache 30s)

**3.1.2 Greeks Dashboard**
- Display: Δ (Delta), Γ (Gamma), ν (Vega), Θ (Theta), ρ (Rho)
- Method toggle: Analytical (BS closed-form) vs Numerical (finite difference)
- Per-model Greeks: show Greeks for each of the 3 models
- Greeks heatmap: vary S and K, show Δ surface, Γ surface
- `POST /greeks/{call|put}` with `model: "bs" | "fft" | "heston"`

**3.1.3 Option Chain View**
- Table: Strike × Expiry grid with bid/ask (from Deriv API), theoretical price, IV
- Color-coding: ITM (green), ATM (yellow), OTM (red)
- Export to CSV/JSON

**3.1.4 CAPM Integration (M1)**
- Link derivative position to underlying asset beta
- Show: Delta-adjusted beta exposure = Δ × β_underlying
- Beta-neutral hedge suggestion using futures (replicates M1 §2.1 example)

#### New Backend Endpoints Needed
```
POST /price/chain          — batch pricing for full option chain
GET  /price/model-compare  — side-by-side model comparison for given params
```

#### Frontend Components
- `PricingWorkspace.tsx` (extend existing)
- `GreeksDashboard.tsx`
- `OptionChainTable.tsx`
- `ModelComparisonPanel.tsx`

---

### Menu 2: Portfolio
**Source:** M1 L1 (sample moments, beta, performance ratios) · M2 L2 (coskewness/cokurtosis)

#### Purpose
Define, build, and analyze a multi-asset portfolio. Compute all sample moments, performance appraisal metrics, and higher-order statistics (skewness, kurtosis, coskewness).

#### Key Features

**3.2.1 Asset Universe & Weight Builder**
- Asset selector: stocks, indices, currencies, commodities (via Deriv API multi-asset support)
- Weight input: manual or drag-to-rebalance
- Constraint display: weights sum to 1, optional short-selling toggle (w_i < 0 allowed/blocked)
- Load from Optimizer results (two-way sync with Menu 4)

**3.2.2 Sample Moments Engine**
All computed via the M1 vector/matrix formulas:
- Portfolio return: R_p = w^T r
- Portfolio variance: σ²_p = w^T Σ w
- Portfolio beta: β_p = w^T β (M1 §2, linear combination of asset betas)
- Total risk decomposition (M1 §3): σ²_p = β²_p · σ²_m + σ²_u
  - Systematic risk: β²_p · σ²_m
  - Non-systematic risk: σ²_u = σ²_p(1 - corr²(r_p, r_m))
- Skewness: γ̂ = [N/((N-1)(N-2))] · Σ(r_i - r̄)³/s³ (M1 Part II §5)
- Kurtosis: κ̂ (excess over normal = 3)

**3.2.3 Performance Appraisal Panel**
All metrics from M1 Part II §4–7:
- **Sharpe Ratio:** SR = (r̄_p - r̄_f) / σ_p
- **Treynor Ratio:** TR = (r̄_p - r̄_f) / β_p
- **Sortino Ratio:** SoR_p = (r̄_p - r_MAR) / σ_downside
- **M² (Modigliani):** M²_p = r_f + SR · σ_benchmark
- **M²-Sortino:** M²_{p,Sortino} = r_p + SoR(σ_{D,bench} - σ_D)
- **Information Ratio:** IR_p = (r̄_p - r̄_b) / σ(r_p - r_b)
- **Appraisal Ratio:** AR_p = α / σ_u where α = r_p - (r_RF + β_p(r_m - r_RF))
- Benchmark selector: S&P 500 (default), custom index

**3.2.4 Higher-Order Statistics (M2)**
- **Coskewness matrix M₃:** N×N² matrix, γ_{XYZ} = E[(X-μ_X)(Y-μ_Y)(Z-μ_Z)]/(σ_X σ_Y σ_Z)
- **Portfolio skewness via Kronecker:** skewness_p = w^T M₃ (w⊗w) using `numpy.kron`
- **Cokurtosis matrix M₄:** N×N³ matrix
- **Portfolio kurtosis:** κ_p = w^T M₄ (w⊗w⊗w)
- Positive vs negative coskewness interpretation displayed
- Warning flag when excess kurtosis > 1 (heavy tails, VaR underestimation risk)

**3.2.5 Return Attribution**
- Factor-based attribution (links to Menu 6): R_pt = w^T α + β_p^T f_t + w^T ε_t
- Portfolio beta to each factor f_k: β_{p,k} = w^T B_k (M2 §5)

#### New Backend Endpoints Needed
```
POST /portfolio/moments          — compute all sample moments
POST /portfolio/performance      — compute all appraisal ratios
POST /portfolio/coskewness       — compute M₃ and portfolio skewness
POST /portfolio/attribution      — factor-based attribution
```

#### Frontend Components
- `PortfolioBuilder.tsx`
- `MomentsPanel.tsx`
- `PerformanceAppraisalCard.tsx`
- `CoskewnessHeatmap.tsx`

---

### Menu 3: Risk
**Source:** M1 L2 (VaR, CVaR, Monte Carlo) · M2 L2 (higher moments in VaR) · M7 L1–3 (correlation distance, shrinkage)

#### Purpose
Comprehensive risk analytics for the portfolio: VaR/CVaR under multiple methodologies, Greeks-based risk aggregation, and covariance matrix health monitoring.

#### Key Features

**3.3.1 VaR Calculator**
From M1 L2, implement all three methodologies with confidence level (1-α) and horizon T inputs:

- **Non-Parametric / Historical:**
  - VaR̂_{np}(1-α) = M · q̂(α) where q̂(α) is the α-th sample quantile of losses
  - ES_{np}(1-α) = M · [Σ l_i · I(l_i > q̂(α))] / Σ I(l_i > q̂(α))

- **Parametric — Normal:**
  - VaR̂_p(1-α) = M · (μ̂ + σ̂ · q(α)) where q(α) is normal quantile
  - ES_p(1-α) = M · (μ̂ - σ̂ · φ(Φ⁻¹(α))/α)

- **Parametric — t-Distribution:**
  - Fit ν, μ, σ via MLE using `scipy.stats.t.fit`
  - VaR̂_p(1-α) = M · (μ̂ + σ̂ · F_ν⁻¹(α))
  - ES_p(1-α) = M · (μ̂ - σ̂ · f_ν(F_ν⁻¹(α))/α · [ν + (F_ν⁻¹(α))²]/(ν-1))

- **Monte Carlo:**
  - n = 1,000,000 simulations from fitted parametric distribution
  - sim_VaR = np.percentile(sim_returns, α×100)
  - Supports multivariate normal: r_{T+1} ~ N(μ, Σ) for multi-asset portfolios

- **Conditional VaR:**
  - Toggle: unconditional vs conditional (GARCH-based time-varying parameters)

- **1-day to n-day scaling:**
  - VaR(T days) = VaR(1 day) × √T (square root of time rule)
  - Warning: scaling assumes i.i.d. returns; display caveat when autocorrelation detected

- **Portfolio VaR sub-additivity:**
  - Show: VaR_p ≤ Σ VaR_i (diversification benefit = Σ VaR_i - VaR_p)

**3.3.2 Greeks Risk Aggregation**
- Aggregate Delta/Gamma/Vega across all derivative positions in Blotter
- Delta-VaR: linear approximation using ΔW ≈ β(ΔS) (from M1 L2 §8 linear portfolio)
- Full re-valuation VaR for non-linear portfolios: ΔW ≈ (∂W/∂t)Δt + β(ΔS) + ½Γ(ΔS)²

**3.3.3 Covariance Matrix Health (M7)**
- Condition number of Σ: flag ill-conditioned matrices (cond > 1000)
- Shrinkage intensity comparison: Ledoit-Wolf α_LW vs OAS shrinkage
- Correlation distance matrix: d(ρ_ij) = √(2(1-ρ_ij))
- Minimum Spanning Tree (MST) visualization of asset correlations
- Heat map: raw Σ vs shrunk Σ side-by-side

**3.3.4 Risk Dashboard Summary**
- Confidence level selector: 90%, 95%, 99%, 99.9% (Basel III)
- Side-by-side VaR table across methods
- ES table alongside VaR
- 1-day, 10-day, 1-month horizons

#### New Backend Endpoints Needed
```
POST /risk/var                   — all VaR methods
POST /risk/es                    — expected shortfall
POST /risk/greeks-aggregate      — portfolio-level Greeks
POST /risk/covariance-health     — shrinkage, condition number
POST /risk/mst                   — minimum spanning tree data
```

---

### Menu 4: Optimizer
**Source:** M1 L4 (MVO, QP) · M3 L1 (BLM) · M3 L2 (CLA) · M5 L1 (Kelly) · M5 L3 (Risk Parity, SOCP) · M7 L4 (HRP)

#### Purpose
Multi-strategy portfolio optimization engine. Select from six optimization paradigms, set constraints, visualize the efficient frontier, and export optimal weights.

#### Key Features

**3.4.1 Mean-Variance Optimization (Markowitz, M1 L4)**

Solves the quadratic program:
```
min_w  ½ w^T Σ w
s.t.   w^T r = E[r_p]   (target return)
       w^T ι = 1         (weights sum to 1)
       w_i ≥ 0           (optional: no short selling)
       w_i ≤ w_max       (optional: max individual weight)
```

- **Efficient Frontier:** parameterize over E[r_p], solve QP at each point using CVXPY
- **GMV Portfolio:** w_GMV = Σ⁻¹ι / (ι^T Σ⁻¹ι), E[r_GMV] = B/A
- **Tangency Portfolio:** w_TANG = Σ⁻¹(r - r_f ι) / (B - r_f A) = v / (v^T ι)
  - where v = Σ⁻¹(r - r_f ι) / (r̃^T Σ⁻¹r̃) and r̃ = r - r_f ι
- **Two-fund separation:** any frontier portfolio = combination of GMV + tangency
- **Capital Allocation Line (CAL):** slope = Sharpe ratio of tangency portfolio
- Interactive frontier chart: click any point to see weights, return, volatility

**3.4.2 Black-Litterman Model (M3 L1)**

Step-by-step BLM implementation:
1. **Reverse Optimization:** π = d·Σ·w_m
   - d = Sharpe_market / σ_m (risk-aversion coefficient)
   - w_m from market cap weights (pull from Deriv API or manual input)
2. **Specify Views:** matrix P (K×N pick matrix), Q (K×1 return forecasts), Ω (view uncertainty)
   - View editor: "Asset i will outperform Asset j by X% with confidence Y%"
3. **BLM Posterior:**
   - μ_BL = [(τΣ)⁻¹ + P^T Ω⁻¹ P]⁻¹ [(τΣ)⁻¹π + P^T Ω⁻¹Q]
   - τ parameter: uncertainty in prior (default τ = 0.05)
4. **Run MVO** on μ_BL to get optimal weights
5. **Sensitivity analysis:** slide τ and view weight stability (addresses M3 §3 abuses)
6. Display: implied vs BLM expected returns comparison chart

**3.4.3 Critical Line Algorithm (M3 L2)**

- Exact computation of full efficient frontier including corner portfolios
- Corner portfolio table: list all kinks in the frontier with weights and λ values
- Useful when inequality constraints are binding (weight bounds ≠ 0 or 1)
- Toggle: CLA vs QP solver for same problem (verify agreement)

**3.4.4 Kelly Criterion (M5 L1)**

Single-asset Kelly:
- G(f) = p·ln(1+f) + q·ln(1-f) → f* = p - q
- Asymmetric payoffs: f* = p/a - q/b (pays b per unit bet, loses a)
- G(f) curve plot: show f*, f° (ruin threshold), and selected leverage

Multi-asset Kelly (continuous version):
- Maximize E[ln(1 + w^T r)] over portfolio weights w
- Equivalent to maximizing expected log return
- Solved numerically (CVXPY with log objective)
- Fractional Kelly: scale by fraction κ ∈ (0,1] to reduce volatility/drawdown
- Warning: Kelly is aggressive — display max drawdown estimate alongside

**3.4.5 Risk Parity / Equal Risk Contribution (M5 L3)**

Equal Risk Contribution (ERC) condition:
- RC_i = w_i · (Σw)_i / σ_p = 1/N · σ_p for all i
- Solve: minimize Σ_i Σ_j (RC_i - RC_j)² subject to w^T ι = 1, w ≥ 0
- Uses CVXPY with iterative SCA or Newton's method

Relaxed Risk Parity (RRP, Gambeta-Kwon via SOCP):
- Reformulates non-convex ERC into second-order cone constraints
- ρ parameter: controls deviation from strict ERC toward higher returns
- Show: ERC → RRP → MVO spectrum as ρ varies

**3.4.6 Hierarchical Risk Parity (M7 L4)**

Three-step HRP algorithm (Lopez de Prado):

*Step 1 — Hierarchical Clustering:*
- Correlation distance: d(ρ_ij) = √(2(1-ρ_ij))
- Agglomerative clustering (single linkage) of distance matrix
- Optimal Number of Clusters (ONC): silhouette score maximization
- Output: dendrogram visualization

*Step 2 — Quasi-diagonalization:*
```python
def getQuasiDiag(link):
    # sort clustered items by distance
    # rearrange Σ so correlated assets are adjacent
```
- Display: Σ heatmap before vs after quasi-diagonalization

*Step 3 — Recursive Bisection:*
```python
def getRecBipart(cov, sortIx):
    alpha = 1 - cVar0 / (cVar0 + cVar1)  # weight cluster 0
    w[cItems0] *= alpha
    w[cItems1] *= (1 - alpha)
```
- Weights proportional to inverse cluster variance
- No Σ inversion required → numerically stable, avoids estimation error

HRP Variants (Nanakorn, Jain extensions):
- Ledoit-Wolf shrunk Σ as input to HRP
- Equal-weight HRP vs inverse-variance HRP

**3.4.7 Optimizer Comparison Dashboard**
- Run all 6 strategies simultaneously on same asset set
- Side-by-side: weights, expected return, σ_p, Sharpe ratio, max weight concentration
- Radar chart: risk/return/concentration trade-off across strategies
- Export weights to Portfolio (Menu 2) or Blotter (Menu 8)

#### New Backend Endpoints Needed
```
POST /optimize/mvo               — mean-variance, returns frontier
POST /optimize/blm               — Black-Litterman full pipeline
POST /optimize/cla               — critical line algorithm
POST /optimize/kelly             — single + multi-asset Kelly
POST /optimize/risk-parity       — ERC + RRP(ρ)
POST /optimize/hrp               — HRP: clustering + quasi-diag + bisection
POST /optimize/compare           — run all strategies, return comparison
```

---

### Menu 5: Volatility Lab
**Source:** DPE (Heston calibration, vol surface) · M1 (implied vol, CAPM σ) · M2 (factor vol decomposition)

#### Purpose
Advanced volatility analysis workspace. Visualize implied volatility surfaces, analyze smile/skew, calibrate Heston parameters to market data, and compare historical vs implied vol.

#### Key Features

**3.5.1 Implied Volatility Surface**
- 3D interactive surface: x=Strike (K/S ratio), y=Expiry (τ), z=IV
- Extract IV via Newton-Raphson inversion of BS formula: C_BS(σ) = C_market
- Volatility smile: plot IV vs moneyness for fixed τ
- Term structure: plot ATM IV vs τ
- Stochastic vol indicator: smile curvature → model misspecification flag

**3.5.2 Heston Model Calibration**
Heston parameters: (v₀, κ, θ, ξ, ρ_SV) where:
- v₀ = initial variance, κ = mean reversion speed
- θ = long-run variance, ξ = vol of vol, ρ_SV = spot-vol correlation
- Feller condition check: 2κθ > ξ² (ensures positive variance)
- Calibration objective: min Σ_i (C_Heston(K_i,τ_i;params) - C_market,i)²
- Optimizer: L-BFGS-B or Levenberg-Marquardt via `scipy.optimize`
- Show calibration fit quality: RMSE, max error per maturity bucket
- `POST /heston/calibrate` (new endpoint)

**3.5.3 Historical vs Implied Vol**
- Realized vol (30d, 60d rolling): σ_realized = √(252/n · Σ r²_i)
- IV term premium: IV - realized vol (persistence analysis)
- Vol regime indicator: high/low/normal regime based on VIX proxy

**3.5.4 Factor-Based Vol Decomposition (M2 L4)**
- Factor vol: var(R_pt) = β_p^T Σ_f β_p + w^T Σ_ε w
  - Systematic vol: β_p^T Σ_f β_p
  - Idiosyncratic vol: w^T Σ_ε w
- Display: pie chart of vol sources (market, factors, idiosyncratic)

#### New Backend Endpoints Needed
```
POST /vol/implied-surface        — compute IV grid
POST /vol/smile                  — IV smile for fixed maturity
POST /heston/calibrate           — calibrate Heston to market vols
POST /vol/historical             — realized vol time series
POST /vol/factor-decompose       — factor vol attribution
```

---

### Menu 6: Factor Lab
**Source:** M2 L4 (factor model setup) · M6 L1 (factor anomalies, Fama-MacBeth) · M6 L2 (smart beta, herding)

#### Purpose
Build, estimate, and analyze multi-factor models. Run Fama-MacBeth regressions for risk premia, construct smart beta portfolios, detect factor crowding risk, and use ML for latent factor discovery.

#### Key Features

**3.6.1 Factor Model Builder (M2 L4)**

General factor model: R_it = α_i + β_i^T f_t + ε_it

Three factor types:
- **Macroeconomic:** observable time series (inflation, GDP growth, market excess return R_Mt)
- **Fundamental:** P/B ratio, EPS growth, momentum (12-1 month return), size (log market cap), quality
- **Statistical/Latent:** PCA on return matrix R → latent factors f_t = principal components

Estimation:
- **Time series OLS** (homoskedastic): R_i = 1_T α_i + Fβ_i + ε_i, get β̂_i, α̂_i, σ̂²_i
- **Cross-section GLS/WLS** (heteroskedastic): R_t = α + Bf_t + ε_t
- Covariance from factor model: Ω̂ = BΣ̂_f B^T + Σ̂_ε

Coskewness via factor decomposition (M2 L4 §4):
- M₃ = BM₃,f(B^T ⊗ B^T) + Ω (residual coskewness)
- Reduces estimation burden from N×N² to K×K² elements

**3.6.2 Fama-MacBeth Regression (M6 L1)**

Two-stage estimation of factor risk premia λ_k:

*Stage 1 — Time Series (per asset):*
R_it = α_i + β_i^T f_t + ε_it → get β̂_i for i=1,...,N

*Stage 2 — Cross-Section (per period):*
R_t = λ_0 + β̂^T λ + η_t → get λ̂_t for each t

*Inference:*
- λ̂ = (1/T) Σ_t λ̂_t (time-average premia)
- SE(λ̂_k) = std(λ̂_{k,t}) / √T (Fama-MacBeth standard errors)
- t-stat: t_k = λ̂_k / SE(λ̂_k)
- Display: factor premia table with t-stats, p-values, significance stars

**3.6.3 Smart Beta Construction (M6 L2)**
- Factor tilt strategy builder: overweight high-factor-score assets
- Available factors: Value (P/B), Momentum (12-1m return), Quality (ROE, low debt), Low-Vol, Size
- Portfolio construction methods:
  - Simple sort (quintile portfolios, long top − short bottom)
  - Signal-weighted: w_i ∝ factor score_i / Σ factor score_j
  - Factor-tilted MVO: add factor exposure constraint β_{p,k} ≥ β_target
- Backtest mode: historical performance of factor portfolio vs cap-weight benchmark

**3.6.4 Herding Risk Monitor (M6 L2)**
- Factor crowding detector: measure cross-portfolio correlation of factor loadings
- Inspired by Khandani-Lo (2007 Quant Meltdown) and Krkoska-Schenk-Hoppé
- Crowding index: avg pairwise correlation of Smart Beta factor exposures across strategies
- Liquidity-adjusted risk: flag assets with high factor loading AND low liquidity (bid-ask spread proxy)
- Warning thresholds: mild / elevated / extreme crowding levels

**3.6.5 ML Factor Discovery**
- PCA latent factors: choose K principal components explaining 80%+ variance
- Scree plot: eigenvalue decay, cumulative explained variance
- Factor rotation (Varimax) for interpretability
- Neural network factor (link to M6 paper: Neural Network Based Automatic Factor Construction)
- Feature importance: which firm characteristics load most on each latent factor

#### New Backend Endpoints Needed
```
POST /factors/estimate           — OLS/GLS factor model estimation
POST /factors/fama-macbeth       — two-stage FM regression
POST /factors/smart-beta         — smart beta portfolio construction
POST /factors/crowding           — herding/crowding risk index
POST /factors/pca                — PCA latent factor extraction
```

---

### Menu 7: Scenarios
**Source:** M1 L2 (Monte Carlo VaR) · M3 L4 (Probabilistic Scenario Optimization) · M4 (Behavioral Finance, Prospect Theory)

#### Purpose
Stress test the portfolio under custom, historical, and behavioral scenarios. Run probabilistic scenario optimization. Quantify the impact of non-normal distributions and behavioral biases.

#### Key Features

**3.7.1 Scenario Definition Engine**
- **Custom Scenario:** user-defined shocks
  - Returns vector shift: r_i → r_i + Δr_i for each asset
  - Volatility shock: σ_i → σ_i × (1 + Δσ_i)
  - Correlation shock: ρ_ij → ρ_ij + Δρ_ij (stress correlation matrix)
  - Multiple scenarios saved and named (e.g., "2008 Crisis", "Rate Hike 200bps")
- **Historical Scenarios:** replay actual crisis periods
  - 2008 GFC: S&P -37%, correlations spike to ρ ≈ 0.95
  - 2007 Quant Meltdown: factor crowding unwind (M6 L2 context)
  - COVID-2020: VIX spike to 80, cross-asset correlation breakdown
- **Parametric Stress:** shift parameters of fitted distribution

**3.7.2 Probabilistic Scenario Optimization (M3 L4)**
- Assign probabilities to K scenarios: p₁, ..., p_K with Σ p_k = 1
- Expected return under scenarios: E[r] = Σ_k p_k · r_k
- Covariance under scenarios: Σ = Σ_k p_k · (r_k - E[r])(r_k - E[r])^T
- Optimize: min w^T Σ w s.t. w^T E[r] ≥ target, Σ w_i = 1
- Ambiguity aversion: robust optimization (min over worst-case scenario subset)

**3.7.3 Behavioral Scenarios (M4)**
- **Prospect Theory loss aversion:**
  - Simulate investor response using Kahneman-Tversky value function
  - v(x) = x^α for gains (α ≈ 0.88), v(x) = -λ(-x)^β for losses (λ ≈ 2.25, β ≈ 0.88)
  - Show: perceived utility of current portfolio vs prospect-theory-optimal portfolio
- **Herding scenario:** simulate coordinated factor unwind
  - Increase cross-asset correlations by Δρ (crowding effect from M6)
  - Show VaR impact as correlations rise toward 1
- **Bubble/Crash simulation:**
  - Positive feedback loop: return at t drives momentum buying
  - Simulate price trajectory, show crash probability

**3.7.4 Monte Carlo Portfolio Simulation**
- 1M paths using multivariate normal or t-distribution for returns
- Full portfolio P&L distribution over horizon T
- Display: histogram of terminal wealth, VaR and CVaR at various α
- Option: include Heston stochastic vol for derivatives positions (links to Vol Lab)

**3.7.5 Covariance Stress Testing (M7)**
- Perturbation of Σ: Σ_stressed = (1-s)·Σ + s·I (shrink toward identity)
- Ledoit-Wolf vs OAS shrinkage: compare portfolio variance under each
- Portfolio sensitivity to Σ: ∂σ²_p/∂Σ = w^T (partial derivative analysis)

#### New Backend Endpoints Needed
```
POST /scenarios/define           — save custom scenario
POST /scenarios/run              — apply scenario to portfolio, return metrics
POST /scenarios/probabilistic    — probabilistic scenario optimization
POST /scenarios/monte-carlo      — full MC simulation
POST /scenarios/behavioral       — prospect theory / herding simulation
```

---

### Menu 8: Blotter
**Source:** DPE (trade execution context) · M1 (performance attribution) · M2 (factor attribution)

#### Purpose
Transaction ledger, P&L tracking, and performance attribution. Record trades, track realized and unrealized P&L, and decompose returns into alpha, beta, and factor contributions.

#### Key Features

**3.8.1 Trade Entry**
- Fields: Asset, Direction (Long/Short), Quantity, Entry Price, Entry Date, Model Used (BS/FFT/Heston), Theoretical Price at Entry
- Auto-fill theoretical price from Pricer (Menu 1)
- Trade tags: asset class, factor tag, strategy (e.g., "Momentum", "HRP", "Delta Hedge")

**3.8.2 Position Monitor**
- Live P&L: (Current Price - Entry Price) × Quantity × Direction
- Mark-to-model: update theoretical price using current params from Deriv API
- Price divergence alert: |Market Price - Theoretical Price| > threshold
- Greeks-adjusted P&L: Δ·ΔS + ½Γ·(ΔS)² + ν·Δσ + Θ·Δt (second-order approximation)

**3.8.3 Performance Attribution**
Based on M1 §4 (Sharpe, Treynor) and M2 (factor decomposition):
- Total return decomposition: r_p = α + β_p · r_m + Σ_k λ_k · β_{p,k} + ε_p
  - α (skill/alpha): CAPM alpha = r_p - r_f - β_p(r_m - r_f)
  - Systematic return: β_p · r_m
  - Factor returns: Σ_k β_{p,k} · f_k (from factor model)
  - Residual (idiosyncratic): ε_p
- Attribution chart: stacked bar by component per period
- Benchmark comparison: excess return = r_p - r_benchmark (tracking error, IR)

**3.8.4 Transaction History**
- Sortable table: date, asset, direction, quantity, price, P&L, Greeks at entry
- Filter: by asset class, strategy tag, date range, profit/loss
- Running cumulative P&L chart
- Drawdown analysis: max drawdown, drawdown duration

**3.8.5 Export**
- Export trades to CSV / JSON (extends existing DPE export utility)
- Report generation: portfolio snapshot with all metrics, attributions, and positions

#### New Backend Endpoints Needed
```
POST /blotter/trade              — add new trade
GET  /blotter/positions          — all open positions with live P&L
GET  /blotter/history            — full transaction history
POST /blotter/attribution        — performance attribution for date range
GET  /blotter/pnl                — cumulative P&L time series
```

---

## 4. Architecture Extensions

### 4.1 Extended Five-Tier Architecture

```
Frontend (React/TS/Tailwind)
        │ HTTP / WebSocket
        ▼
FastAPI (Python API Layer)
        │ PyO3          │ openbb.*              │ nautilus_trader.*     │ Deriv API (WS)
        ▼               ▼                       ▼                       ▼
Rust Core Engine   OpenBB Platform        Nautilus Trader         Deriv Market Data
(BS/FFT/Heston/    (unified data API:     (Rust core, PyO3:       (synthetic derivatives:
 Greeks/HRP/VaR)    ~100 providers)        execution + backtest)    binary/barrier/vol-idx)
                        │                       │
          ┌─────────────┼──────────┐      ┌─────┴──────────────┐
          ▼             ▼          ▼      ▼                    ▼
    YFinance /    Polygon.io   FRED   IBKR Gateway       DataCatalog
    FMP / Tiingo  (options RT) (macro  (live + paper      (Parquet,
    (equity hist)  chains)     / FF5)   trading)           compressed)
```

**Three-Layer Data Strategy:**

| Layer | Tool | Role | Cost |
|-------|------|------|------|
| **Market Data** | OpenBB Platform | Prices, fundamentals, options chains, macro, alternatives | Free (yfinance/FRED) to paid (FMP/Polygon) |
| **Execution & Backtest** | Nautilus Trader | Live/paper trading, event-driven backtesting, DataCatalog | Free (open source) + IBKR account |
| **Synthetic Derivatives** | Deriv API | Binary/barrier options, synthetic vol indices — unique instruments | Free |

**Data Source Decision Matrix (v1.2):**

| Data Need | OpenBB Source | Nautilus Source | Deriv API |
|-----------|---------------|-----------------|-----------|
| US equities (price history) | `obb.equity.price.historical()` — 9 providers | DataCatalog (Parquet) | — |
| Fundamentals (P/B, EPS, ROE) | `obb.equity.fundamental.*` (FMP, Tiingo) | — | — |
| Options chains (all strikes/expiries) | `obb.derivatives.options.chains()` (Polygon, Tradier) | IBKR adapter | Deriv (retail) |
| Futures (CME, CBOT, NYMEX) | `obb.derivatives.futures.*` | IBKR adapter | — |
| Forex | `obb.currency.price.historical()` | IBKR adapter | Deriv |
| Crypto | `obb.crypto.price.historical()` | Binance/Bybit adapter | Deriv |
| Real-time streaming | `obb` + provider WebSocket | Nautilus DataClient | Deriv WebSocket |
| Order execution | — | `TradingNode` + IBKR/Alpaca exec | — |
| Fama-French factors | `obb.economy.fred_series()` (free, FRED) | — | — |
| Macro (CPI, GDP, rates) | `obb.economy.*` (FRED, free) | — | — |
| Alt data (ESG, analyst estimates) | `obb.equity.estimates.*` (FMP) | — | — |
| Binary/barrier options | — | — | **Deriv only** |
| Synthetic vol indices (V75, V50) | — | — | **Deriv only** |
| Paper trading / backtesting | — | BacktestEngine + paper IBKR | — |

**Why Deriv is NOT Redundant:**
Deriv fills a unique niche that neither OpenBB nor Nautilus can replicate:
- **Synthetic volatility indices** (V75, V50, V25 — volatility ranging 75%/50%/25%) — proprietary Deriv instruments, 24/7 trading
- **Retail binary/barrier options** — not available on IBKR or any institutional broker
- **Digit options, lookback options** — Deriv-exclusive exotic structures
- **Zero broker account requirements** — accessible for strategy testing without IBKR account setup
- The existing DPE (BS/FFT/Heston) was built against Deriv — this layer preserves full backward compatibility

### 4.2 New Python Modules (app/)

```
app/
├── main.py                         (extend: add all new routes)
├── portfolio_engine.py             (M1: moments, Sharpe, Treynor, Sortino)
├── higher_moments.py               (M2: coskewness M₃, cokurtosis M₄, Kronecker)
├── optimizer/
│   ├── mvo.py                      (M1 L4: QP via CVXPY)
│   ├── black_litterman.py          (M3 L1: reverse optimization + BLM)
│   ├── cla.py                      (M3 L2: Critical Line Algorithm)
│   ├── kelly.py                    (M5 L1: single + multi-asset Kelly)
│   ├── risk_parity.py              (M5 L3: ERC + RRP/SOCP)
│   └── hrp.py                      (M7 L4: clustering + quasi-diag + bisection)
├── risk/
│   ├── var_engine.py               (M1 L2: parametric/nonparam/MC VaR + ES)
│   └── covariance.py               (M7: LW shrinkage, OAS, MST, condition number)
├── factors/
│   ├── factor_model.py             (M2 L4: OLS/GLS factor estimation)
│   ├── fama_macbeth.py             (M6 L1: two-stage FM regression)
│   ├── smart_beta.py               (M6 L2: factor tilt strategies)
│   └── crowding.py                 (M6 L2: herding/crowding index)
├── scenarios/
│   ├── scenario_engine.py          (M3 L4: probabilistic scenario optimization)
│   ├── monte_carlo.py              (M1 L2: multivariate MC simulation)
│   └── behavioral.py               (M4: prospect theory, herding simulation)
├── blotter/
│   ├── trade_store.py              (trade CRUD, SQLite or in-memory)
│   └── attribution.py              (M1+M2: alpha/beta/factor attribution)
└── vol/
    └── calibration.py              (Heston calibration, IV surface)
```

### 4.3 New Rust Core Modules (src/)

```
src/
├── optimizer.rs                    (QP solver via nalgebra, efficient frontier)
├── hrp.rs                          (HRP: correlation distance, bisection)
├── var_calculator.rs               (batch Monte Carlo VaR, 1M paths)
└── factor_engine.rs                (OLS regression, covariance decomposition)
```

### 4.4 New Frontend Components (frontend/src/)

```
frontend/src/components/
├── Portfolio/
│   ├── PortfolioBuilder.tsx
│   ├── MomentsPanel.tsx
│   ├── PerformanceAppraisalCard.tsx
│   └── CoskewnessHeatmap.tsx
├── Risk/
│   ├── VaRDashboard.tsx
│   ├── ESPanel.tsx
│   ├── CovarianceHealthCard.tsx
│   └── MSTGraph.tsx
├── Optimizer/
│   ├── EfficientFrontierChart.tsx
│   ├── BLMViewEditor.tsx
│   ├── KellyGrowthChart.tsx
│   ├── HRPDendrogram.tsx
│   └── OptimizerComparison.tsx
├── VolatilityLab/
│   ├── IVSurface3D.tsx
│   ├── HestonCalibrationPanel.tsx
│   └── VolDecomposition.tsx
├── FactorLab/
│   ├── FactorModelBuilder.tsx
│   ├── FamaMacBethTable.tsx
│   ├── SmartBetaConstructor.tsx
│   └── CrowdingMonitor.tsx
├── Scenarios/
│   ├── ScenarioEditor.tsx
│   ├── ProbabilisticOptimizer.tsx
│   ├── BehavioralSimulator.tsx
│   └── MCSimulationChart.tsx
└── Blotter/
    ├── TradeEntryForm.tsx
    ├── PositionTable.tsx
    ├── PnLChart.tsx
    └── AttributionWaterfall.tsx
```

---

## 5. New Python Dependencies

```
# requirements_new.txt  (add to existing requirements.txt)

# Optimization
cvxpy>=1.4.0           # QP, SOCP, Kelly, Risk Parity optimization

# Statistics & Numerical
scipy>=1.11.0          # t-distribution fit, L-BFGS-B, Simpson integration
numpy>=1.25.0          # Kronecker products, matrix operations
statsmodels>=0.14.0    # OLS, GLS, Fama-MacBeth regression

# Machine Learning & Data
scikit-learn>=1.3.0    # LW/OAS covariance shrinkage, PCA, KMeans clustering
pandas>=2.0.0          # time series data handling
networkx>=3.1          # Minimum Spanning Tree (Kruskal's algorithm)

# ── DATA LAYER: OpenBB Platform ──────────────────────────────────────────────
openbb>=4.6.0                  # unified financial data API (~100 providers)
openbb-yfinance>=1.2.0         # free equity/ETF/crypto history (default provider)
openbb-fmp>=1.2.0              # Financial Modeling Prep: fundamentals, estimates
openbb-polygon>=1.2.0          # Polygon.io: options chains, real-time equities
openbb-fred>=1.2.0             # FRED: Fama-French factors, macro series (free)
openbb-tiingo>=1.2.0           # Tiingo: affordable deep fundamentals history

# ── EXECUTION & BACKTESTING LAYER: Nautilus Trader ──────────────────────────
nautilus_trader>=1.220.0       # Rust-core trading platform (PyO3 — matches DPE)
                               #   includes: DataCatalog, BacktestEngine,
                               #   TradingNode, IBKR adapter, Binance/Bybit adapters

# ── FACTOR & PERFORMANCE ANALYTICS ─────────────────────────────────────────
alphalens-reloaded>=0.4.3      # factor IC, quantile returns, turnover (standalone)
pyfolio-reloaded>=0.9.5        # performance/risk tear sheets (standalone)
pandas_datareader>=0.10.0      # Fama-French from Ken French website (free, backup)
```

**Dependency Cost Breakdown:**

| Package | Cost | Notes |
|---------|------|-------|
| `openbb` core | Free | Installs with free providers (yfinance, FRED) |
| `openbb-yfinance` | Free | Yahoo Finance — equity price history, market cap |
| `openbb-fred` | Free | Federal Reserve — macro, Fama-French factors |
| `openbb-fmp` | Free tier available | FMP: 250 API calls/day free, fundamentals |
| `openbb-polygon` | ~$29/mo | Options chains, real-time; upgrade from free tier |
| `openbb-tiingo` | ~$10/mo | Deep fundamentals history (optional — FMP free covers most) |
| `nautilus_trader` | Free | Open source, MIT license |
| IBKR account | Free | Paper trading free; live trading standard brokerage fees |
| `alphalens-reloaded` | Free | PyPI, open source |
| `pyfolio-reloaded` | Free | PyPI, open source |
| `pandas_datareader` | Free | Ken French website, Federal Reserve |

---

## 6. API Summary — New Endpoints

| Module | Method | Path | Source |
|--------|--------|------|--------|
| Portfolio | POST | `/portfolio/moments` | M1 L1 |
| Portfolio | POST | `/portfolio/performance` | M1 L1 |
| Portfolio | POST | `/portfolio/coskewness` | M2 L2 |
| Risk | POST | `/risk/var` | M1 L2 |
| Risk | POST | `/risk/es` | M1 L2 |
| Risk | POST | `/risk/mst` | M7 |
| Optimizer | POST | `/optimize/mvo` | M1 L4 |
| Optimizer | POST | `/optimize/blm` | M3 L1 |
| Optimizer | POST | `/optimize/cla` | M3 L2 |
| Optimizer | POST | `/optimize/kelly` | M5 L1 |
| Optimizer | POST | `/optimize/risk-parity` | M5 L3 |
| Optimizer | POST | `/optimize/hrp` | M7 L4 |
| Optimizer | POST | `/optimize/compare` | All |
| Vol Lab | POST | `/vol/implied-surface` | DPE |
| Vol Lab | POST | `/heston/calibrate` | DPE |
| Factor Lab | POST | `/factors/estimate` | M2 L4 |
| Factor Lab | POST | `/factors/fama-macbeth` | M6 L1 |
| Factor Lab | POST | `/factors/smart-beta` | M6 L2 |
| Factor Lab | POST | `/factors/crowding` | M6 L2 |
| Scenarios | POST | `/scenarios/probabilistic` | M3 L4 |
| Scenarios | POST | `/scenarios/behavioral` | M4 |
| Scenarios | POST | `/scenarios/monte-carlo` | M1 L2 |
| Blotter | POST | `/blotter/trade` | DPE |
| Blotter | GET | `/blotter/positions` | DPE |
| Blotter | POST | `/blotter/attribution` | M1+M2 |

---

## 7. Performance Targets (Extending DPE Benchmarks)

| Feature | Target Response Time |
|---------|---------------------|
| MVO efficient frontier (50 assets, 100 points) | < 500ms |
| BLM full pipeline | < 300ms |
| Kelly multi-asset (50 assets) | < 200ms |
| Risk Parity ERC | < 300ms |
| HRP (clustering + bisection, 100 assets) | < 400ms |
| VaR parametric | < 50ms |
| VaR Monte Carlo (1M paths) | < 2000ms |
| Fama-MacBeth (10y monthly data, 50 assets, 5 factors) | < 1000ms |
| HRP dendrogram render | < 200ms |
| IV surface computation (10×10 grid) | < 500ms |

---

## 8. Nautilus Trader + OpenBB Platform Integration — Full Specification

This section defines how Nautilus Trader and OpenBB Platform replace QuantRocket across all 8 menus, delivering **strictly superior** capability at zero subscription cost. Where QuantRocket was falling short, each improvement is explicitly called out.

---

### 8.1 Capability Matrix vs QuantRocket

| Capability | QuantRocket (removed) | Nautilus Trader | OpenBB Platform | Improvement |
|---|---|---|---|---|
| Market data API | Proprietary (1 source per product) | DataCatalog (Parquet) | ~100 providers, switch with 1 param | **Multi-source validation** |
| Fundamentals | Sharadar only ($paid) | — | FMP, Tiingo, yfinance (free→paid) | **Provider choice, cost control** |
| Fama-French factors | WRDS (paid university license) | — | FRED (free, always available) | **Free, no institutional affiliation needed** |
| Backtesting engine | Moonshot (vectorized, unrealistic) | BacktestEngine (event-driven, ns resolution) | — | **Realistic fills, slippage, partial execution** |
| Execution | QuantRocket blotter (IBKR, Alpaca) | TradingNode (IBKR, Alpaca, Binance, Bybit, dYdX) | — | **Multi-venue, DeFi, crypto** |
| Options chains | IBKR via QR | IBKR adapter (live) | Polygon, Tradier (full chains) | **Snapshot + streaming** |
| Crypto venues | IBKR/Alpaca only | Binance, Bybit, Coinbase, dYdX | `obb.crypto.*` | **CEX + DEX** |
| Paper trading | Alpaca paper | IBKR TWS paper (port 7497) | — | **Real IBKR infrastructure** |
| Architecture fit | Docker (separate process) | PyO3/Rust (native — matches DPE) | Pure Python (pip install) | **Zero DevOps overhead** |
| Cost | Paid subscription | Free (MIT) | Free core + optional paid providers | **$0 baseline** |

---

### 8.2 What Each Tool Provides

#### OpenBB Platform — Unified Data Layer

```python
from openbb import obb

# ─── EQUITY PRICES (9 providers, switch with provider= param) ───────────────
prices = obb.equity.price.historical(
    symbol="AAPL", start_date="2015-01-01", end_date="2026-01-01",
    provider="yfinance"       # or "fmp", "polygon", "tiingo" — same output schema
).to_dataframe()

# ─── EQUITY FUNDAMENTALS (replaces Sharadar) ────────────────────────────────
fundamentals = obb.equity.fundamental.metrics(
    symbol="AAPL", provider="fmp"   # P/B, P/E, ROE, EPS, debt, revenue
).to_dataframe()

# ─── MULTI-ASSET UNIVERSE (replaces securities master) ──────────────────────
sp500 = obb.equity.screener(
    mktcap_min=1_000_000_000,
    exchange="nasdaq,nyse",
    provider="fmp"
).to_dataframe()   # returns ticker, name, sector, market cap, country

# ─── OPTIONS CHAINS (replaces IBKR via QR) ──────────────────────────────────
chain = obb.derivatives.options.chains(
    symbol="SPY", expiration="2026-06-20",
    provider="polygon"    # bid, ask, last, IV, OI, delta, gamma, vega, theta
).to_dataframe()

# ─── FAMA-FRENCH FACTORS (replaces WRDS — completely free) ──────────────────
ff5 = obb.economy.fred_series(
    symbol=["F-F_Research_Data_5_Factors_2x3"],   # Ken French via FRED
    provider="fred"
).to_dataframe()   # Mkt-RF, SMB, HML, RMW, CMA, RF

# ─── MACROECONOMIC DATA (no QR equivalent) ──────────────────────────────────
macro = obb.economy.indicators(
    symbol=["CPIAUCSL","GDP","UNRATE","DGS10"],
    provider="fred"
).to_dataframe()

# ─── MULTI-PROVIDER VALIDATION (QR had no equivalent) ──────────────────────
price_yf  = obb.equity.price.historical("AAPL", provider="yfinance").to_dataframe()
price_fmp = obb.equity.price.historical("AAPL", provider="fmp").to_dataframe()
# Cross-validate to detect data quality issues — impossible with single QR source
```

#### Nautilus Trader — Execution + Backtesting Layer

```python
from nautilus_trader.backtest.node import BacktestNode
from nautilus_trader.config import BacktestRunConfig, BacktestVenueConfig
from nautilus_trader.adapters.interactive_brokers.config import (
    InteractiveBrokersDataClientConfig,
    InteractiveBrokersExecClientConfig,
)
from nautilus_trader.trading.node import TradingNode

# ─── DATA CATALOG (replaces QR history database) ────────────────────────────
from nautilus_trader.persistence.catalog import ParquetDataCatalog

catalog = ParquetDataCatalog("./data/catalog")
# Write OpenBB price data into Nautilus-native format:
catalog.write_chunk(bars)   # nanosecond timestamps, compressed Parquet

# ─── BACKTEST ENGINE (replaces Moonshot/Zipline — far more realistic) ────────
# Event-driven: processes tick-by-tick, respects order types, partial fills,
# slippage, market impact. Moonshot approximates with vectorized arrays.
node = BacktestNode(configs=[BacktestRunConfig(
    engine=BacktestEngineConfig(strategies=[strategy_config]),
    venues=[BacktestVenueConfig(name="SIM", oms_type="HEDGING",
                                account_type="MARGIN", base_currency="USD",
                                starting_balances=["1_000_000 USD"])],
    data=[BacktestDataConfig(catalog_path="./data/catalog",
                             data_cls=Bar, instrument_id=instrument_id,
                             start_time=start, end_time=end)]
)])
results = node.run()

# ─── LIVE / PAPER TRADING (replaces QR blotter) ─────────────────────────────
# Paper trading: TWS paper account (port 7497, free IBKR paper account)
# Live trading:  TWS live account (port 7496)

data_config = InteractiveBrokersDataClientConfig(
    ibg_host="127.0.0.1",
    ibg_port=7497,          # 7497=paper, 7496=live
    ibg_client_id=1,
)
exec_config = InteractiveBrokersExecClientConfig(
    ibg_host="127.0.0.1",
    ibg_port=7497,
    ibg_client_id=1,
    account_id="DU123456",  # IBKR paper account ID
)

node = TradingNode(config=TradingNodeConfig(
    data_clients={"IB": data_config},
    exec_clients={"IB": exec_config},
))
node.add_strategy(PortfolioRebalanceStrategy(config=strategy_config))
node.run()

# ─── MULTI-VENUE CRYPTO (no QR equivalent) ──────────────────────────────────
from nautilus_trader.adapters.binance.config import BinanceDataClientConfig
binance_config = BinanceDataClientConfig(api_key="...", api_secret="...")
# → trade BTCUSDT alongside equities in the same TradingNode
```

---

### 8.3 Menu-by-Menu Augmentation (v1.2)

#### Menu 1 — Pricer

**QuantRocket shortcoming:** IBKR-only options chains, required QR Docker container.

**OpenBB improvement:**
```python
# app/data/openbb_pricer.py
from openbb import obb

def get_option_chain(underlying: str, expiry: str, provider: str = "polygon") -> pd.DataFrame:
    chain = obb.derivatives.options.chains(
        symbol=underlying, expiration=expiry, provider=provider
    ).to_dataframe()
    # Returns: strike, call/put, bid, ask, IV, delta, gamma, vega, theta, OI
    return chain

def get_all_expirations(underlying: str) -> list[str]:
    return obb.derivatives.options.expirations(
        symbol=underlying, provider="polygon"
    ).to_dataframe()["expiration"].tolist()
```

**Nautilus Trader addition (live streaming):**
```python
# Real-time IBKR options quotes streamed via Nautilus DataClient
# → populates OptionChainTable.tsx in real-time via WebSocket
```

**New endpoints:**
```
GET /pricer/option-chain?underlying=AAPL&expiry=2026-06-20&provider=polygon
GET /pricer/expirations?underlying=SPY
GET /pricer/spot?symbol=AAPL&provider=yfinance
```

---

#### Menu 2 — Portfolio

**QuantRocket shortcoming:** Single-provider data, no cross-validation, complex Docker setup for universe management.

**OpenBB improvement:**
```python
# app/data/openbb_portfolio.py
from openbb import obb
import pandas as pd

def get_universe_returns(symbols: list[str], start: str, end: str,
                         provider: str = "yfinance") -> pd.DataFrame:
    """Multi-asset return matrix — provider-agnostic, cross-validatable."""
    prices = {}
    for sym in symbols:
        prices[sym] = obb.equity.price.historical(
            symbol=sym, start_date=start, end_date=end, provider=provider
        ).to_dataframe()["close"]
    return pd.DataFrame(prices).pct_change().dropna()

def get_market_cap_weights(symbols: list[str], provider: str = "fmp") -> pd.Series:
    """Market cap weights for BLM reverse optimization."""
    caps = {}
    for sym in symbols:
        data = obb.equity.fundamental.metrics(symbol=sym, provider=provider).to_dataframe()
        caps[sym] = data["mktcap"].iloc[0]
    total = sum(caps.values())
    return pd.Series({s: v/total for s, v in caps.items()})

def screen_universe(min_mktcap: float = 1e9, exchange: str = "nasdaq,nyse",
                    sector: str = None) -> pd.DataFrame:
    """Programmatic stock screener — replaces QR securities master."""
    params = {"mktcap_min": min_mktcap, "exchange": exchange, "provider": "fmp"}
    if sector:
        params["sector"] = sector
    return obb.equity.screener(**params).to_dataframe()
```

**New endpoints:**
```
GET  /portfolio/universe?min_mktcap=1e9&exchange=nasdaq&sector=Technology
POST /portfolio/returns   { symbols: ["AAPL","MSFT",...], start: "2020-01-01", provider: "yfinance" }
POST /portfolio/market-cap-weights  { symbols: [...], provider: "fmp" }
```

---

#### Menu 3 — Risk

**QuantRocket shortcoming:** Crisis data required paid QR subscription + pre-collected data. Single estimation window.

**OpenBB improvement — on-demand crisis data:**
```python
# app/risk/openbb_risk.py
from openbb import obb

CRISIS_PERIODS = {
    "GFC_2008":        ("2007-07-01", "2009-03-31"),
    "COVID_2020":      ("2020-02-01", "2020-04-30"),
    "Quant_Melt_2007": ("2007-07-01", "2007-09-30"),
    "DotCom_2001":     ("2000-03-01", "2002-10-31"),
    "RateCrisis_2022": ("2022-01-01", "2022-12-31"),   # NEW: not in QR defaults
    "SVB_2023":        ("2023-03-01", "2023-05-31"),    # NEW: recent crisis
}

def get_crisis_returns(crisis_key: str, symbols: list[str],
                       provider: str = "yfinance") -> pd.DataFrame:
    """Fetch actual historical crisis returns on-demand — no pre-collection needed."""
    start, end = CRISIS_PERIODS[crisis_key]
    returns = {}
    for sym in symbols:
        hist = obb.equity.price.historical(
            symbol=sym, start_date=start, end_date=end, provider=provider
        ).to_dataframe()
        returns[sym] = hist["close"].pct_change().dropna()
    return pd.DataFrame(returns)

def get_macro_factors_for_var(start: str, end: str) -> pd.DataFrame:
    """Macro factors for conditional VaR — no QR equivalent existed."""
    macro = obb.economy.fred_series(
        symbol=["DGS10", "VIXCLS", "BAMLH0A0HYM2"],  # 10yr, VIX, HY spread
        provider="fred", start_date=start, end_date=end
    ).to_dataframe()
    return macro
```

**New endpoint:**
```
POST /risk/var/historical-crisis  { crisis: "SVB_2023", symbols: [...], alpha: 0.01 }
POST /risk/macro-factors          { start: "2010-01-01", factors: ["DGS10","VIXCLS"] }
```

---

#### Menu 4 — Optimizer

**QuantRocket shortcoming:** Sector constraints required pre-built security masters. BLM weights hard to pull dynamically.

**OpenBB improvement:**
```python
# app/optimizer/openbb_optimizer.py
from openbb import obb

def get_blm_inputs(symbols: list[str]) -> dict:
    """Complete BLM input set from OpenBB — zero pre-configuration."""
    returns = get_universe_returns(symbols, "2015-01-01", "2026-01-01")
    mkt_weights = get_market_cap_weights(symbols)

    # Sector breakdown for QP constraints
    sector_map = {}
    for sym in symbols:
        profile = obb.equity.profile(symbol=sym, provider="fmp").to_dataframe()
        sector_map[sym] = profile["sector"].iloc[0]

    return {
        "returns": returns,
        "market_weights": mkt_weights,
        "sector_map": sector_map,   # → auto-generate sector weight constraints
        "covariance": returns.cov() * 252
    }

def get_ff5_for_kelly(start: str, end: str) -> pd.DataFrame:
    """Fama-French 5 factors for multi-asset Kelly — free via FRED."""
    return obb.economy.fred_series(
        symbol=["F-F_Research_Data_5_Factors_2x3"],
        provider="fred", start_date=start, end_date=end
    ).to_dataframe()
```

**Nautilus improvement — realistic backtest of optimizer output:**
```python
# After HRP/BLM/MVO produces weights → validate with Nautilus BacktestEngine
# QR Moonshot would approximate fills; Nautilus simulates actual order book
# → accurate transaction cost estimation for Kelly and Risk Parity strategies
```

---

#### Menu 5 — Volatility Lab

**QuantRocket shortcoming:** Required IBKR subscription + QR Docker to get options data. IV surface required pre-collection.

**OpenBB improvement — instant options data, multiple providers:**
```python
# app/vol/openbb_vol.py
from openbb import obb
import numpy as np
from scipy.optimize import brentq
from scipy.stats import norm

def build_iv_surface(underlying: str, provider: str = "polygon") -> pd.DataFrame:
    """Full IV surface from options chains — on-demand, no pre-collection."""
    expirations = obb.derivatives.options.expirations(
        symbol=underlying, provider=provider
    ).to_dataframe()["expiration"].tolist()

    surface_rows = []
    spot = obb.equity.price.historical(
        symbol=underlying, period="1d", provider="yfinance"
    ).to_dataframe()["close"].iloc[-1]

    for expiry in expirations[:8]:   # limit to 8 nearest expirations
        chain = obb.derivatives.options.chains(
            symbol=underlying, expiration=expiry, provider=provider
        ).to_dataframe()

        for _, row in chain.iterrows():
            if row["option_type"] == "call" and row["iv"] and row["iv"] > 0:
                surface_rows.append({
                    "expiry": expiry,
                    "strike": row["strike"],
                    "moneyness": row["strike"] / spot,
                    "iv": row["iv"],
                    "delta": row.get("delta"),
                    "volume": row.get("volume"),
                })

    return pd.DataFrame(surface_rows)

def get_vol_regime(underlying: str, lookback_days: int = 252,
                   provider: str = "yfinance") -> str:
    """Classify vol regime using realized vol — free, no QR needed."""
    hist = obb.equity.price.historical(
        symbol=underlying, provider=provider
    ).to_dataframe()["close"]
    returns = hist.pct_change().dropna()

    realized_vol = returns.rolling(20).std().iloc[-1] * np.sqrt(252)
    long_avg     = returns.rolling(252).std().iloc[-1] * np.sqrt(252)

    ratio = realized_vol / long_avg
    if ratio > 1.5:   return "HIGH"
    elif ratio < 0.7: return "LOW"
    else:             return "NORMAL"
```

**New endpoint:**
```
GET  /vol/surface?underlying=AAPL&provider=polygon
GET  /vol/regime?underlying=SPY&lookback=252
POST /vol/skew-metrics  { underlying: "SPY", delta_targets: [0.25, 0.50, 0.75] }
```

---

#### Menu 6 — Factor Lab *(Largest improvement over QuantRocket)*

**QuantRocket shortcoming:** Sharadar fundamentals required paid subscription. WRDS access required institutional affiliation. Single data source = no validation.

**OpenBB improvement — free fundamentals + multi-source validation:**

**6a. Fundamental Factor Data (replaces Sharadar)**
```python
# app/factors/openbb_factors.py
from openbb import obb
import pandas as pd

FACTOR_FIELDS = {
    "value":    ["pb", "pe", "ps"],           # Price multiples
    "quality":  ["roe", "roa", "debt_equity"], # Profitability / leverage
    "growth":   ["revenue_growth", "eps_growth"],
    "size":     ["mktcap"],
    "momentum": None                           # computed from price history
}

def get_fundamental_factors(symbols: list[str],
                             provider: str = "fmp") -> pd.DataFrame:
    """Cross-sectional fundamental factors for Fama-MacBeth regression."""
    rows = []
    for sym in symbols:
        metrics = obb.equity.fundamental.metrics(
            symbol=sym, provider=provider
        ).to_dataframe().iloc[0]

        rows.append({
            "symbol": sym,
            "pb":            metrics.get("pb"),       # Value (M6)
            "pe":            metrics.get("pe"),        # Value
            "roe":           metrics.get("roe"),       # Quality (M6)
            "debt_equity":   metrics.get("debt_equity"),
            "revenue_growth":metrics.get("revenue_growth"),
            "mktcap":        metrics.get("mktcap"),    # Size factor
        })
    return pd.DataFrame(rows).set_index("symbol")

def get_momentum_factor(symbols: list[str], lookback: int = 252,
                        skip: int = 21) -> pd.Series:
    """12-1 month momentum factor — computed from price history (free)."""
    momentum = {}
    for sym in symbols:
        hist = obb.equity.price.historical(
            symbol=sym, provider="yfinance"
        ).to_dataframe()["close"]
        momentum[sym] = hist.iloc[-skip] / hist.iloc[-lookback] - 1
    return pd.Series(momentum, name="momentum")
```

**6b. Fama-French Factors (replaces WRDS — completely free)**
```python
def get_fama_french_5(start: str, end: str) -> pd.DataFrame:
    """FF5 factors via FRED — free, no institutional affiliation needed.
    QR required WRDS access ($thousands/yr for non-university users)."""
    ff5 = obb.economy.fred_series(
        symbol=["F-F_Research_Data_5_Factors_2x3"],
        provider="fred", start_date=start, end_date=end
    ).to_dataframe()
    # Columns: Mkt-RF, SMB, HML, RMW, CMA, RF (annualized %)
    return ff5

# ALTERNATIVE: pandas_datareader (backup, always free)
import pandas_datareader.data as web
ff5_backup = web.DataReader("F-F_Research_Data_5_Factors_2x3",
                             "famafrench", start, end)[0] / 100
```

**6c. Alphalens Factor Validation (standalone — no QR needed)**
```python
import alphalens

def run_factor_analysis(factor_scores: pd.Series,
                         symbols: list[str],
                         periods: tuple = (1, 5, 21)) -> dict:
    """Full Alphalens pipeline — feeds from OpenBB, completely QR-free."""

    # Fetch price data from OpenBB
    prices_dict = {sym: obb.equity.price.historical(
        symbol=sym, provider="yfinance"
    ).to_dataframe()["close"] for sym in symbols}
    prices = pd.DataFrame(prices_dict)

    # Run Alphalens
    factor_data = alphalens.utils.get_clean_factor_and_forward_returns(
        factor=factor_scores, prices=prices,
        quantiles=5, periods=periods
    )

    ic_data = alphalens.performance.factor_information_coefficient(factor_data)
    quantile_returns = alphalens.performance.mean_return_by_quantile(factor_data)

    return {
        "ic_mean":          float(ic_data.mean()),
        "ic_std":           float(ic_data.std()),
        "ic_ir":            float(ic_data.mean() / ic_data.std()),  # IC IR
        "quantile_returns": quantile_returns.to_dict(),
        "top_bottom_spread": float(
            quantile_returns.iloc[-1].mean() - quantile_returns.iloc[0].mean()
        )
    }
```

**6d. Multi-Provider Data Validation (new capability — QR had no equivalent)**
```python
def validate_factor_data(symbol: str) -> dict:
    """Cross-validate fundamentals across providers — unique to OpenBB."""
    fmp_data  = obb.equity.fundamental.metrics(symbol=symbol, provider="fmp")
    yf_data   = obb.equity.fundamental.metrics(symbol=symbol, provider="yfinance")

    discrepancy = abs(fmp_data["pb"] - yf_data["pb"]) / fmp_data["pb"]
    return {
        "fmp_pb": fmp_data["pb"], "yf_pb": yf_data["pb"],
        "discrepancy_pct": float(discrepancy * 100),
        "use_provider": "fmp" if discrepancy < 0.05 else "manual_review"
    }
```

**New Factor Lab Endpoints:**
```
POST /factors/fundamentals          { symbols: [...], fields: ["pb","roe","eps"] }
POST /factors/ff5                   { start: "2010-01-01", end: "2026-01-01" }
POST /factors/momentum              { symbols: [...], lookback: 252, skip: 21 }
POST /factors/alphalens/ic          { factor: "pb", symbols: [...], periods: [1,5,21] }
POST /factors/validate              { symbol: "AAPL" }   — cross-provider check
```

---

#### Menu 7 — Scenarios

**QuantRocket shortcoming:** Crisis data required pre-collection into QR history databases. Limited to pre-defined periods.

**OpenBB improvement — on-demand, arbitrary date ranges, more crises:**
```python
# app/scenarios/openbb_scenarios.py
from openbb import obb

CRISIS_PERIODS = {
    "GFC_2008":        ("2007-07-01", "2009-03-31"),
    "COVID_2020":      ("2020-02-01", "2020-04-30"),
    "Quant_Melt_2007": ("2007-07-01", "2007-09-30"),
    "DotCom_2001":     ("2000-03-01", "2002-10-31"),
    "RateCrisis_2022": ("2022-01-01", "2022-12-31"),   # QR didn't have this
    "SVB_Crisis_2023": ("2023-03-08", "2023-05-05"),   # QR didn't have this
    "Custom":          None,                             # user-defined
}

def replay_crisis(crisis_key: str, symbols: list[str],
                  custom_dates: tuple = None) -> dict:
    start, end = custom_dates if crisis_key == "Custom" else CRISIS_PERIODS[crisis_key]

    returns = {}
    for sym in symbols:
        hist = obb.equity.price.historical(
            symbol=sym, start_date=start, end_date=end, provider="yfinance"
        ).to_dataframe()["close"]
        returns[sym] = hist.pct_change().dropna()

    portfolio_returns = pd.DataFrame(returns)

    # Also pull macro context for the period
    vix = obb.equity.price.historical("^VIX", start_date=start,
                                       end_date=end, provider="yfinance"
                                       ).to_dataframe()["close"]

    return {
        "period":          crisis_key,
        "asset_returns":   portfolio_returns.to_dict(),
        "correlation_stressed": portfolio_returns.corr().to_dict(),
        "vix_peak":        float(vix.max()),
        "max_drawdown":    float((portfolio_returns.cumsum() + 1).min() - 1)
    }
```

---

#### Menu 8 — Blotter *(Transformed: QuantRocket blotter → Nautilus TradingNode)*

**QuantRocket shortcoming:** Docker dependency for blotter, limited to IBKR + Alpaca, no event-driven strategy simulation, no DeFi/crypto venues.

**Nautilus Trader improvement — native Python, multi-venue, event-driven:**

**8a. Live + Paper Execution (replaces QR blotter)**
```python
# app/blotter/nautilus_executor.py
from nautilus_trader.trading.node import TradingNode
from nautilus_trader.config import TradingNodeConfig, StrategyConfig
from nautilus_trader.adapters.interactive_brokers.config import (
    InteractiveBrokersDataClientConfig,
    InteractiveBrokersExecClientConfig,
)

def build_trading_node(mode: str = "paper") -> TradingNode:
    """mode: 'paper' (port 7497) or 'live' (port 7496)."""
    port = 7497 if mode == "paper" else 7496

    return TradingNode(config=TradingNodeConfig(
        data_clients={"IB": InteractiveBrokersDataClientConfig(
            ibg_host="127.0.0.1", ibg_port=port, ibg_client_id=1,
        )},
        exec_clients={"IB": InteractiveBrokersExecClientConfig(
            ibg_host="127.0.0.1", ibg_port=port, ibg_client_id=1,
            account_id=os.getenv("IBKR_ACCOUNT_ID"),
        )},
    ))

def execute_weights(weights: dict[str, float], portfolio_value: float,
                    prices: dict[str, float], mode: str = "paper") -> list:
    """One-click rebalance from Optimizer output → IBKR orders via Nautilus."""
    from nautilus_trader.model.orders import MarketOrder
    from nautilus_trader.model.enums import OrderSide

    orders = []
    for symbol, weight in weights.items():
        target_value = portfolio_value * weight
        qty = int(target_value / prices[symbol])
        side = OrderSide.BUY if weight > 0 else OrderSide.SELL
        orders.append({"symbol": symbol, "quantity": qty, "side": side.name})

    return orders   # submitted to TradingNode for execution
```

**8b. Event-Driven Backtesting of Optimizer Strategies (QR had no equivalent)**
```python
# app/blotter/nautilus_backtest.py
from nautilus_trader.backtest.node import BacktestNode
from nautilus_trader.config import BacktestRunConfig, BacktestVenueConfig

def backtest_optimizer_strategy(weights_history: pd.DataFrame,
                                 catalog_path: str = "./data/catalog") -> dict:
    """Backtest optimizer-derived weights with realistic fills.
    QR Moonshot approximated this; Nautilus is tick-level event-driven."""

    node = BacktestNode(configs=[BacktestRunConfig(
        engine=BacktestEngineConfig(strategies=[RebalanceStrategy.create(weights_history)]),
        venues=[BacktestVenueConfig(
            name="SIM", oms_type="HEDGING", account_type="MARGIN",
            base_currency="USD", starting_balances=["1_000_000 USD"],
            # Slippage model: 5bps market impact on large orders
            fill_model=FillModel(prob_fill_on_limit=0.95, slippage=0.0005)
        )],
        data=[BacktestDataConfig(catalog_path=catalog_path, data_cls=Bar)]
    )])

    results = node.run()[0]
    return {
        "total_return":  results.stats_pnls["USD"]["PnL%"],
        "sharpe_ratio":  results.stats_returns["SharpeRatio"],
        "max_drawdown":  results.stats_returns["MaxDrawdownDuration"],
        "num_trades":    results.stats_orders["TotalOrders"],
        "win_rate":      results.stats_orders["WinRate"],
    }
```

**8c. Pyfolio Attribution (standalone — no QR needed)**
```python
import pyfolio as pf
import pandas as pd

def generate_tearsheet(returns: pd.Series,
                        benchmark_symbol: str = "SPY") -> dict:
    """Full institutional tear sheet — no QR dependency."""

    # Benchmark from OpenBB
    bench_hist = obb.equity.price.historical(
        symbol=benchmark_symbol, provider="yfinance"
    ).to_dataframe()["close"]
    benchmark_returns = bench_hist.pct_change().dropna()
    benchmark_returns.index = pd.to_datetime(benchmark_returns.index)

    # Align indices
    aligned = returns.align(benchmark_returns, join="inner")

    pf.tears.create_full_tear_sheet(
        aligned[0], benchmark_rets=aligned[1],
        live_start_date=returns.index[-63]  # last 3 months = "live"
    )

    # Quantitative metrics for API response
    return {
        "annual_return": pf.timeseries.annual_return(returns),
        "sharpe_ratio":  pf.timeseries.sharpe_ratio(returns),
        "max_drawdown":  pf.timeseries.max_drawdown(returns),
        "calmar_ratio":  pf.timeseries.calmar_ratio(returns),
        "sortino_ratio": pf.timeseries.sortino_ratio(returns),
        "information_ratio": pf.timeseries.information_ratio(returns, benchmark_returns),
    }
```

**New Blotter Endpoints:**
```
POST /blotter/execute     { weights: {...}, portfolio_value: 1000000, mode: "paper"|"live" }
POST /blotter/backtest    { weights_history: {...}, start: "2020-01-01", slippage: 0.0005 }
POST /blotter/tearsheet   { returns: [...], benchmark: "SPY" }
GET  /blotter/positions   — open positions from Nautilus TradingNode
GET  /blotter/account     — account summary from IBKR via Nautilus
```

---

### 8.4 Setup — Zero Docker Required

```bash
# ── ONE-TIME SETUP ─────────────────────────────────────────────────────────

# 1. Install data + execution stack
pip install "openbb[all]>=4.6.0"         # OpenBB with all providers
pip install nautilus_trader>=1.220.0     # Nautilus with Rust core
pip install alphalens-reloaded pyfolio-reloaded pandas_datareader

# 2. Configure OpenBB providers (optional — free providers work out of the box)
openbb api --login                       # or set env vars:
# OPENBB_FMP_API_KEY=your_fmp_key
# OPENBB_POLYGON_API_KEY=your_polygon_key
# TIINGO_API_KEY=your_tiingo_key
# FRED_API_KEY=your_fred_key  (free, register at fred.stlouisfed.org)

# 3. IBKR TWS / IB Gateway (for execution)
# Download TWS from interactivebrokers.com — free
# Enable API: TWS → Edit → Global Configuration → API → Settings
# Paper trading: port 7497 (free IBKR paper account)

# 4. Initialize Nautilus DataCatalog
python -c "
from nautilus_trader.persistence.catalog import ParquetDataCatalog
catalog = ParquetDataCatalog('./data/catalog')
print('Catalog initialized at ./data/catalog')
"

# 5. Environment variables (.env)
IBKR_ACCOUNT_ID=DU123456           # Paper account
IBKR_LIVE_ACCOUNT_ID=U987654       # Live account (when ready)
OPENBB_FMP_API_KEY=your_key        # FMP free tier: 250 calls/day
OPENBB_POLYGON_API_KEY=your_key    # Polygon for options chains
# NO QuantRocket Docker, NO QR license, NO Sharadar subscription
```

### 8.5 New app/ Modules (v1.2)

```
app/
└── data/
    ├── openbb_client.py           # OpenBB singleton, provider config
    ├── price_provider.py          # obb.equity.price.historical() wrapper
    ├── fundamentals_provider.py   # obb.equity.fundamental.* (P/B, ROE, EPS)
    ├── options_provider.py        # obb.derivatives.options.chains()
    ├── macro_provider.py          # obb.economy.fred_series() (FRED, free)
    └── universe_screener.py       # obb.equity.screener() + sector mapping
app/
└── execution/
    ├── nautilus_node.py           # TradingNode factory (paper/live)
    ├── nautilus_executor.py       # execute_weights() → IBKR orders
    ├── nautilus_backtest.py       # BacktestEngine runner
    └── data_catalog.py            # ParquetDataCatalog read/write
app/
└── analytics/
    ├── alphalens_engine.py        # IC, factor returns (feeds from OpenBB)
    └── pyfolio_engine.py          # tear sheets (feeds from execution layer)
```

### 8.6 Data Flow (v1.2)

```
User selects universe "S&P 500"
        │
        ▼
openbb_client.py:
  obb.equity.screener(mktcap_min=1e9, exchange="nasdaq,nyse")
        │ → 500 ticker symbols
        ▼
price_provider.py:
  obb.equity.price.historical(symbols, provider="yfinance")
        │ → 500×N return matrix (free, 20yr+ history)
        ▼
[optional] write to Nautilus DataCatalog (Parquet)
        │ → fast repeated access, nanosecond timestamps
        ▼
app/portfolio_engine.py → compute Σ (500×500), μ (500,), β (500,)
        │
        ├──→ Optimizer: MVO / BLM / HRP on 500 assets
        ├──→ Risk: VaR/CVaR + crisis replay via OpenBB
        ├──→ Factor Lab: OLS betas + Alphalens IC (OpenBB fundamentals)
        └──→ Blotter: execute via Nautilus TradingNode → IBKR
                       backtest via Nautilus BacktestEngine (event-driven)
                       tearsheet via pyfolio (standalone)
```

---

## 9. Implementation Priority

### Phase 1 — Core Risk & Portfolio (M1 foundation)
1. `POST /portfolio/moments` + `POST /portfolio/performance`
2. `POST /risk/var` (all 3 methods) + `POST /risk/es`
3. `POST /optimize/mvo` with efficient frontier chart
4. Blotter basic trade entry + P&L

### Phase 2 — Advanced Optimization (M3, M5, M7)
5. `POST /optimize/blm` with view editor UI
6. `POST /optimize/risk-parity` (ERC + RRP)
7. `POST /optimize/hrp` with dendrogram
8. `POST /optimize/kelly` with G(f) chart

### Phase 3 — Factor & Volatility (M2, M6, DPE extension)
9. `POST /factors/estimate` + `POST /factors/fama-macbeth`
10. `POST /portfolio/coskewness` (M₃ computation)
11. `POST /heston/calibrate` + IV surface
12. `POST /factors/smart-beta` + crowding monitor

### Phase 4 — Scenarios & Behavioral (M3, M4)
13. Scenario engine + historical scenarios
14. Probabilistic Scenario Optimization
15. Behavioral simulator (Prospect Theory, herding)
16. Full performance attribution in Blotter

---

*End of Specification — Knowledge sources: WQU Portfolio Management M1–M7 + DPE README*
