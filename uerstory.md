# Transact Application: Functional Specification & User Stories

**Version:** 1.2  
**Date:** 2026-02-25  
**Role:** Solution Architect / Full Stack Developer  
**Domain:** Institutional Portfolio Management & Trading  

## 1. Executive Overview

The **Transact Application** is a full-stack institutional platform extending the Derivatives Pricing Engine (DPE). It integrates WQU Portfolio Management Modules (M1–M7) with production-grade data (OpenBB), execution (Nautilus Trader), and synthetic derivatives (Deriv API). 

### 1.1 Core User Flow Principle
Every menu item within the application must adhere to the following four-stage workflow:
1.  **Fetch Data:** Retrieve market, fundamental, or macro data via OpenBB/Nautilus/Deriv.
2.  **Visualize & Explore:** Render interactive charts, tables, and dashboards using React + Tailwind.
3.  **Analyze:** Perform quantitative computations (Pricing, Optimization, Risk) using Rust Core/Python.
4.  **Save or Export:** Persist configurations, export reports (CSV/JSON), or execute trades.

### 1.2 Technology Stack
| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript + Tailwind CSS | UI Components, Data Visualization (Recharts/D3) |
| **API** | FastAPI (Python) | Orchestration, Data Aggregation, Request Validation |
| **Compute** | Rust Core (via PyO3) | High-performance Pricing, HRP, VaR, Optimization |
| **Data** | OpenBB Platform | Unified Market Data (Equities, Crypto, Macro, Fundamentals) |
| **Execution** | Nautilus Trader | Backtesting, Live/Paper Trading (IBKR, Crypto) |
| **Derivatives** | Deriv API | Synthetic Volatility Indices, Binary/Barrier Options |

---

## 2. Global Non-Functional Requirements

| ID | Requirement | Target |
| :--- | :--- | :--- |
| **NFR-01** | **Latency** | Critical pricing/optimization endpoints < 500ms (see Section 7 of Spec). |
| **NFR-02** | **Data Freshness** | Market data cached max 30s (L1 Cache); Real-time via WebSocket where available. |
| **NFR-03** | **Export Integrity** | All exports must be valid CSV/JSON with schema validation. |
| **NFR-04** | **Security** | API Keys (OpenBB, IBKR, Deriv) stored in environment variables, never client-side. |
| **NFR-05** | **Extensibility** | Data providers (OpenBB) must be switchable via configuration without code changes. |

---

## 3. Menu Item Specifications

### Menu 1: Pricer
**Purpose:** Real-time multi-model derivatives pricing workspace (BS, FFT, Heston).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Trader**, I want to fetch live option chains and spot prices so that I can price against current market conditions. | 1. System retrieves spot price via `GET /pricer/spot` (Deriv/OpenBB) within 30s freshness.<br>2. System retrieves full option chain via `GET /pricer/option-chain` including IV, Greeks, OI.<br>3. Supports underlying assets from Equities, Forex, and Synthetic Indices. |
| **Visualize** | As a **Quant**, I want to view option chains and Greeks dashboards so that I can identify mispricings. | 1. `OptionChainTable.tsx` displays Strike × Expiry grid with color-coded ITM/ATM/OTM.<br>2. `GreeksDashboard.tsx` shows Δ, Γ, ν, Θ, ρ surfaces heatmap.<br>3. Model agreement indicators flag deviations >1% between BS, FFT, Heston. |
| **Analyze** | As a **Risk Manager**, I want to compare pricing models side-by-side so that I can validate theoretical values. | 1. `POST /price/model-compare` returns prices for BS, FFT, Heston simultaneously.<br>2. CAPM integration shows Delta-adjusted beta exposure.<br>3. Heston calibration checks Feller condition ($2\kappa\theta > \xi^2$). |
| **Save/Export** | As a **Analyst**, I want to export pricing snapshots so that I can archive trade ideas. | 1. `Export to CSV/JSON` includes inputs (S, K, τ, σ) and outputs (Price, Greeks).<br>2. Saved configurations persist in user session storage.<br>3. Export file size < 5MB for standard chains. |

