import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { menuItems, type SubItem } from './navConfig';
import { useSelectedAssets } from '@/context/SelectedAssetsContext';

function getBreadcrumb(pathname: string): string[] {
  const segments = pathname.replace(/^\/transact\/?/, '').split('/').filter(Boolean);
  const labels: Record<string, string> = {
    pricer: 'Pricer', portfolio: 'Portfolio', risk: 'Risk',
    optimizer: 'Optimizer', volatility: 'Volatility Lab',
    factor: 'Factor Lab', scenarios: 'Scenarios', blotter: 'Blotter',
    settings: 'Settings', greeks: 'Greeks Dashboard', chain: 'Option Chain',
    capm: 'CAPM Integration', moments: 'Sample Moments', performance: 'Performance',
    stats: 'Higher-Order Stats', attribution: 'Attribution', dashboard: 'Dashboard',
    covariance: 'Covariance Health', mst: 'MST Graph', blm: 'Black-Litterman', cla: 'Critical Line',
    kelly: 'Kelly Criterion', 'risk-parity': 'Risk Parity', hrp: 'HRP', compare: 'Comparison',
    heston: 'Heston Calibration', 'hist-implied': 'Hist. vs Implied', decomposition: 'Decomposition',
    'fama-macbeth': 'Fama-MacBeth', 'smart-beta': 'Smart Beta', herding: 'Herding Risk', ml: 'ML Discovery',
    probabilistic: 'Probabilistic Opt.', behavioral: 'Behavioral', 'monte-carlo': 'Monte Carlo',
    'cov-stress': 'Covariance Stress', positions: 'Positions', history: 'History', export: 'Export',
    visualize: 'Visualize',
  };
  return ['Transact', ...segments.map(s => labels[s] ?? s)];
}

export const TransactLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [subPanelCollapsed, setSubPanelCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedAssets } = useSelectedAssets();
  const breadcrumb = getBreadcrumb(location.pathname);

  // Resolve the active top-level menu item
  const activeMenuItem = menuItems.find(item => {
    if (item.path === '/transact') return location.pathname === '/transact';
    return location.pathname.startsWith(item.path);
  });

  // Determine whether a sub-item is currently active.
  // The "default" sub-item (same path as its parent) is active only when
  // no deeper sub-item path matches the current URL.
  function isSubItemActive(sub: SubItem): boolean {
    if (!activeMenuItem) return false;
    if (sub.path === activeMenuItem.path) {
      return !activeMenuItem.subItems?.some(
        s => s.path !== activeMenuItem.path && location.pathname.startsWith(s.path)
      );
    }
    return location.pathname.startsWith(sub.path);
  }

  const hasSubPanel = !!(activeMenuItem?.subItems?.length);

  return (
    <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* ── Secondary sub-nav panel ────────────────────────────────────── */}
      {hasSubPanel && (
        <div
          className={`relative shrink-0 flex flex-col bg-slate-900/50 border-r border-slate-800/60 overflow-hidden transition-all duration-300 ease-in-out ${
            subPanelCollapsed ? 'w-8' : 'w-48'
          }`}
        >
          {/* Collapse/expand toggle — always visible */}
          <button
            onClick={() => setSubPanelCollapsed(prev => !prev)}
            className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center text-xs"
            title={subPanelCollapsed ? 'Expand sub-menu' : 'Collapse sub-menu'}
          >
            {subPanelCollapsed ? '›' : '‹'}
          </button>

          {!subPanelCollapsed && (
            <>
              {/* Panel header */}
              <div className="px-4 pt-5 pb-3 border-b border-slate-800/60 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{activeMenuItem!.icon}</span>
                  <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest truncate">
                    {activeMenuItem!.label}
                  </p>
                </div>
              </div>

              {/* Sub-item list */}
              <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
                {activeMenuItem!.subItems!.map(sub => {
                  const active = isSubItemActive(sub);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => navigate(sub.path)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 border-l-2 ${
                        active
                          ? 'text-white font-semibold bg-blue-600/15 border-blue-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </div>
      )}

      {/* ── Main workspace ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Selected-assets context bar */}
        <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-800/40 bg-slate-900/20 shrink-0">
          <span className="text-xs text-slate-500 uppercase tracking-wider">
            {selectedAssets.length > 0
              ? `Analyzing ${selectedAssets.map((a) => a.symbol).join(', ')}`
              : 'Select up to 5 assets in the header to run analytics'}
          </span>
        </div>

        {/* Breadcrumb */}
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
