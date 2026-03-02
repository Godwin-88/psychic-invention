import { useNavigate, useLocation } from 'react-router-dom';
import { ScenarioLabPhase4 } from '@/components/Scenarios/ScenarioLabPhase4';

const subTabs = [
  { id: 'definition',    label: 'Scenario Definition',  path: '/transact/scenarios' },
  { id: 'probabilistic', label: 'Probabilistic Opt.',   path: '/transact/scenarios/probabilistic' },
  { id: 'behavioral',    label: 'Behavioral',           path: '/transact/scenarios/behavioral' },
  { id: 'monte-carlo',   label: 'Monte Carlo',          path: '/transact/scenarios/monte-carlo' },
  { id: 'cov-stress',    label: 'Covariance Stress',    path: '/transact/scenarios/cov-stress' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-3xl">🎯</div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">Panel active</span>
  </div>
);

export const ScenariosWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  function getActiveTab() {
    if (location.pathname.includes('/probabilistic')) return 'probabilistic';
    if (location.pathname.includes('/behavioral'))    return 'behavioral';
    if (location.pathname.includes('/monte-carlo'))   return 'monte-carlo';
    if (location.pathname.includes('/cov-stress'))    return 'cov-stress';
    return 'definition';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🎯</span>
          <h1 className="text-2xl font-black text-white">Scenario Engine</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20">M1 · M3 · M4</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">Stress tests, probabilistic optimisation, behavioral scenarios, and Monte Carlo simulation</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'definition'    && <ScenarioLabPhase4 />}
        {activeTab === 'probabilistic' && (
          <PlaceholderPanel
            title="Probabilistic Scenario Optimisation"
            desc="Optimise portfolio weights across multiple market scenarios with probability-weighted objectives."
          />
        )}
        {activeTab === 'behavioral'    && (
          <PlaceholderPanel
            title="Behavioral Scenarios"
            desc="Model investor behaviour under stress: fear, greed, herding, and flight-to-quality scenarios."
          />
        )}
        {activeTab === 'monte-carlo'   && (
          <PlaceholderPanel
            title="Monte Carlo Portfolio Simulation"
            desc="Run thousands of simulated paths to estimate portfolio distributions and tail risk."
          />
        )}
        {activeTab === 'cov-stress'    && (
          <PlaceholderPanel
            title="Covariance Stress Testing"
            desc="Stress the covariance matrix: correlation shocks, volatility spikes, and regime changes."
          />
        )}
      </div>
    </div>
  );
};
