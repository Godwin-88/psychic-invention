import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { useHealthCheck } from '@/hooks/useApi';

const navLinks = [
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Workspace', to: '/workspace' },
  { label: 'Transact', to: '/transact' },
  { label: 'FFT Surface', to: '/fft' },
  { label: 'Ops Centre', to: '/operations' },
  { label: 'API', to: '/api-playground' },
];

export const Header = () => {
  const { isHealthy } = useHealthCheck();
  const navigate = useNavigate();

  return (
    <header className="bg-slate-950/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="container">
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              ⚡ <span className="glow-text">PricingEngine</span>
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Rust · FastAPI · React Dashboard</p>
          </div>

          <nav className="flex flex-wrap gap-4 text-sm text-slate-300">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `hover:text-primary-400 transition ${
                    isActive ? 'text-primary-300 font-semibold' : 'text-slate-300'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
              <span className={`status-dot ${isHealthy ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
              {isHealthy ? 'API LIVE' : 'API DOWN'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://github.com/Godwin-88/psychic-invention', '_blank')}
            >
              GitHub
            </Button>
            <Button size="sm" onClick={() => navigate('/workspace')}>
              Launch Workspace
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
