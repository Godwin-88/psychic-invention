import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type Module = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'DPE';
type Category = 'Pricing' | 'Portfolio Management' | 'Risk Analytics' | 'Optimization' | 'Volatility' | 'Factor Analysis' | 'Scenarios' | 'Execution';
type Complexity = 'Basic' | 'Intermediate' | 'Advanced';

interface Offering {
  id: string;
  icon: string;
  title: string;
  description: string;
  tags: string[];
  modules: Module[];
  category: Category;
  complexity: Complexity;
  route: string;
  features: string[];
  accentColor: string;
}

const offerings: Offering[] = [
  {
    id: 'pricer',
    icon: '⚡',
    title: 'Derivatives Pricer',
    description: 'Multi-model derivatives pricing with Black-Scholes, FFT Carr-Madan, and Heston stochastic volatility. Full Greeks dashboard and option chain view.',
    tags: ['DPE', 'M1', 'M2'],
    modules: ['DPE', 'M1', 'M2'],
    category: 'Pricing',
    complexity: 'Advanced',
    route: '/transact/pricer',
    features: ['Black-Scholes', 'FFT Pricing', 'Heston Model', 'Greeks Dashboard', 'Option Chain'],
    accentColor: 'blue',
  },
  {
    id: 'portfolio',
    icon: '📊',
    title: 'Portfolio Analytics',
    description: 'Build and analyse multi-asset portfolios. Compute sample moments, performance metrics, higher-order statistics, and return attribution.',
    tags: ['M1', 'M2'],
    modules: ['M1', 'M2'],
    category: 'Portfolio Management',
    complexity: 'Intermediate',
    route: '/transact/portfolio',
    features: ['Asset Universe Builder', 'Sample Moments', 'Performance Appraisal', 'Return Attribution'],
    accentColor: 'indigo',
  },
  {
    id: 'risk',
    icon: '🛡️',
    title: 'Risk Management',
    description: 'Comprehensive risk analytics: parametric & historical VaR/CVaR, Greeks risk aggregation, covariance matrix health diagnostics.',
    tags: ['M1', 'M2', 'M7'],
    modules: ['M1', 'M2', 'M7'],
    category: 'Risk Analytics',
    complexity: 'Advanced',
    route: '/transact/risk',
    features: ['VaR / CVaR', 'Greeks Aggregation', 'Covariance Health', 'Risk Dashboard'],
    accentColor: 'emerald',
  },
  {
    id: 'optimizer',
    icon: '🎛️',
    title: 'Portfolio Optimizer',
    description: 'Institutional-grade optimization: Mean-Variance (MVO), Black-Litterman, Kelly Criterion, Risk Parity, and Hierarchical Risk Parity.',
    tags: ['M1', 'M3', 'M5', 'M7'],
    modules: ['M1', 'M3', 'M5', 'M7'],
    category: 'Optimization',
    complexity: 'Advanced',
    route: '/transact/optimizer',
    features: ['MVO', 'Black-Litterman', 'Kelly Criterion', 'Risk Parity', 'HRP'],
    accentColor: 'violet',
  },
  {
    id: 'volatility',
    icon: '🔬',
    title: 'Volatility Lab',
    description: 'Analyse implied volatility dynamics: IV surface generation, Heston model calibration, historical vs implied vol, and factor-based decomposition.',
    tags: ['DPE', 'M1', 'M2'],
    modules: ['DPE', 'M1', 'M2'],
    category: 'Volatility',
    complexity: 'Advanced',
    route: '/transact/volatility',
    features: ['IV Surface', 'Heston Calibration', 'Hist. vs Implied', 'Vol Decomposition'],
    accentColor: 'cyan',
  },
  {
    id: 'factor',
    icon: '🧬',
    title: 'Factor Lab',
    description: 'Quantitative factor research: factor model construction, Fama-MacBeth regression, smart beta strategies, herding risk, and ML factor discovery.',
    tags: ['M2', 'M6'],
    modules: ['M2', 'M6'],
    category: 'Factor Analysis',
    complexity: 'Advanced',
    route: '/transact/factor',
    features: ['Factor Models', 'Fama-MacBeth', 'Smart Beta', 'ML Factor Discovery'],
    accentColor: 'amber',
  },
  {
    id: 'scenarios',
    icon: '🎯',
    title: 'Scenario Engine',
    description: 'Robust scenario analysis: define stress scenarios, probabilistic portfolio optimization, behavioral scenarios, and Monte Carlo simulation.',
    tags: ['M1', 'M3', 'M4'],
    modules: ['M1', 'M3', 'M4'],
    category: 'Scenarios',
    complexity: 'Intermediate',
    route: '/transact/scenarios',
    features: ['Stress Testing', 'Monte Carlo', 'Probabilistic Opt.', 'Behavioral Scenarios'],
    accentColor: 'rose',
  },
  {
    id: 'blotter',
    icon: '📋',
    title: 'Trade Blotter',
    description: 'Full execution lifecycle: trade entry, real-time position monitoring, P&L tracking, performance attribution, and transaction history export.',
    tags: ['DPE', 'M1', 'M2'],
    modules: ['DPE', 'M1', 'M2'],
    category: 'Execution',
    complexity: 'Basic',
    route: '/transact/blotter',
    features: ['Trade Entry', 'Position Monitor', 'P&L Tracking', 'Attribution', 'Export'],
    accentColor: 'slate',
  },
];