**Key Endpoints:** `POST /price/{call|put}/bs`, `POST /greeks/{call|put}`, `GET /price/model-compare`  
**Key Components:** `PricingWorkspace.tsx`, `GreeksDashboard.tsx`, `OptionChainTable.tsx`

---

### Menu 2: Portfolio
**Purpose:** Define, build, and analyze a multi-asset portfolio (Moments, Performance, Higher-Order Stats).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Portfolio Manager**, I want to fetch historical returns and fundamentals for a universe of assets so that I can build a portfolio. | 1. `GET /portfolio/universe` retrieves tickers via OpenBB Screener (e.g., S&P 500).<br>2. `POST /portfolio/returns` fetches historical price data (min 5 years) for selected assets.<br>3. Supports manual weight input or drag-to-rebalance UI. |
| **Visualize** | As a **Manager**, I want to visualize portfolio weights and sample moments so that I understand current exposure. | 1. `PortfolioBuilder.tsx` shows weight distribution pie/bar chart.<br>2. `MomentsPanel.tsx` displays Mean, Variance, Skewness, Kurtosis.<br>3. Constraint warnings appear if weights $\neq$ 1 or short-selling rules violated. |
| **Analyze** | As a **Analyst**, I want to compute performance ratios and higher-order statistics so that I can appraise strategy quality. | 1. `POST /portfolio/performance` calculates Sharpe, Treynor, Sortino, M², Information Ratio.<br>2. `POST /portfolio/coskewness` computes $M_3$ matrix and portfolio skewness via Kronecker product.<br>3. Factor attribution links to Menu 6 (Factor Lab). |
| **Save/Export** | As a **Manager**, I want to save portfolio configurations so that I can reload them later. | 1. Portfolio weights exportable to JSON.<br>2. Performance report exportable to PDF/CSV.<br>3. Two-way sync with Menu 4 (Optimizer) to load optimal weights. |

**Key Endpoints:** `POST /portfolio/moments`, `POST /portfolio/performance`, `POST /portfolio/coskewness`  
**Key Components:** `PortfolioBuilder.tsx`, `MomentsPanel.tsx`, `PerformanceAppraisalCard.tsx`

---

### Menu 3: Risk
**Purpose:** Comprehensive risk analytics (VaR, CVaR, Covariance Health, Greeks Aggregation).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Risk Officer**, I want to fetch historical crisis data and covariance matrices so that I can stress test the portfolio. | 1. `POST /risk/var/historical-crisis` fetches specific crisis periods (e.g., 2008, 2020) via OpenBB.<br>2. System retrieves current covariance matrix $\Sigma$ for selected universe. |
| **Visualize** | As a **Officer**, I want to visualize VaR distributions and correlation structures so that I can identify concentration risk. | 1. `VaRDashboard.tsx` shows side-by-side VaR (Parametric, Historical, Monte Carlo).<br>2. `MSTGraph.tsx` renders Minimum Spanning Tree of asset correlations.<br>3. Heatmap compares Raw $\Sigma$ vs. Shrunk $\Sigma$ (Ledoit-Wolf/OAS). |
| **Analyze** | As a **Quant**, I want to compute Expected Shortfall and Greeks-aggregated risk so that I know tail exposure. | 1. `POST /risk/es` calculates Conditional VaR (Expected Shortfall) at 95%/99% confidence.<br>2. `POST /risk/greeks-aggregate` sums Delta/Gamma/Vega across derivative positions.<br>3. Condition number flag warns if $\text{cond}(\Sigma) > 1000$. |
| **Save/Export** | As a **Compliance Officer**, I want to export risk reports so that I can archive regulatory capital calculations. | 1. Export includes VaR, ES, Horizon (1d, 10d, 1m), and Confidence Level.<br>2. Report includes methodology notes (e.g., "Monte Carlo 1M paths").<br>3. CSV export compatible with internal risk databases. |

**Key Endpoints:** `POST /risk/var`, `POST /risk/es`, `POST /risk/covariance-health`, `POST /risk/mst`  
**Key Components:** `VaRDashboard.tsx`, `CovarianceHealthCard.tsx`, `MSTGraph.tsx`

