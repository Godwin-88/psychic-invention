import { Button } from './Button';
import { useHealthCheck } from '@/hooks/useApi';

export const Header = () => {
  const { isHealthy } = useHealthCheck();

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="container">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white">
              ⚡ <span className="glow-text">PricingEngine</span>
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-slate-300 hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors">
              Models
            </a>
            <a href="#demo" className="text-slate-300 hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors">
              Live Demo
            </a>
            <a href="https://github.com/Godwin-88/psychic-invention" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors">
              GitHub
            </a>
          </nav>

          {/* Status & CTA */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isHealthy ? 'bg-success animate-pulse' : 'bg-danger'}`}></div>
              <span className="text-sm text-slate-300 font-mono">
                {isHealthy ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <Button variant="outline" size="sm">Login</Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      </div>
    </header>
  );
};
