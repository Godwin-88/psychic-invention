import { useNavigate, useLocation } from 'react-router-dom';
import { FactorLabPhase3 } from '@/components/FactorLab/FactorLabPhase3';

const subTabs = [
  { id: 'models',     label: 'Factor Models',       path: '/transact/factor' },
  { id: 'fmb',        label: 'Fama-MacBeth',        path: '/transact/factor/fama-macbeth' },
  { id: 'smart-beta', label: 'Smart Beta',          path: '/transact/factor/smart-beta' },
  { id: 'herding',    label: 'Herding Risk',        path: '/transact/factor/herding' },
  { id: 'ml',         label: 'ML Factor Discovery', path: '/transact/factor/ml' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">🧬</div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">Panel active</span>
  </div>
);

export const FactorWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  function getActiveTab() {
    if (location.pathname.includes('/fama-macbeth')) return 'fmb';
    if (location.pathname.includes('/smart-beta'))   return 'smart-beta';
    if (location.pathname.includes('/herding'))      return 'herding';
    if (location.pathname.includes('/ml'))           return 'ml';
    return 'models';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🧬</span>
          <h1 className="text-2xl font-black text-white">Factor Lab</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">M2 · M6</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">Factor model construction, Fama-MacBeth, smart beta strategies, and ML factor discovery</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'models'     && <FactorLabPhase3 />}
        {activeTab === 'fmb'        && (
          <PlaceholderPanel
            title="Fama-MacBeth Regression"
            desc="Two-pass cross-sectional regression for factor risk premia estimation across time series."
          />
        )}
        {activeTab === 'smart-beta' && (
          <PlaceholderPanel
            title="Smart Beta Construction"
            desc="Build factor-tilted indices: value, momentum, quality, low-volatility, and size strategies."
          />
        )}
        {activeTab === 'herding'    && (
          <PlaceholderPanel
            title="Herding Risk Monitor"
            desc="Detect crowding in factor exposures and monitor herd behaviour risk in portfolio construction."
          />
        )}
        {activeTab === 'ml'         && (
          <PlaceholderPanel
            title="ML Factor Discovery"
            desc="Use PCA, autoencoders, and regularised regression to discover latent risk factors from data."
          />
        )}
      </div>
    </div>
  );
};
