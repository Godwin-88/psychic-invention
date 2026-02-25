import { useNavigate, useLocation } from 'react-router-dom';
import { EfficientFrontierChart } from '@/components/Optimizer/EfficientFrontierChart';
import { OptimizerPhase2 } from '@/components/Optimizer/OptimizerPhase2';

const subTabs = [
  { id: 'mvo',         label: 'MVO',             path: '/transact/optimizer' },
  { id: 'blm',         label: 'Black-Litterman', path: '/transact/optimizer/blm' },
  { id: 'cla',         label: 'Critical Line',   path: '/transact/optimizer/cla' },
  { id: 'kelly',       label: 'Kelly Criterion', path: '/transact/optimizer/kelly' },
  { id: 'risk-parity', label: 'Risk Parity',     path: '/transact/optimizer/risk-parity' },
  { id: 'hrp',         label: 'HRP',             path: '/transact/optimizer/hrp' },
  { id: 'compare',     label: 'Comparison',      path: '/transact/optimizer/compare' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl">🎛️</div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">Panel active</span>
  </div>
);

export const OptimizerWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  function getActiveTab() {
    if (location.pathname.includes('/blm'))         return 'blm';
    if (location.pathname.includes('/cla'))         return 'cla';
    if (location.pathname.includes('/kelly'))       return 'kelly';
    if (location.pathname.includes('/risk-parity')) return 'risk-parity';
    if (location.pathname.includes('/hrp'))         return 'hrp';
    if (location.pathname.includes('/compare'))     return 'compare';
    return 'mvo';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🎛️</span>
          <h1 className="text-2xl font-black text-white">Portfolio Optimizer</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">M1 · M3 · M5 · M7</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">MVO, Black-Litterman, Kelly Criterion, Risk Parity, and Hierarchical Risk Parity</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'mvo'         && (
          <div className="space-y-6">
            <EfficientFrontierChart />
            <OptimizerPhase2 />
          </div>
        )}
        {activeTab === 'blm'         && (
          <PlaceholderPanel
            title="Black-Litterman Model"
            desc="Incorporate investor views into equilibrium returns for a more robust allocation."
          />
        )}
        {activeTab === 'cla'         && (
          <PlaceholderPanel
            title="Critical Line Algorithm"
            desc="Exact analytical solution to the mean-variance frontier via the critical line method."
          />
        )}
        {activeTab === 'kelly'       && (
          <PlaceholderPanel
            title="Kelly Criterion"
            desc="Maximise long-run geometric growth with full and fractional Kelly position sizing."
          />
        )}
        {activeTab === 'risk-parity' && (
          <PlaceholderPanel
            title="Risk Parity"
            desc="Equal risk contribution portfolio construction with leverage and volatility targeting."
          />
        )}
        {activeTab === 'hrp'         && (
          <PlaceholderPanel
            title="Hierarchical Risk Parity"
            desc="Graph-theory–based asset clustering and recursive bisection for stable allocation."
          />
        )}
        {activeTab === 'compare'     && (
          <PlaceholderPanel
            title="Optimizer Comparison"
            desc="Side-by-side comparison of MVO, BLM, Kelly, Risk Parity, and HRP allocations."
          />
        )}
      </div>
    </div>
  );
};
