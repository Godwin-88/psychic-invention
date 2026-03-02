Frontend UI/UX Redesign Plan

Overview

Transform the frontend to match TRANSACT_APP_SPEC.md specifications. The redesign includes navigate-List-View-Edit Framework.





Modern landing page



Filtered marketplace showing all 8 menu items as offerings



Transaction platform with left sidebar menu and workspace tabs

Current State Analysis

Files to modify:





frontend/src/components/LandingStage.tsx - Outdated landing page



frontend/src/components/MarketplaceStage.tsx - Only 4 cards, missing menu items



frontend/src/components/Transact/TransactPage.tsx - No left sidebar, uses tabs instead



frontend/src/App.tsx - Routing needs updates



frontend/src/components/Header.tsx - Navigation may need updates

Key Issues:





Landing page UI is outdated (per attached image)



Marketplace only shows 4 offerings instead of 8 menu items from specs



No filtering mechanism in marketplace



Transaction platform lacks left sidebar menu structure



Missing menu items: Volatility Lab, Factor Lab, Pricer (as separate offering)

Menu Items from Specs (Section 3)

Based on TRANSACT_APP_SPEC.md Section 1 (Navigation Structure) and Section 3:





Overview - Summary dashboard



Pricer - Multi-model derivatives pricing (BS, FFT, Heston)



Portfolio - Portfolio builder, moments, performance appraisal



Risk - VaR/CVaR, Greeks aggregation, covariance health



Optimizer - MVO, Black-Litterman, Kelly, Risk Parity, HRP



Volatility Lab - IV surface, Heston calibration, vol decomposition



Factor Lab - Factor models, Fama-MacBeth, Smart Beta, crowding



Scenarios - Stress testing, probabilistic optimization, behavioral



Blotter - Trade entry, P&L tracking, attribution



Settings - Configuration

Implementation Plan

Phase 1: Modernize Landing Page

File: frontend/src/components/LandingStage.tsx

Changes:





Update hero section with modern gradient design



Improve typography hierarchy



Add animated metrics cards



Modernize CTA buttons



Update color scheme to match modern design standards



Remove outdated elements

Design elements:





Clean, spacious layout



Subtle animations



Modern color palette (slate-950 base with blue accents)



Better visual hierarchy

Phase 2: Create Filtered Marketplace

File: frontend/src/components/MarketplaceStage.tsx

New structure:





Filter bar with multiple filter types:





By Module: M1, M2, M3, M4, M5, M6, M7, DPE (from Section 2 Knowledge Source Map)



By Category: Pricing, Portfolio Management, Risk Analytics, Optimization, Volatility, Factor Analysis, Scenarios, Execution



By Complexity: Basic, Intermediate, Advanced



Search: Text search for offerings

Marketplace cards for all 8 menu items:





Pricer Card





Tags: DPE, M1, M2, Pricing



Description: Multi-model derivatives pricing (BS, FFT, Heston)



Route: /transact/pricer



Portfolio Card





Tags: M1, M2, Portfolio Management



Description: Portfolio builder, moments, performance metrics



Route: /transact/portfolio



Risk Card





Tags: M1, M2, M7, Risk Analytics



Description: VaR/CVaR, Greeks aggregation, covariance health



Route: /transact/risk



Optimizer Card





Tags: M1, M3, M5, M7, Optimization



Description: MVO, Black-Litterman, Kelly, Risk Parity, HRP



Route: /transact/optimizer



Volatility Lab Card





Tags: DPE, M1, M2, Volatility



Description: IV surface, Heston calibration, vol decomposition



Route: /transact/volatility



Factor Lab Card





Tags: M2, M6, Factor Analysis



Description: Factor models, Fama-MacBeth, Smart Beta, crowding



Route: /transact/factor



Scenarios Card





Tags: M1, M3, M4, Scenarios



Description: Stress testing, probabilistic optimization, behavioral



