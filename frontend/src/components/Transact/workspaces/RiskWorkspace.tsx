import { useNavigate, useLocation } from 'react-router-dom';
import { VaRDashboard } from '@/components/Risk/VaRDashboard';

const subTabs = [
  { id: 'var',        label: 'VaR Calculator',     path: '/transact/risk' },
  { id: 'greeks',     label: 'Greeks Aggregation', path: '/transact/risk/greeks' },
  { id: 'covariance', label: 'Covariance Health',  path: '/transact/risk/covariance' },
  { id: 'dashboard',  label: 'Risk Dashboard',     path: '/transact/risk/dashboard' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl">🛡️</div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">Panel active</span>
  </div>
);

export const RiskWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  function getActiveTab() {
    if (location.pathname.includes('/greeks'))     return 'greeks';
    if (location.pathname.includes('/covariance')) return 'covariance';
    if (location.pathname.includes('/dashboard'))  return 'dashboard';
    return 'var';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-2xl font-black text-white">Risk Management</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">M1 · M2 · M7</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">VaR/CVaR, Greeks aggregation, and covariance matrix health diagnostics</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'var'        && <VaRDashboard />}
        {activeTab === 'greeks'     && (
          <PlaceholderPanel
            title="Greeks Risk Aggregation"
            desc="Portfolio-level Delta, Gamma, Vega, and Theta aggregation with net exposure summaries."
          />
        )}
        {activeTab === 'covariance' && (
          <PlaceholderPanel
            title="Covariance Matrix Health"
            desc="Positive-definiteness tests, condition number, eigenvalue spectrum, and shrinkage diagnostics."
          />
        )}
        {activeTab === 'dashboard'  && (
          <PlaceholderPanel
            title="Risk Dashboard Summary"
            desc="Consolidated risk metrics: VaR, CVaR, max drawdown, Sharpe, Sortino, and Greeks exposure."
          />
        )}
      </div>
    </div>
  );
};