---

### Menu 4: Optimizer
**Purpose:** Multi-strategy portfolio optimization (MVO, Black-Litterman, Kelly, HRP, Risk Parity).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Strategist**, I want to fetch expected returns and covariance inputs so that I can run optimization algorithms. | 1. Inputs sourced from Menu 2 (Portfolio) or Market Data (OpenBB).<br>2. Black-Litterman inputs include Market Cap Weights (`GET /portfolio/market-cap-weights`).<br>3. Supports constraints (Long-only, Sector limits). |
| **Visualize** | As a **Strategist**, I want to visualize the Efficient Frontier and strategy comparisons so that I can select the best approach. | 1. `EfficientFrontierChart.tsx` plots Risk vs. Return with interactive points.<br>2. `OptimizerComparison.tsx` radar chart compares 6 strategies (MVO, BL, Kelly, etc.).<br>3. `HRPDendrogram.tsx` shows hierarchical clustering structure. |
| **Analyze** | As a **Quant**, I want to run multiple optimization paradigms so that I can robustify asset allocation. | 1. `POST /optimize/mvo` solves QP for Efficient Frontier (< 500ms).<br>2. `POST /optimize/blm` implements Reverse Optimization + Bayesian Views.<br>3. `POST /optimize/hrp` executes Clustering → Quasi-Diagonalization → Recursive Bisection. |
| **Save/Export** | As a **Trader**, I want to export optimal weights so that I can execute them in the Blotter. | 1. Export weights to JSON/CSV.<br>2. "Send to Blotter" button pushes weights to Menu 8.<br>3. Save optimization parameters (τ, risk aversion) for reproducibility. |

**Key Endpoints:** `POST /optimize/mvo`, `POST /optimize/blm`, `POST /optimize/hrp`, `POST /optimize/compare`  
**Key Components:** `EfficientFrontierChart.tsx`, `BLMViewEditor.tsx`, `HRPDendrogram.tsx`

---

### Menu 5: Volatility Lab
**Purpose:** Advanced volatility analysis (IV Surface, Heston Calibration, Factor Vol Decomposition).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Vol Trader**, I want to fetch implied volatility data and options chains so that I can build vol surfaces. | 1. `GET /vol/surface` retrieves IV grid via OpenBB (Polygon/Tradier).<br>2. Fetches historical realized vol for comparison.<br>3. Supports multiple expirations and strikes. |
| **Visualize** | As a **Trader**, I want to visualize the IV Surface and Volatility Smile so that I can spot arbitrage opportunities. | 1. `IVSurface3D.tsx` renders interactive 3D surface (Strike, Expiry, IV).<br>2. Smile chart plots IV vs. Moneyness.<br>3. Term structure chart plots ATM IV vs. Time-to-Expiry. |
| **Analyze** | As a **Quant**, I want to calibrate stochastic vol models so that I can price exotics accurately. | 1. `POST /heston/calibrate` fits $(v_0, \kappa, \theta, \xi, \rho)$ using L-BFGS-B.<br>2. Displays RMSE and calibration fit quality per maturity.<br>3. Factor vol decomposition splits risk into Systematic vs. Idiosyncratic. |
| **Save/Export** | As a **Model Validator**, I want to export calibration parameters so that I can audit model inputs. | 1. Export Heston parameters to JSON.<br>2. Export IV Surface grid to CSV.<br>3. Save calibration timestamp and data source provider. |

**Key Endpoints:** `POST /vol/implied-surface`, `POST /heston/calibrate`, `POST /vol/factor-decompose`  
**Key Components:** `IVSurface3D.tsx`, `HestonCalibrationPanel.tsx`, `VolDecomposition.tsx`

---

