// Shared navigation config — used by Sidebar (primary rail) and
// TransactLayout (secondary sub-nav panel). Keep in sync with App.tsx routes.

export interface SubItem {
  id: string;
  label: string;
  path: string;
}

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  path: string;
  subItems?: SubItem[];
}

export const menuItems: MenuItem[] = [
  {
    id: 'overview',
    icon: '🏠',
    label: 'Overview',
    path: '/transact',
  },
  {
    id: 'pricer',
    icon: '⚡',
    label: 'Pricer',
    path: '/transact/pricer',
    subItems: [
      { id: 'multi-model', label: 'Multi-Model Pricing', path: '/transact/pricer' },
      { id: 'greeks',      label: 'Greeks Dashboard',   path: '/transact/pricer/greeks' },
      { id: 'chain',       label: 'Option Chain',        path: '/transact/pricer/chain' },
      { id: 'capm',        label: 'CAPM Integration',    path: '/transact/pricer/capm' },
      { id: 'visualize',   label: 'Visualize',           path: '/transact/pricer/visualize' },
    ],
  },
  {
    id: 'portfolio',
    icon: '📊',
    label: 'Portfolio',
    path: '/transact/portfolio',
    subItems: [
      { id: 'builder',     label: 'Asset Universe',        path: '/transact/portfolio' },
      { id: 'moments',     label: 'Sample Moments',        path: '/transact/portfolio/moments' },
      { id: 'performance', label: 'Performance Appraisal', path: '/transact/portfolio/performance' },
      { id: 'stats',       label: 'Higher-Order Stats',    path: '/transact/portfolio/stats' },
      { id: 'attribution', label: 'Return Attribution',    path: '/transact/portfolio/attribution' },
    ],
  },
  {
    id: 'risk',
    icon: '🛡️',
    label: 'Risk',
    path: '/transact/risk',
    subItems: [
      { id: 'var',         label: 'VaR Calculator',     path: '/transact/risk' },
      { id: 'greeks-risk', label: 'Greeks Aggregation', path: '/transact/risk/greeks' },
      { id: 'covariance',  label: 'Covariance Health',  path: '/transact/risk/covariance' },
      { id: 'mst',         label: 'MST Graph',          path: '/transact/risk/mst' },
      { id: 'dashboard',   label: 'Risk Dashboard',     path: '/transact/risk/dashboard' },
    ],
  },
  {
    id: 'optimizer',
    icon: '🎛️',
    label: 'Optimizer',
    path: '/transact/optimizer',
    subItems: [
      { id: 'mvo',         label: 'Mean-Variance (MVO)',  path: '/transact/optimizer' },
      { id: 'blm',         label: 'Black-Litterman',      path: '/transact/optimizer/blm' },
      { id: 'cla',         label: 'Critical Line',        path: '/transact/optimizer/cla' },
      { id: 'kelly',       label: 'Kelly Criterion',      path: '/transact/optimizer/kelly' },
      { id: 'rp',          label: 'Risk Parity',          path: '/transact/optimizer/risk-parity' },
      { id: 'hrp',         label: 'Hierarchical RP',      path: '/transact/optimizer/hrp' },
      { id: 'compare',     label: 'Comparison',           path: '/transact/optimizer/compare' },
    ],
  },
  {
    id: 'volatility',
    icon: '🔬',
    label: 'Volatility Lab',
    path: '/transact/volatility',
    subItems: [
      { id: 'surface',      label: 'IV Surface',           path: '/transact/volatility' },
      { id: 'heston',       label: 'Heston Calibration',   path: '/transact/volatility/heston' },
      { id: 'hist-implied', label: 'Hist. vs Implied Vol', path: '/transact/volatility/hist-implied' },
      { id: 'decomp',       label: 'Vol Decomposition',    path: '/transact/volatility/decomposition' },
    ],
  },
  {
    id: 'factor',
    icon: '🧬',
    label: 'Factor Lab',
    path: '/transact/factor',
    subItems: [
      { id: 'models',     label: 'Factor Model Builder', path: '/transact/factor' },
      { id: 'fmb',        label: 'Fama-MacBeth',         path: '/transact/factor/fama-macbeth' },
      { id: 'smart-beta', label: 'Smart Beta',           path: '/transact/factor/smart-beta' },
      { id: 'herding',    label: 'Herding Risk Monitor', path: '/transact/factor/herding' },
      { id: 'ml',         label: 'ML Factor Discovery',  path: '/transact/factor/ml' },
    ],
  },
  {
    id: 'scenarios',
    icon: '🎯',
    label: 'Scenarios',
    path: '/transact/scenarios',
    subItems: [
      { id: 'definition',    label: 'Scenario Definition',  path: '/transact/scenarios' },
      { id: 'probabilistic', label: 'Probabilistic Opt.',   path: '/transact/scenarios/probabilistic' },
      { id: 'behavioral',    label: 'Behavioral Scenarios', path: '/transact/scenarios/behavioral' },
      { id: 'monte-carlo',   label: 'Monte Carlo Sim.',     path: '/transact/scenarios/monte-carlo' },
      { id: 'cov-stress',    label: 'Covariance Stress',    path: '/transact/scenarios/cov-stress' },
    ],
  },
  {
    id: 'blotter',
    icon: '📋',
    label: 'Blotter',
    path: '/transact/blotter',
    subItems: [
      { id: 'overview',    label: 'Chart Area (Overview)', path: '/transact/blotter' },
      { id: 'entry',       label: 'Trade Entry',           path: '/transact/blotter/entry' },
      { id: 'positions',   label: 'Position Monitor',      path: '/transact/blotter/positions' },
      { id: 'attribution', label: 'P&L Attribution',      path: '/transact/blotter/attribution' },
      { id: 'history',     label: 'Transaction History',  path: '/transact/blotter/history' },
      { id: 'export',      label: 'Export',               path: '/transact/blotter/export' },
    ],
  },
  {
    id: 'settings',
    icon: '⚙️',
    label: 'Settings',
    path: '/transact/settings',
  },
];
