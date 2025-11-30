import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';

const marketplaceCards = [
  {
    id: 'pricing',
    title: 'Options Pricing Workspace',
    description: 'Run institutional pricing on-demand with the Rust-backed API. Compare Black-Scholes vs FFT output and document the run.',
    cta: 'Open Workspace',
    href: '/workspace',
    tags: ['Black-Scholes', 'FFT', 'REST'],
  },
  {
    id: 'fft',
    title: 'Carr-Madan FFT Surface',
    description: 'Generate entire option chains in milliseconds. Tune frequency spacing, damping and the log-strike grid directly in UI.',
    cta: 'Generate Surface',
    href: '/fft',
    tags: ['Alpha control', 'n=4096', 'Surface'],
  },
  {
    id: 'risk',
    title: 'Risk & Scenario Deck',
    description: 'Aggregate Greeks, track VaR and prepare stress scenarios ready for automation hooks.',
    cta: 'Review Metrics',
    href: '/operations',
    tags: ['Delta/Gamma', 'VaR', 'Stress'],
  },
  {
    id: 'api',
    title: 'API Playground',
    description: 'Shareable request templates, Postman collection and curl snippets tied to the FastAPI backend.',
    cta: 'View Docs',
    href: '/api-playground',
    tags: ['Postman', 'FastAPI', 'Rust core'],
  },
];

export const MarketplaceStage = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding bg-dark-100 border-b border-slate-800">
      <div className="container">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3 font-semibold">Marketplace</p>
            <h2 className="text-3xl font-bold text-white mb-3">Curated workspaces for quants, traders and risk leads</h2>
            <p className="text-slate-300 max-w-2xl">
              Every card maps to a backend capability. Start with pricing tools, unlock FFT analytics,
              and graduate to the Processing Centre for automation.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="status-dot bg-warning"></span>
            <span>Authenticated access unlocks additional cards</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {marketplaceCards.map(card => (
            <div key={card.id} className="card flex flex-col justify-between border border-slate-700 hover:border-primary-500">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-3">{card.title}</h3>
                <p className="text-slate-300 mb-6">{card.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {card.tags.map(tag => (
                    <span key={tag} className="tag-pill">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  onClick={() => navigate(card.href)}
                >
                  {card.cta}
                </Button>
                <span className="text-xs text-slate-500 uppercase tracking-widest">Detail view available</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