### Menu 6: Factor Lab
**Purpose:** Build, estimate, and analyze multi-factor models (Fama-MacBeth, Smart Beta, Crowding).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Researcher**, I want to fetch fundamental data and macro factors so that I can construct factor models. | 1. `POST /factors/fundamentals` retrieves P/B, ROE, Momentum via OpenBB (FMP/YFinance).<br>2. `POST /factors/ff5` fetches Fama-French 5 Factors via FRED (Free).<br>3. Supports custom factor definition. |
| **Visualize** | As a **Researcher**, I want to visualize factor loadings and IC scores so that I can evaluate factor efficacy. | 1. `FamaMacBethTable.tsx` shows risk premia ($\lambda$) with t-stats and significance stars.<br>2. `CrowdingMonitor.tsx` displays herding risk index heatmap.<br>3. Scree plot shows PCA eigenvalue decay for latent factors. |
| **Analyze** | As a **Quant**, I want to run Fama-MacBeth regressions and smart beta backtests so that I can validate anomalies. | 1. `POST /factors/fama-macbeth` performs two-stage regression (< 1000ms).<br>2. `POST /factors/smart-beta` constructs factor-tilted portfolios.<br>3. `POST /factors/crowding` calculates cross-portfolio correlation of loadings. |
| **Save/Export** | As a **PM**, I want to export factor scores so that I can integrate them into the Optimizer. | 1. Export factor scores per asset to CSV.<br>2. Save factor model configuration (OLS/GLS, factors used).<br>3. Export Alphalens tear sheet metrics (IC, Turnover). |

**Key Endpoints:** `POST /factors/estimate`, `POST /factors/fama-macbeth`, `POST /factors/smart-beta`  
**Key Components:** `FactorModelBuilder.tsx`, `FamaMacBethTable.tsx`, `CrowdingMonitor.tsx`

---

### Menu 7: Scenarios
**Purpose:** Stress testing and probabilistic scenario optimization (Historical, Behavioral, Monte Carlo).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Risk Manager**, I want to fetch historical crisis periods and define custom shocks so that I can stress test. | 1. `POST /scenarios/define` allows custom shocks (Returns, Vol, Correlation).<br>2. Pre-loaded historical scenarios (2008, 2020, 2023 SVB) via OpenBB.<br>3. Fetches macro factors for conditional scenarios. |
| **Visualize** | As a **Manager**, I want to visualize P&L distributions under stress so that I can understand tail risk. | 1. `MCSimulationChart.tsx` shows histogram of terminal wealth (1M paths).<br>2. `BehavioralSimulator.tsx` shows Prospect Theory utility curves.<br>3. Drawdown analysis chart during crisis periods. |
| **Analyze** | As a **Strategist**, I want to run probabilistic scenario optimization so that I can robustify against ambiguity. | 1. `POST /scenarios/probabilistic` optimizes weights across K scenarios with probabilities $p_k$.<br>2. Behavioral simulation applies loss aversion coefficients ($\lambda \approx 2.25$).<br>3. Covariance stress testing shrinks $\Sigma$ toward identity. |
| **Save/Export** | As a **Compliance Officer**, I want to export stress test results so that I can document capital adequacy. | 1. Export scenario definitions and results to JSON.<br>2. Report includes VaR/ES under each scenario.<br>3. Save "Worst Case" portfolio configuration. |

**Key Endpoints:** `POST /scenarios/run`, `POST /scenarios/probabilistic`, `POST /scenarios/behavioral`  
**Key Components:** `ScenarioEditor.tsx`, `ProbabilisticOptimizer.tsx`, `MCSimulationChart.tsx`

---

### Menu 8: Blotter
**Purpose:** Transaction ledger, P&L tracking, and performance attribution (Nautilus Integration).

