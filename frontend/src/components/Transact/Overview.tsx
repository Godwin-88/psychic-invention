import { useNavigate } from 'react-router-dom';

const modules = [
  {
    icon: '⚡', label: 'Derivatives Pricer', path: '/transact/pricer',
    desc: 'BS · FFT · Heston pricing with full Greeks', accent: 'blue',
    stats: [{ label: 'Models', value: '3' }, { label: 'Endpoints', value: '4' }],
  },
  {
    icon: '📊', label: 'Portfolio Analytics', path: '/transact/portfolio',
    desc: 'Multi-asset portfolio construction & appraisal', accent: 'indigo',
    stats: [{ label: 'Modules', value: '5' }, { label: 'Metrics', value: '20+' }],
  },
  {
    icon: '🛡️', label: 'Risk Management', path: '/transact/risk',
    desc: 'VaR/CVaR, Greeks aggregation, covariance health', accent: 'emerald',
    stats: [{ label: 'Risk Models', value: '3' }, { label: 'Dashboards', value: '4' }],
  },
  {
    icon: '🎛️', label: 'Portfolio Optimizer', path: '/transact/optimizer',
    desc: 'MVO, Black-Litterman, Kelly, Risk Parity, HRP', accent: 'violet',
    stats: [{ label: 'Algorithms', value: '6' }, { label: 'Constraints', value: '∞' }],
  },
  {
    icon: '🔬', label: 'Volatility Lab', path: '/transact/volatility',
    desc: 'IV surface, Heston calibration, vol decomposition', accent: 'cyan',
    stats: [{ label: 'Models', value: '2' }, { label: 'Surfaces', value: 'Live' }],
  },
  {
    icon: '🧬', label: 'Factor Lab', path: '/transact/factor',
    desc: 'Fama-MacBeth, smart beta, ML factor discovery', accent: 'amber',
    stats: [{ label: 'Methods', value: '5' }, { label: 'Factors', value: 'Custom' }],
  },
  {
    icon: '🎯', label: 'Scenario Engine', path: '/transact/scenarios',
    desc: 'Stress tests, Monte Carlo, behavioral scenarios', accent: 'rose',
    stats: [{ label: 'Scenario Types', value: '5' }, { label: 'Simulations', value: 'MC' }],
  },
  {
    icon: '📋', label: 'Trade Blotter', path: '/transact/blotter',
    desc: 'Trade entry, P&L tracking, attribution, export', accent: 'slate',
    stats: [{ label: 'Workflows', value: '5' }, { label: 'Formats', value: 'CSV/JSON' }],
  },
];

const accentHover: Record<string, string> = {
  blue:   'hover:border-blue-500/50 hover:bg-blue-500/5',
  indigo: 'hover:border-indigo-500/50 hover:bg-indigo-500/5',
  emerald:'hover:border-emerald-500/50 hover:bg-emerald-500/5',
  violet: 'hover:border-violet-500/50 hover:bg-violet-500/5',
  cyan:   'hover:border-cyan-500/50 hover:bg-cyan-500/5',
  amber:  'hover:border-amber-500/50 hover:bg-amber-500/5',
  rose:   'hover:border-rose-500/50 hover:bg-rose-500/5',
  slate:  'hover:border-slate-500/50 hover:bg-slate-500/5',
};

const accentText: Record<string, string> = {
  blue:   'text-blue-400', indigo: 'text-indigo-400', emerald: 'text-emerald-400',
  violet: 'text-violet-400', cyan: 'text-cyan-400', amber: 'text-amber-400',
  rose:   'text-rose-400', slate: 'text-slate-400',
};

export const Overview = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Platform Overview</p>
        <h1 className="text-4xl font-black text-white leading-tight">
          Transact{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Dashboard
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl">
          Institutional-grade quant tools. Select a module from the sidebar or the cards below.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Modules',     value: '8',   sub: 'All systems live'  },
          { label: 'Pricing Models',     value: '3',   sub: 'BS · FFT · Heston' },
          { label: 'Optimizers',         value: '6',   sub: 'MVO to HRP'        },
          { label: 'API Endpoints',      value: '20+', sub: 'FastAPI + Rust'     },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <p className="text-3xl font-black font-mono text-white">{s.value}</p>
            <p className="text-sm font-semibold text-slate-300 mt-1">{s.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-5">Workspaces</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {modules.map(m => (
            <button
              key={m.label}
              onClick={() => navigate(m.path)}
              className={`group p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left transition-all duration-200 hover:-translate-y-0.5 ${accentHover[m.accent]}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{m.icon}</span>
                <span className={`text-xs ${accentText[m.accent]} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Open →
                </span>
              </div>
              <p className="text-sm font-bold text-white mb-1">{m.label}</p>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{m.desc}</p>
              <div className="flex gap-3">
                {m.stats.map(s => (
                  <div key={s.label}>
                    <p className={`text-sm font-bold font-mono ${accentText[m.accent]}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick-start guides */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold text-white mb-4">Quick Start</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          {[
            { step: '01', title: 'Price a Derivative', desc: 'Go to Pricer → Multi-Model, enter parameters, compare BS vs FFT output.', path: '/transact/pricer' },
            { step: '02', title: 'Build a Portfolio', desc: 'Portfolio → Asset Universe to add tickers, then run Sample Moments.', path: '/transact/portfolio' },
            { step: '03', title: 'Optimise Weights', desc: 'Optimizer → MVO or Black-Litterman to generate efficient frontier weights.', path: '/transact/optimizer' },
          ].map(g => (
            <button key={g.step} onClick={() => navigate(g.path)} className="text-left p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
              <p className="text-xs font-black text-blue-500 mb-2">Step {g.step}</p>
              <p className="font-semibold text-white mb-1">{g.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
