import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { LandingStage } from './components/LandingStage';
import { MarketplaceStage } from './components/MarketplaceStage';
import { PricingWorkspace } from './components/PricingWorkspace';
import { ProcessingStage } from './components/ProcessingStage';
import { ApiPlayground } from './components/ApiPlayground';

const MarketplacePage = () => (
  <>
    <LandingStage />
    <MarketplaceStage />
  </>
);

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<MarketplacePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/workspace" element={<PricingWorkspace />} />
          <Route path="/fft" element={<PricingWorkspace defaultTab="fft" />} />
          <Route path="/operations" element={<ProcessingStage />} />
          <Route path="/api-playground" element={<ApiPlayground />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <footer className="bg-slate-950 border-t border-slate-800 py-10">
        <div className="container flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-slate-400">
          <div>
            <p className="font-semibold text-white">PricingEngine · Rust core, Python bindings, FastAPI + React</p>
            <p className="text-xs uppercase tracking-widest text-slate-500">Experience the full derivatives stack</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="tag-pill">Rust</span>
            <span className="tag-pill">FastAPI</span>
            <span className="tag-pill">React + Tailwind</span>
            <span className="tag-pill">PyO3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