| Flow Stage | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Fetch** | As a **Trader**, I want to fetch open positions and account summary so that I can monitor live exposure. | 1. `GET /blotter/positions` retrieves live positions from Nautilus TradingNode (IBKR/Deriv).<br>2. `GET /blotter/account` shows buying power and equity.<br>3. Fetches theoretical prices from Menu 1 for Mark-to-Model. |
| **Visualize** | As a **Trader**, I want to visualize P&L and attribution waterfalls so that I can understand performance drivers. | 1. `PositionTable.tsx` shows Live P&L, Entry Price, Current Price.<br>2. `AttributionWaterfall.tsx` decomposes returns into Alpha, Beta, Factor, Residual.<br>3. `PnLChart.tsx` shows cumulative P&L and drawdown over time. |
| **Analyze** | As a **PM**, I want to analyze trade performance and generate tear sheets so that I can evaluate strategy efficacy. | 1. `POST /blotter/attribution` computes CAPM Alpha and Factor contributions.<br>2. `POST /blotter/tearsheet` generates Pyfolio report (Sharpe, Max DD, Calmar).<br>3. Greeks-adjusted P&L calculates $\Delta \cdot \Delta S + \frac{1}{2}\Gamma \cdot (\Delta S)^2$. |
| **Save/Export** | As a **Accountant**, I want to export trade logs so that I can reconcile accounts. | 1. `GET /blotter/history` exports full transaction history to CSV.<br>2. Export includes trade tags (Strategy, Asset Class).<br>3. "Execute Weights" sends optimization results to Nautilus for order generation. |

**Key Endpoints:** `POST /blotter/trade`, `GET /blotter/positions`, `POST /blotter/attribution`  
**Key Components:** `TradeEntryForm.tsx`, `PositionTable.tsx`, `AttributionWaterfall.tsx`

---

## 4. Implementation Phases

To ensure delivery aligns with the Core Flow principle, development will proceed in four phases:

### Phase 1: Core Risk & Portfolio (M1 Foundation)
*   **Focus:** Data Fetching (OpenBB), Basic Visualization, MVO, VaR.
*   **Menus:** Portfolio (2), Risk (3), Optimizer (MVO only), Blotter (Basic).
*   **Deliverable:** Users can fetch data, build a portfolio, calculate VaR, and export weights.

### Phase 2: Advanced Optimization (M3, M5, M7)
*   **Focus:** Complex Analysis (Black-Litterman, HRP, Kelly).
*   **Menus:** Optimizer (Full), Risk (MST/Shrinkage).
*   **Deliverable:** Users can analyze advanced strategies and visualize efficient frontiers/dendrograms.

### Phase 3: Factor & Volatility (M2, M6, DPE Extension)
*   **Focus:** Specialized Data (Fundamentals, Options), Factor Analysis.
*   **Menus:** Factor Lab (6), Volatility Lab (5), Portfolio (Higher Moments).
*   **Deliverable:** Users can calibrate Heston, run Fama-MacBeth, and analyze coskewness.

### Phase 4: Scenarios & Behavioral (M3, M4)
*   **Focus:** Stress Testing, Behavioral Finance, Full Integration.
*   **Menus:** Scenarios (7), Blotter (Full Attribution/Execution).
*   **Deliverable:** Users can stress test portfolios, simulate behavioral biases, and execute trades via Nautilus.

---

## 5. Data Flow Architecture

```mermaid
graph TD
    User[User Interface React/Tailwind] -->|HTTP/WebSocket| API[FastAPI Layer]
    API -->|PyO3| Rust[Rust Core Engine]
    API -->|OpenBB SDK| OpenBB[OpenBB Platform]
    API -->|Nautilus SDK| Nautilus[Nautilus Trader]
    API -->|WebSocket| Deriv[Deriv API]
    
    OpenBB -->|Market Data| DB[(Data Catalog/Parquet)]
    Nautilus -->|Execution| IBKR[IBKR Gateway]
    Rust -->|Compute| API
    
    subgraph Core Flow
    Fetch[1. Fetch Data] --> Visualize[2. Visualize]
    Visualize --> Analyze[3. Analyze]
    Analyze --> Save[4. Save/Export]
    end
    
    API --> Core Flow
```

## 6. Acceptance Testing Strategy

*   **Unit Tests:** Python `pytest` for API endpoints; Rust `cargo test` for core math engines (Pricing, HRP).
*   **Integration Tests:** Verify OpenBB data retrieval against known benchmarks (e.g., SPY price).
*   **E2E Tests:** Cypress/Playwright scripts to validate the Fetch → Visualize → Analyze → Save flow for each menu.
*   **Performance Tests:** Load testing on optimization endpoints to ensure < 500ms response times for standard universes (50-100 assets).