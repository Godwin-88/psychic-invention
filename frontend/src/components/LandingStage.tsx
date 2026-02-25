import { useNavigate } from 'react-router-dom';
import { useHealthCheck, usePerformanceMetrics } from '@/hooks/useApi';

const capabilities = [
  { icon: '⚡', label: 'Derivatives Pricer', desc: 'BS · FFT · Heston', route: '/transact/pricer' },
  { icon: '📊', label: 'Portfolio Analytics', desc: 'MVO · Black-Litterman', route: '/transact/portfolio' },
  { icon: '🛡️', label: 'Risk Management', desc: 'VaR · CVaR · Greeks', route: '/transact/risk' },
  { icon: '🔬', label: 'Volatility Lab', desc: 'IV Surface · Heston Cal.', route: '/transact/volatility' },
  { icon: '🧬', label: 'Factor Lab', desc: 'Fama-MacBeth · Smart Beta', route: '/transact/factor' },
  { icon: '🎯', label: 'Scenario Engine', desc: 'Stress · Monte Carlo', route: '/transact/scenarios' },
];

const endpoints = [
  { method: 'POST', path: '/price/call/bs', badge: 'Analytical' },
  { method: 'POST', path: '/price/call/fft', badge: 'FFT Surface' },
  { method: 'GET',  path: '/market/snapshot', badge: 'Real-time' },
  { method: 'POST', path: '/portfolio/optimize', badge: 'MVO / BLM' },
];

export const LandingStage = () => {
  const { isHealthy } = useHealthCheck();
  const metrics = usePerformanceMetrics();
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-950">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-indigo-700/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[30%] right-[30%] w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative container py-24 grid gap-16 lg:grid-cols-2 items-center">
        {/* ── Left column ── */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 w-fit">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
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
              Full-stack derivatives platform — Rust pricing engine, portfolio analytics,
              risk management, optimizer, volatility lab, and AI-powered factor models.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/transact')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              Launch Platform →
            </button>
            <button
              onClick={() => navigate('/marketplace')}
              className="px-8 py-4 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200"
            >
              Browse Modules
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Rust Core', 'PyO3 Bindings', 'FastAPI', 'React 18', 'Tailwind CSS', 'BS · FFT · Heston'].map(tech => (
              <span
                key={tech}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Status card */}
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
                <p className="text-2xl font-black font-mono text-blue-300">
                  {metrics.calculationsServed.toLocaleString()}+
                </p>
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

          {/* Capabilities grid */}
          <div className="grid grid-cols-2 gap-3">
            {capabilities.map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-200 text-left group"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </button>
            ))}
          </div>

          {/* API strip */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 font-mono text-xs">
            <p className="text-slate-500 uppercase tracking-widest mb-3">Live API Endpoints</p>
            <div className="space-y-1.5">
              {endpoints.map(ep => (
                <div key={ep.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 text-[10px] font-bold w-8">{ep.method}</span>
                    <span className="text-slate-300">{ep.path}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">{ep.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