const ALL_MODULES: Module[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'DPE'];
const ALL_CATEGORIES: Category[] = [
  'Pricing', 'Portfolio Management', 'Risk Analytics', 'Optimization',
  'Volatility', 'Factor Analysis', 'Scenarios', 'Execution',
];
const ALL_COMPLEXITIES: Complexity[] = ['Basic', 'Intermediate', 'Advanced'];

const accentMap: Record<string, string> = {
  blue:   'border-blue-500/40 group-hover:border-blue-500/70 shadow-blue-500/5',
  indigo: 'border-indigo-500/40 group-hover:border-indigo-500/70 shadow-indigo-500/5',
  emerald:'border-emerald-500/40 group-hover:border-emerald-500/70 shadow-emerald-500/5',
  violet: 'border-violet-500/40 group-hover:border-violet-500/70 shadow-violet-500/5',
  cyan:   'border-cyan-500/40 group-hover:border-cyan-500/70 shadow-cyan-500/5',
  amber:  'border-amber-500/40 group-hover:border-amber-500/70 shadow-amber-500/5',
  rose:   'border-rose-500/40 group-hover:border-rose-500/70 shadow-rose-500/5',
  slate:  'border-slate-500/40 group-hover:border-slate-500/70 shadow-slate-500/5',
};