Route: /transact/scenarios



Blotter Card





Tags: DPE, M1, M2, Execution



Description: Trade entry, P&L tracking, performance attribution



Route: /transact/blotter

Filter implementation:





Multi-select filter chips



Active filter indicators



Filtered card grid with smooth transitions



"Clear filters" button



Filter count badge

Phase 3: Build Transaction Platform with Left Sidebar

New file: frontend/src/components/Transact/TransactLayout.tsx

Layout structure:

┌─────────────────────────────────────────┐
│ Header (existing)                        │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Workspace Tab (main area)   │
│ Menu     │                              │
│          │                              │
│ - Overview│                              │
│ - Pricer │                              │
│   - Multi-Model                         │
│   - Greeks                              │
│   - Option Chain                        │
│ - Portfolio                             │
│   - Builder                             │
│   - Moments                             │
│   - Performance                         │
│ - Risk                                  │
│   - VaR                                 │
│   - ES                                  │
│   - Covariance                          │
│ - Optimizer                             │
│   - MVO                                 │
│   - BLM                                 │
│   - Kelly                               │
│   - Risk Parity                         │
│   - HRP                                 │
│ - Volatility Lab                        │
│   - IV Surface                          │
│   - Heston                              │
│   - Decomposition                       │
│ - Factor Lab                            │
│   - Factor Models                       │
│   - Fama-MacBeth                        │
│   - Smart Beta                          │
│ - Scenarios                             │
│   - Stress Tests                        │
│   - Probabilistic                       │
│   - Behavioral                          │
│ - Blotter                               │
│   - Trade Entry                         │
│   - Positions                           │
│   - Attribution                         │
│ - Settings                              │
└──────────┴──────────────────────────────┘

Sidebar component: frontend/src/components/Transact/Sidebar.tsx





Collapsible menu items



Expandable submenu items



Active state highlighting



Icons for each menu item



Smooth transitions

Workspace component: frontend/src/components/Transact/Workspace.tsx





Main content area (largest section)



Renders component based on selected menu/submenu



Responsive layout



Breadcrumb navigation

Submenu mapping (from specs Section 3):

Pricer submenus:





Multi-Model Pricing Panel (3.1.1)



Greeks Dashboard (3.1.2)



Option Chain View (3.1.3)



CAPM Integration (3.1.4)

Portfolio submenus:





Asset Universe & Weight Builder (3.2.1)



Sample Moments Engine (3.2.2)



Performance Appraisal Panel (3.2.3)



Higher-Order Statistics (3.2.4)



Return Attribution (3.2.5)

Risk submenus:





VaR Calculator (3.3.1)



Greeks Risk Aggregation (3.3.2)



Covariance Matrix Health (3.3.3)



Risk Dashboard Summary (3.3.4)

Optimizer submenus:





Mean-Variance Optimization (3.4.1)



Black-Litterman Model (3.4.2)



Critical Line Algorithm (3.4.3)



Kelly Criterion (3.4.4)



Risk Parity (3.4.5)



Hierarchical Risk Parity (3.4.6)



Optimizer Comparison (3.4.7)

Volatility Lab submenus:





Implied Volatility Surface (3.5.1)



Heston Model Calibration (3.5.2)



Historical vs Implied Vol (3.5.3)



Factor-Based Vol Decomposition (3.5.4)

Factor Lab submenus:





Factor Model Builder (3.6.1)



Fama-MacBeth Regression (3.6.2)



Smart Beta Construction (3.6.3)



Herding Risk Monitor (3.6.4)



ML Factor Discovery (3.6.5)

Scenarios submenus:





Scenario Definition Engine (3.7.1)



Probabilistic Scenario Optimization (3.7.2)



Behavioral Scenarios (3.7.3)



Monte Carlo Portfolio Simulation (3.7.4)



Covariance Stress Testing (3.7.5)

Blotter submenus:





