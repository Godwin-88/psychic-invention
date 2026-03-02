# Transact UI Implementation Roadmap

**Reference:** [uerstory.md](./uerstory.md) (User Stories) · [TRANSACT_APP_SPEC.md](./TRANSACT_APP_SPEC.md) (Master Spec)

## Core Flow Principle

Every menu must follow: **Fetch → Visualize → Analyze → Save/Export**

---

## Implementation Status

### Menu 1: Pricer
| Component | Status | Notes |
|-----------|--------|-------|
| PricingWorkspace | ✅ Implemented | Multi-model (BS, FFT, Heston) |
| GreeksDashboard | ✅ Implemented | Delta, Gamma, Theta, Vega, Rho; BS/FFT/Numerical |
| OptionChainTable | 🟡 Placeholder | Needs `GET /pricer/option-chain` integration |
| ModelComparisonPanel | ✅ Via `/compare/models` | Backend endpoint exists |
| CAPM Integration | 🟡 Placeholder | Delta-adjusted beta exposure |
| Export CSV/JSON | ✅ Implemented | In PricingWorkspace |

### Menu 2: Portfolio
| Component | Status | Notes |
|-----------|--------|-------|
| PortfolioBuilder | ✅ Implemented | Weights, Moments, Performance |
| MomentsPanel | ✅ Implemented | Mean, variance, beta |
| PerformanceAppraisalCard | ✅ Implemented | Sharpe, Treynor, Sortino, M², IR |
| CoskewnessHeatmap | ✅ Implemented | M₃ matrix, portfolio skewness |
| Return Attribution | 🟡 Placeholder | Factor-based attribution |
| Export weights/report | 🟡 Partial | Add JSON/CSV export to builder |

### Menu 3: Risk
| Component | Status | Notes |
|-----------|--------|-------|
| VaRDashboard | ✅ Implemented | Historical, Parametric, Monte Carlo VaR |
| CovarianceHealthCard | 🟡 Placeholder | cond(Σ), shrinkage |
| MSTGraph | 🟡 Placeholder | Requires `/risk/mst` |
| Greeks Aggregation | 🟡 Placeholder | Portfolio Delta/Gamma/Vega |
| Export risk report | 🟡 Partial | Add CSV/JSON export to VaR |

### Menu 4: Optimizer
| Component | Status | Notes |
|-----------|--------|-------|
| EfficientFrontierChart | ✅ Implemented | MVO frontier |
| OptimizerPhase2 | ✅ Implemented | MVO inputs |
| BLMViewEditor | 🟡 Placeholder | Black-Litterman views |
| HRPDendrogram | 🟡 Placeholder | HRP clustering viz |
| Kelly, Risk Parity | 🟡 Placeholder | APIs exist |
| OptimizerComparison | 🟡 Placeholder | Radar chart |
| Send to Blotter | 🟡 Partial | Wire optimization weights to blotter |

### Menu 5: Volatility Lab
| Component | Status | Notes |
|-----------|--------|-------|
| VolatilitySurfaceChart | ✅ Implemented | IV surface |
| HestonCalibrationPanel | 🟡 Placeholder | API: `/heston/calibrate` |
| VolDecomposition | 🟡 Placeholder | Factor vol split |

### Menu 6: Factor Lab
| Component | Status | Notes |
|-----------|--------|-------|
| FactorLabPhase3 | ✅ Implemented | Factor estimate |
| FamaMacBethTable | 🟡 Placeholder | API exists |
| CrowdingMonitor | 🟡 Placeholder | API: `/factors/crowding` |
| Smart Beta | 🟡 Placeholder | API exists |

### Menu 7: Scenarios
| Component | Status | Notes |
|-----------|--------|-------|
| ScenarioLabPhase4 | ✅ Implemented | Define, run scenarios |
| ProbabilisticOptimizer | 🟡 Placeholder | API exists |
| MCSimulationChart | 🟡 Placeholder | Monte Carlo viz |
| BehavioralSimulator | 🟡 Placeholder | Prospect theory |

### Menu 8: Blotter
| Component | Status | Notes |
|-----------|--------|-------|
| TradeEntryForm | ✅ Implemented | Add trades |
| PositionTable | ✅ Implemented | P&L, entry price |
| AttributionCard | ✅ Implemented | Alpha, beta attribution |
| BlotterHistory | ✅ Implemented | Full history + CSV/JSON export |
| Export Centre | ✅ Via History | Export filtered history |

---

## Phase Plan (from uerstory.md)

- **Phase 1:** Portfolio, Risk, Optimizer (MVO), Blotter (Basic) — **Core done**
- **Phase 2:** Optimizer (BLM, Kelly, HRP), Risk (MST/Shrinkage)
- **Phase 3:** Factor Lab, Volatility Lab, Portfolio (Higher Moments)
- **Phase 4:** Scenarios, Blotter (Full Attribution/Execution)

---

## Next Steps

1. Implement remaining placeholders in Phase 2 order.
2. Add consistent Export buttons to all result panels.
3. Implement `Send to Blotter` from Optimizer.
4. Add Fetch Data (OpenBB) integration where applicable.
