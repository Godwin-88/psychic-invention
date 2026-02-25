import { useNavigate, useLocation } from 'react-router-dom';
import { VolatilitySurfaceChart } from '@/components/VolatilitySurfaceChart';

const subTabs = [
  { id: 'surface',      label: 'IV Surface',           path: '/transact/volatility' },
  { id: 'heston',       label: 'Heston Calibration',   path: '/transact/volatility/heston' },
  { id: 'hist-implied', label: 'Hist. vs Implied Vol', path: '/transact/volatility/hist-implied' },
  { id: 'decomp',       label: 'Vol Decomposition',    path: '/transact/volatility/decomposition' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl">🔬</div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">Panel active</span>
  </div>
);

export const VolatilityWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  function getActiveTab() {
    if (location.pathname.includes('/heston'))       return 'heston';
    if (location.pathname.includes('/hist-implied')) return 'hist-implied';
    if (location.pathname.includes('/decomposition'))return 'decomp';
    return 'surface';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔬</span>
          <h1 className="text-2xl font-black text-white">Volatility Lab</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">DPE · M1 · M2</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">IV surface, Heston calibration, historical vs implied vol, and factor decomposition</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'surface'      && <VolatilitySurfaceChart />}
        {activeTab === 'heston'       && (
          <PlaceholderPanel
            title="Heston Model Calibration"
            desc="Calibrate Heston stochastic volatility parameters (κ, θ, σ, ρ, v₀) from market option prices."
          />
        )}
        {activeTab === 'hist-implied' && (
          <PlaceholderPanel
            title="Historical vs Implied Volatility"
            desc="Compare realised volatility with implied vol. Identify vol risk premium and term structure dynamics."
          />
        )}
        {activeTab === 'decomp'       && (
          <PlaceholderPanel
            title="Factor-Based Vol Decomposition"
            desc="Decompose portfolio volatility into systematic factor exposures and idiosyncratic components."
          />
        )}
      </div>
    </div>
  );
};
