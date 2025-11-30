// Wall Street Themed Main App Component
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { LiveDemo } from './components/LiveDemo';
import { Features } from './components/Features';

function App() {
  return (
    <div className="min-h-screen bg-dark-100">
      <Header />
      <main>
        <Hero />
        <LiveDemo />
        <Features />
      </main>
      
      {/* Wall Street Footer */}
      <footer className="bg-dark-100 border-t border-slate-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">
                <span className="text-slate-100">⚡</span>
                <span className="glow-text ml-2">PricingEngine</span>
              </h3>
              <p className="text-slate-400 text-sm mb-6 max-w-md">
                Institutional-grade derivatives pricing engine powered by Rust algorithms. 
                Built for Wall Street speed and precision.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></div>
                  <span className="text-slate-400 font-mono">API: LIVE</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gold rounded-full mr-2 animate-pulse"></div>
                  <span className="text-slate-400 font-mono">99.9% SLA</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-200">Trading Models</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-primary-400 transition-colors">Black-Scholes</a></li>
                <li><a href="#features" className="hover:text-primary-400 transition-colors">Monte Carlo</a></li>
                <li><a href="#features" className="hover:text-primary-400 transition-colors">FFT Pricing</a></li>
                <li><a href="#features" className="hover:text-primary-400 transition-colors">Heston Model</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-200">Platform</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#demo" className="hover:text-primary-400 transition-colors">Live Terminal</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Performance</a></li>
                <li>
                  <a 
                    href="https://github.com/Godwin-88/psychic-invention" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary-400 transition-colors flex items-center"
                  >
                    GitHub <span className="ml-1">↗</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-slate-500 font-mono">
                &copy; 2024 PricingEngine. Built with Rust + React + TypeScript.
              </p>
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <span className="text-xs text-slate-600">Powered by</span>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="bg-dark-200 px-2 py-1 rounded border border-slate-600">Rust</span>
                  <span className="bg-dark-200 px-2 py-1 rounded border border-slate-600">FastAPI</span>
                  <span className="bg-dark-200 px-2 py-1 rounded border border-slate-600">React</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
