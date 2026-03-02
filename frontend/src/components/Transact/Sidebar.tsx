import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SubItem {
  id: string;
  label: string;
  path: string;
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  path: string;
  subItems?: SubItem[];
}

const menuItems: MenuItem[] = [
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
    ],
  },
  {
    id: 'portfolio',
    icon: '📊',
    label: 'Portfolio',
    path: '/transact/portfolio',
    subItems: [
      { id: 'builder',     label: 'Asset Universe',       path: '/transact/portfolio' },
      { id: 'moments',     label: 'Sample Moments',       path: '/transact/portfolio/moments' },
      { id: 'performance', label: 'Performance Appraisal',path: '/transact/portfolio/performance' },
      { id: 'stats',       label: 'Higher-Order Stats',   path: '/transact/portfolio/stats' },
      { id: 'attribution', label: 'Return Attribution',   path: '/transact/portfolio/attribution' },
    ],
  },
  {
    id: 'risk',
    icon: '🛡️',
    label: 'Risk',
    path: '/transact/risk',
    subItems: [
      { id: 'var',         label: 'VaR Calculator',        path: '/transact/risk' },
      { id: 'greeks-risk', label: 'Greeks Aggregation',    path: '/transact/risk/greeks' },
      { id: 'covariance',  label: 'Covariance Health',     path: '/transact/risk/covariance' },
      { id: 'dashboard',   label: 'Risk Dashboard',        path: '/transact/risk/dashboard' },
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
      { id: 'models',    label: 'Factor Model Builder',  path: '/transact/factor' },
      { id: 'fmb',       label: 'Fama-MacBeth',          path: '/transact/factor/fama-macbeth' },
      { id: 'smart-beta',label: 'Smart Beta',            path: '/transact/factor/smart-beta' },
      { id: 'herding',   label: 'Herding Risk Monitor',  path: '/transact/factor/herding' },
      { id: 'ml',        label: 'ML Factor Discovery',   path: '/transact/factor/ml' },
    ],
  },
  {
    id: 'scenarios',
    icon: '🎯',
    label: 'Scenarios',
    path: '/transact/scenarios',
    subItems: [
      { id: 'definition',    label: 'Scenario Definition',   path: '/transact/scenarios' },
      { id: 'probabilistic', label: 'Probabilistic Opt.',    path: '/transact/scenarios/probabilistic' },
      { id: 'behavioral',   label: 'Behavioral Scenarios',  path: '/transact/scenarios/behavioral' },
      { id: 'monte-carlo',  label: 'Monte Carlo Sim.',      path: '/transact/scenarios/monte-carlo' },
      { id: 'cov-stress',   label: 'Covariance Stress',     path: '/transact/scenarios/cov-stress' },
    ],
  },
  {
    id: 'blotter',
    icon: '📋',
    label: 'Blotter',
    path: '/transact/blotter',
    subItems: [
      { id: 'entry',       label: 'Trade Entry',         path: '/transact/blotter' },
      { id: 'positions',   label: 'Position Monitor',    path: '/transact/blotter/positions' },
      { id: 'attribution', label: 'P&L Attribution',     path: '/transact/blotter/attribution' },
      { id: 'history',     label: 'Transaction History', path: '/transact/blotter/history' },
      { id: 'export',      label: 'Export',              path: '/transact/blotter/export' },
    ],
  },
  {
    id: 'settings',
    icon: '⚙️',
    label: 'Settings',
    path: '/transact/settings',
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>(['pricer']);

  function isActive(path: string) {
    if (path === '/transact') return location.pathname === '/transact';
    return location.pathname.startsWith(path);
  }

  function toggleExpand(id: string) {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleMenuClick(item: MenuItem) {
    if (item.subItems) {
      if (collapsed) {
        onToggle();
        setExpandedItems([item.id]);
      } else {
        toggleExpand(item.id);
        navigate(item.path);
      }
    } else {
      navigate(item.path);
    }
  }

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-6 z-10 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center text-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Platform label */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-4 border-b border-slate-800">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Transact Platform</p>
        </div>
      )}
      {collapsed && <div className="h-14 border-b border-slate-800" />}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {menuItems.map(item => {
          const active = isActive(item.path);
          const expanded = expandedItems.includes(item.id) && !collapsed;

          return (
            <div key={item.id}>
              {/* Top-level item */}
              <button
                onClick={() => handleMenuClick(item)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mx-1.5 transition-all duration-150 text-left group ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-blue-600/15 text-blue-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                style={{ width: collapsed ? 'calc(100% - 12px)' : 'calc(100% - 12px)' }}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
                    {item.subItems && (
                      <span className={`text-xs transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                        ›
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Sub-items */}
              {!collapsed && item.subItems && expanded && (
                <div className="mt-0.5 mb-1 ml-4 pl-3 border-l border-slate-800 space-y-0.5">
                  {item.subItems.map(sub => {
                    const subActive = location.pathname === sub.path ||
                      (sub.path !== item.path && location.pathname.startsWith(sub.path));
                    return (
                      <button
                        key={sub.id}
                        onClick={() => navigate(sub.path)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                          subActive
                            ? 'text-blue-300 bg-blue-600/10 font-semibold'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Platform Active</span>
          </div>
        </div>
      )}
    </aside>
  );
};
