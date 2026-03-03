/**
 * LandingStage — Full landing page
 *
 * Structure:
 *   1. Hero section — platform-wide CTA
 *   2. Per-menu sections — one per module (8 total)
 *   3. Target Users section
 *
 * Each section has: one-liner CTA + "Explore Marketplace" + "Login to Access" buttons.
 */
import { useNavigate } from 'react-router-dom';
import { useHealthCheck, usePerformanceMetrics } from '@/hooks/useApi';
import { MENU_ITEMS } from '@/data/marketplaceData';

const accentGradient: Record<string, string> = {
  blue:    'from-blue-600/10 to-transparent',
  indigo:  'from-indigo-600/10 to-transparent',
  emerald: 'from-emerald-600/10 to-transparent',
  violet:  'from-violet-600/10 to-transparent',
  cyan:    'from-cyan-600/10 to-transparent',
  amber:   'from-amber-600/10 to-transparent',
  rose:    'from-rose-600/10 to-transparent',
  slate:   'from-slate-600/10 to-transparent',
};

const accentText: Record<string, string> = {
  blue: 'text-blue-300', indigo: 'text-indigo-300', emerald: 'text-emerald-300',
  violet: 'text-violet-300', cyan: 'text-cyan-300', amber: 'text-amber-300',
  rose: 'text-rose-300', slate: 'text-slate-300',
};

const accentBorder: Record<string, string> = {
  blue: 'border-blue-500/30', indigo: 'border-indigo-500/30', emerald: 'border-emerald-500/30',
  violet: 'border-violet-500/30', cyan: 'border-cyan-500/30', amber: 'border-amber-500/30',
  rose: 'border-rose-500/30', slate: 'border-slate-500/30',
};

const accentBg: Record<string, string> = {
  blue: 'bg-blue-500/10', indigo: 'bg-indigo-500/10', emerald: 'bg-emerald-500/10',
  violet: 'bg-violet-500/10', cyan: 'bg-cyan-500/10', amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10', slate: 'bg-slate-500/10',
};

const TARGET_USERS = [
  {
    role: 'Portfolio Manager',
    icon: '📊',
    desc: 'Allocate capital with MVO, BL, HRP — benchmark-relative attribution and drawdown analytics.',
  },
  {
    role: 'Quant Analyst / Developer',
    icon: '🧮',
    desc: 'Rust-powered pricing engine (FFT, Heston), factor models, Fama-MacBeth, and full API access.',
  },
  {
    role: 'Risk Manager',
    icon: '🛡️',
    desc: 'Multi-method VaR/CVaR, Greeks aggregation, covariance health diagnostics, Basel III dashboard.',
  },
  {
    role: 'Derivatives Trader',
    icon: '⚡',
    desc: 'Live option chain with Greeks, implied vol surface, Heston calibration, and delta-adjusted CAPM.',
  },
  {
    role: 'Research Analyst',
    icon: '🔬',
    desc: 'Factor lab: Fama-MacBeth premia, smart beta, crowding index, scenario engine for regime analysis.',
  },
  {
    role: 'Academic / Student',
    icon: '🎓',
    desc: 'Interactive exploration of all WQU M1–M7 formulas with live market data and visual outputs.',
  },
];