Trade Entry (3.8.1)



Position Monitor (3.8.2)



Performance Attribution (3.8.3)



Transaction History (3.8.4)



Export (3.8.5)

Phase 4: Update Routing

File: frontend/src/App.tsx

New routes:





/ - Landing page (updated)



/marketplace - Marketplace with filters (updated)



/transact - Transaction platform (new layout)



/transact/:menuItem - Specific menu item workspace



/transact/:menuItem/:submenu - Specific submenu workspace

Route structure:

<Route path="/transact" element={<TransactLayout />}>
  <Route index element={<Overview />} />
  <Route path="pricer" element={<PricerWorkspace />} />
  <Route path="pricer/:submenu" element={<PricerWorkspace />} />
  <Route path="portfolio" element={<PortfolioWorkspace />} />
  <Route path="portfolio/:submenu" element={<PortfolioWorkspace />} />
  // ... similar for all menu items
</Route>

Phase 5: Component Updates

Update existing components:





PricingWorkspace.tsx - Integrate into Pricer menu item



PortfolioBuilder.tsx - Integrate into Portfolio workspace



VaRDashboard.tsx - Integrate into Risk workspace



EfficientFrontierChart.tsx - Integrate into Optimizer workspace



Other existing components - Map to appropriate menu items

Create new components:





TransactLayout.tsx - Main layout with sidebar



Sidebar.tsx - Left navigation menu



Workspace.tsx - Main content area



MarketplaceFilters.tsx - Filter bar component



OfferingCard.tsx - Marketplace card component



Overview.tsx - Overview dashboard

Phase 6: Styling Updates

File: frontend/src/styles/index.css

New styles:





Sidebar navigation styles



Active menu item highlighting



Submenu indentation and styling



Filter chip styles



Modern card hover effects



Smooth transitions

Design tokens:





Consistent spacing



Modern color palette



Typography scale



Border radius values



Shadow system

File Structure

frontend/src/
├── components/
│   ├── LandingStage.tsx (updated)
│   ├── MarketplaceStage.tsx (updated)
│   ├── MarketplaceFilters.tsx (new)
│   ├── OfferingCard.tsx (new)
│   └── Transact/
│       ├── TransactLayout.tsx (new)
│       ├── Sidebar.tsx (new)
│       ├── Workspace.tsx (new)
│       ├── Overview.tsx (new)
│       ├── TransactPage.tsx (refactor)
│       └── [menu-items]/
│           ├── PricerWorkspace.tsx
│           ├── PortfolioWorkspace.tsx
│           ├── RiskWorkspace.tsx
│           ├── OptimizerWorkspace.tsx
│           ├── VolatilityWorkspace.tsx
│           ├── FactorWorkspace.tsx
│           ├── ScenariosWorkspace.tsx
│           └── BlotterWorkspace.tsx
├── App.tsx (updated routing)
└── styles/
    └── index.css (updated)

Implementation Order





Landing Page - Quick visual update



Marketplace Filters - Add filtering capability



Marketplace Cards - Add all 8 menu items



Transact Layout - Build sidebar + workspace structure



Routing - Update routes to support new structure



Component Integration - Map existing components to menu items



Styling Polish - Final design refinements

Key Design Principles





Left sidebar navigation - Primary navigation method in transaction platform



Workspace as main area - Largest section, contains all functionality



Submenu hierarchy - Clicking menu item expands submenu, selecting submenu shows workspace



Filtered marketplace - Easy discovery of offerings by module, category, complexity



Modern aesthetics - Clean, professional, institutional-grade UI



Responsive design - Works on desktop and tablet (mobile sidebar collapses)

Notes





All menu items and submenus are defined in TRANSACT_APP_SPEC.md Section 3



Filter categories derived from Section 2 (Knowledge Source Map)



Route structure supports deep linking to specific submenus



Existing components will be integrated, not replaced



Maintain backward compatibility where possible

