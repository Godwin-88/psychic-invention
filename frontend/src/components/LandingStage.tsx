import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { useHealthCheck, usePerformanceMetrics } from '@/hooks/useApi';

const highlights = [
  { label: 'Models Online', value: 'Black-Scholes · FFT' },
  { label: 'Rust Core', value: 'PyO3 bindings, maturin build' },
  { label: 'API Surface', value: '4 pricing endpoints' },
];

export const LandingStage = () => {
  const { isHealthy } = useHealthCheck();
  const metrics = usePerformanceMetrics();
  const navigate = useNavigate();

  return (
    <section className="section-padding bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800">
      <div className="container grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3 font-semibold">Platform overview</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            Wall Street grade pricing, packaged for real teams.
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Surface the Rust pricing engine through a product-ready interface. Benchmark models,
            impress stakeholders, and route trades faster than legacy desks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Button size="lg" className="flex-1 sm:flex-none" onClick={() => navigate('/workspace')}>
              Launch Pricing Workspace
            </Button>
            <Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <span className="text-slate-400 text-xs uppercase tracking-widest">API Health</span>
              <div className="flex items-center mt-2 space-x-2">
                <span className={`status-dot ${isHealthy ? 'bg-success' : 'bg-danger'}`}></span>
                <p className="text-lg font-semibold">{isHealthy ? 'Live' : 'Offline'}</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">FastAPI + PyO3 bindings</p>
            </div>
            <div className="stat-card">
              <span className="text-slate-400 text-xs uppercase tracking-widest">Calculations Served</span>
              <p className="text-3xl font-mono text-primary-300 mt-2">{metrics.calculationsServed.toLocaleString()}+</p>
              <p className="text-xs text-slate-500 mt-2">Synthetic live feed</p>
            </div>
            <div className="stat-card">
              <span className="text-slate-400 text-xs uppercase tracking-widest">SLA / Avg latency</span>
              <p className="text-3xl font-mono text-success mt-2">99.9% / {metrics.avgResponseTime}ms</p>
              <p className="text-xs text-slate-500 mt-2">Black-Scholes endpoint</p>
            </div>
          </div>
        </div>

        <div className="card bg-dark-200 shadow-2xl border-primary-700/20">
          <p className="text-xs uppercase tracking-[0.3em] text-primary-300 mb-4 font-semibold">API snapshot</p>
          <div className="space-y-4 text-sm font-mono">
            <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">REST endpoints</p>
              <ul className="space-y-2">
                <li className="flex items-center justify-between text-slate-200">
                  <span>POST /price/call/bs</span>
                  <span className="text-primary-400">Analytical</span>
                </li>
                <li className="flex items-center justify-between text-slate-200">
                  <span>POST /price/put/bs</span>
                  <span className="text-primary-400">Parity</span>
                </li>
                <li className="flex items-center justify-between text-slate-200">
                  <span>POST /price/call/fft</span>
                  <span className="text-gold text-sm">Surface</span>
                </li>
                <li className="flex items-center justify-between text-slate-200">
                  <span>POST /price/put/fft</span>
                  <span className="text-gold text-sm">Surface</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">Highlights</p>
              <ul className="space-y-2 text-slate-200">
                {highlights.map((item) => (
                  <li key={item.label} className="flex items-center justify-between">
                    <span className="text-slate-400">{item.label}</span>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest">User journey</p>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Overview</span>
                <span>Marketplace</span>
                <span>Workspace</span>
                <span>Operations</span>
              </div>
              <div className="relative mt-2 h-1 bg-slate-700 rounded-full">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Navigate with the header or marketplace cards to dive deeper.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
