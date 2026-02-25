import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

function getBreadcrumb(pathname: string): string[] {
  const segments = pathname.replace(/^\/transact\/?/, '').split('/').filter(Boolean);
  const labels: Record<string, string> = {
    pricer: 'Pricer', portfolio: 'Portfolio', risk: 'Risk',
    optimizer: 'Optimizer', volatility: 'Volatility Lab',
    factor: 'Factor Lab', scenarios: 'Scenarios', blotter: 'Blotter',
    settings: 'Settings', greeks: 'Greeks Dashboard', chain: 'Option Chain',
    capm: 'CAPM Integration', moments: 'Sample Moments', performance: 'Performance',
    stats: 'Higher-Order Stats', attribution: 'Attribution', dashboard: 'Dashboard',
    covariance: 'Covariance Health', blm: 'Black-Litterman', cla: 'Critical Line',
    kelly: 'Kelly Criterion', 'risk-parity': 'Risk Parity', hrp: 'HRP', compare: 'Comparison',
    heston: 'Heston Calibration', 'hist-implied': 'Hist. vs Implied', decomposition: 'Decomposition',
    'fama-macbeth': 'Fama-MacBeth', 'smart-beta': 'Smart Beta', herding: 'Herding Risk', ml: 'ML Discovery',
    probabilistic: 'Probabilistic Opt.', behavioral: 'Behavioral', 'monte-carlo': 'Monte Carlo',
    'cov-stress': 'Covariance Stress', positions: 'Positions', history: 'History', export: 'Export',
  };
  return ['Transact', ...segments.map(s => labels[s] ?? s)];
}

export const TransactLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const breadcrumb = getBreadcrumb(location.pathname);

  return (
    <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* Main workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Breadcrumb bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 shrink-0">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-700">›</span>}
              {i === breadcrumb.length - 1 ? (
                <span className="text-sm font-semibold text-white">{crumb}</span>
              ) : (
                <button
                  onClick={() => i === 0 ? navigate('/transact') : undefined}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {crumb}
                </button>
              )}
            </span>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