export const LandingStage = () => {
  const { isHealthy } = useHealthCheck();
  const metrics = usePerformanceMetrics();
  const navigate = useNavigate();

  return (
    <div className="bg-slate-950">

      {/* ─── 1. Hero ──────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950" />
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-indigo-700/6 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container py-24 grid gap-16 lg:grid-cols-2 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 w-fit">
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
                Institutional-Grade Quant Platform
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.08] tracking-tight">
                Quantitative
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400">
                  Trading Suite
                </span>
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed max-w-lg">
                Eight production-grade quant modules — Rust core pricing engine, portfolio analytics, risk management, optimizers, volatility lab, factor research, and scenario analysis.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/marketplace')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0">
                Explore Marketplace →
              </button>
              <button onClick={() => navigate('/transact')}
                className="px-8 py-4 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200">
                Login to Access
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Rust Core', 'PyO3 Bindings', 'FastAPI', 'React 18', 'yfinance', 'BS · FFT · Heston'].map(tech => (
                <span key={tech} className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-full">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Right — status + module grid */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">System Status</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className={`text-sm font-semibold ${isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isHealthy ? 'All Systems Operational' : 'Service Degraded'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl bg-slate-800/60">
                  <p className="text-2xl font-black font-mono text-blue-300">{metrics.calculationsServed.toLocaleString()}+</p>
                  <p className="text-xs text-slate-500 mt-1">Calculations</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-800/60">
                  <p className="text-2xl font-black font-mono text-emerald-300">{metrics.avgResponseTime}ms</p>
                  <p className="text-xs text-slate-500 mt-1">Avg Latency</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-800/60">
                  <p className="text-2xl font-black font-mono text-indigo-300">99.9%</p>
                  <p className="text-xs text-slate-500 mt-1">Uptime SLA</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {MENU_ITEMS.slice(0, 6).map(item => (
                <button key={item.id} onClick={() => navigate(`/marketplace/${item.id}`)}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-200 text-left group">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Per-module sections ───────────────────────────────────── */}
      {MENU_ITEMS.map((item, idx) => {
        const isEven = idx % 2 === 0;
        return (
          <section key={item.id} className={`relative overflow-hidden border-b border-slate-800/60 py-20`}>
            <div className={`absolute inset-0 bg-gradient-to-${isEven ? 'r' : 'l'} ${accentGradient[item.accentColor]}`} />
            <div className="relative container">
              <div className={`grid lg:grid-cols-2 gap-12 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}
                style={isEven ? {} : {}}>

                {/* Content side */}
                <div className={isEven ? '' : 'lg:order-2'}>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${accentBg[item.accentColor]} ${accentText[item.accentColor]} ${accentBorder[item.accentColor]}`}>
                      {item.category}
                    </span>
                    <span className="text-slate-600 text-xs">•</span>
                    <span className="text-xs text-slate-500 font-medium">{item.complexity}</span>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">{item.icon}</span>
                    <h2 className="text-3xl font-black text-white">{item.title}</h2>
                  </div>

                  <p className={`text-xl font-semibold ${accentText[item.accentColor]} mb-4 leading-relaxed`}>
                    {item.tagline}
                  </p>

                  <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-lg">
                    {item.overview.body.slice(0, 180)}…
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {item.targetUsers.map(u => (
                      <span key={u} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${accentBg[item.accentColor]} ${accentText[item.accentColor]} ${accentBorder[item.accentColor]}`}>
                        {u}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => navigate('/marketplace')}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${accentBg[item.accentColor]} ${accentText[item.accentColor]} ${accentBorder[item.accentColor]} hover:opacity-80`}>
                      Explore Marketplace
                    </button>
                    <button
                      onClick={() => navigate('/transact')}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-all">
                      Login to Access
                    </button>
                  </div>
                </div>

                {/* Feature pills side */}
                <div className={`space-y-3 ${isEven ? '' : 'lg:order-1'}`}>
                  {item.overview.capabilities.slice(0, 5).map((cap, ci) => (
                    <div key={ci} className={`flex items-center gap-3 p-4 rounded-xl border ${accentBorder[item.accentColor]} bg-slate-900/50`}>
                      <span className={`text-xs font-bold tabular-nums w-5 text-center ${accentText[item.accentColor]}`}>{(ci + 1).toString().padStart(2, '0')}</span>
                      <span className="text-sm text-slate-300">{cap}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate(`/marketplace/${item.id}`)}
                    className={`w-full p-4 rounded-xl border ${accentBorder[item.accentColor]} ${accentBg[item.accentColor]} text-sm ${accentText[item.accentColor]} font-semibold hover:opacity-80 transition-all`}>
                    View Full Details & Formulas →
                  </button>
                </div>

              </div>
            </div>
          </section>
        );
      })}

      {/* ─── 3. Target Users section ─────────────────────────────────── */}
      <section className="py-24 border-b border-slate-800/60 bg-slate-900/30">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3 font-semibold">Who is this for?</p>
            <h2 className="text-3xl font-bold text-white mb-3">Built for Quantitative Professionals</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              Every module is designed to meet the rigorous demands of institutional-grade finance, from front-office trading desks to academic research.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TARGET_USERS.map(u => (
              <div key={u.role} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all duration-200">
                <div className="text-3xl mb-4">{u.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{u.role}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center flex flex-wrap gap-4 justify-center">
            <button onClick={() => navigate('/marketplace')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0">
              Explore All Modules →
            </button>
            <button onClick={() => navigate('/transact')}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 hover:border-slate-600 transition-all">
              Login to Access
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