const badgeMap: Record<string, string> = {
  blue:   'bg-blue-500/10 text-blue-300 border-blue-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  emerald:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  cyan:   'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  amber:  'bg-amber-500/10 text-amber-300 border-amber-500/20',
  rose:   'bg-rose-500/10 text-rose-300 border-rose-500/20',
  slate:  'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

const complexityColor: Record<Complexity, string> = {
  Basic:        'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Intermediate: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Advanced:     'bg-rose-500/10 text-rose-300 border-rose-500/20',
};

function FilterChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
        active
          ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/20'
          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

export const MarketplaceStage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeModules, setActiveModules] = useState<Module[]>([]);
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [activeComplexities, setActiveComplexities] = useState<Complexity[]>([]);

  function toggleModule(m: Module) {
    setActiveModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }
  function toggleCategory(c: Category) {
    setActiveCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }
  function toggleComplexity(c: Complexity) {
    setActiveComplexities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  const hasFilters = activeModules.length > 0 || activeCategories.length > 0 || activeComplexities.length > 0 || search.trim();

  function clearFilters() {
    setActiveModules([]);
    setActiveCategories([]);
    setActiveComplexities([]);
    setSearch('');
  }

  const filtered = useMemo(() => {
    return offerings.filter(o => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit = o.title.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.features.some(f => f.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (activeModules.length > 0 && !activeModules.some(m => o.modules.includes(m))) return false;
      if (activeCategories.length > 0 && !activeCategories.includes(o.category)) return false;
      if (activeComplexities.length > 0 && !activeComplexities.includes(o.complexity)) return false;
      return true;
    });
  }, [search, activeModules, activeCategories, activeComplexities]);

  return (
    <section className="section-padding bg-slate-950 border-b border-slate-800/60">
      <div className="container">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3 font-semibold">Marketplace</p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Quant Modules & Workspaces
              </h2>
              <p className="text-slate-400 max-w-2xl">
                Browse all {offerings.length} platform modules. Filter by knowledge source, category, or complexity.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>{filtered.length} of {offerings.length} modules shown</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-8 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search modules, features, strategies…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Module filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold mr-1 w-16 shrink-0">Module</span>
            {ALL_MODULES.map(m => (
              <FilterChip key={m} label={m} active={activeModules.includes(m)} onClick={() => toggleModule(m)} />
            ))}
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold mr-1 w-16 shrink-0">Category</span>
            {ALL_CATEGORIES.map(c => (
              <FilterChip key={c} label={c} active={activeCategories.includes(c)} onClick={() => toggleCategory(c)} />
            ))}
          </div>

          {/* Complexity filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold mr-1 w-16 shrink-0">Level</span>
            {ALL_COMPLEXITIES.map(c => (
              <FilterChip key={c} label={c} active={activeComplexities.includes(c)} onClick={() => toggleComplexity(c)} />
            ))}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
              >
                Clear filters ✕
              </button>
            )}
          </div>
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-slate-300 font-semibold text-lg">No modules match your filters</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting or clearing the filters above</p>
            <button onClick={clearFilters} className="mt-4 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filtered.map(offering => (
              <div
                key={offering.id}
                className={`group relative flex flex-col rounded-2xl bg-slate-900/70 border shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${accentMap[offering.accentColor]}`}
              >
                {/* Top accent line */}
                <div className={`h-0.5 w-full bg-gradient-to-r ${
                  offering.accentColor === 'blue' ? 'from-blue-600 to-blue-400' :
                  offering.accentColor === 'indigo' ? 'from-indigo-600 to-indigo-400' :
                  offering.accentColor === 'emerald' ? 'from-emerald-600 to-emerald-400' :
                  offering.accentColor === 'violet' ? 'from-violet-600 to-violet-400' :
                  offering.accentColor === 'cyan' ? 'from-cyan-600 to-cyan-400' :
                  offering.accentColor === 'amber' ? 'from-amber-600 to-amber-400' :
                  offering.accentColor === 'rose' ? 'from-rose-600 to-rose-400' :
                  'from-slate-600 to-slate-400'
                } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="p-6 flex flex-col flex-1">
                  {/* Icon + complexity */}
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{offering.icon}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${complexityColor[offering.complexity]}`}>
                      {offering.complexity}
                    </span>
                  </div>

                  {/* Title + description */}
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug">{offering.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-1">{offering.description}</p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {offering.features.slice(0, 3).map(f => (
                      <span key={f} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        {f}
                      </span>
                    ))}
                    {offering.features.length > 3 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-500 border border-slate-700">
                        +{offering.features.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Module tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {offering.tags.map(tag => (
                      <span key={tag} className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeMap[offering.accentColor]}`}>
                        {tag}
                      </span>
                    ))}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-800/60 text-slate-400 border-slate-700">
                      {offering.category}
                    </span>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => navigate(offering.route)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      offering.accentColor === 'blue'   ? 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 hover:border-blue-500' :
                      offering.accentColor === 'indigo' ? 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500' :
                      offering.accentColor === 'emerald'? 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-500' :
                      offering.accentColor === 'violet' ? 'bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 hover:border-violet-500' :
                      offering.accentColor === 'cyan'   ? 'bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-500' :
                      offering.accentColor === 'amber'  ? 'bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 hover:border-amber-500' :
                      offering.accentColor === 'rose'   ? 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500' :
                      'bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600'
                    }`}
                  >
                    Open Workspace →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
