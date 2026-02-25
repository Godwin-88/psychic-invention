import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PricingWorkspace } from '@/components/PricingWorkspace';

const subTabs = [
  { id: 'multi-model', label: 'Multi-Model Pricing', path: '/transact/pricer' },
  { id: 'greeks',      label: 'Greeks Dashboard',    path: '/transact/pricer/greeks' },
  { id: 'chain',       label: 'Option Chain',         path: '/transact/pricer/chain' },
  { id: 'capm',        label: 'CAPM Integration',     path: '/transact/pricer/capm' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
      ⚡
    </div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">
      Panel active
    </span>
  </div>
);

export const PricerWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  function getActiveTab() {
    if (location.pathname.includes('/greeks')) return 'greeks';
    if (location.pathname.includes('/chain'))  return 'chain';
    if (location.pathname.includes('/capm'))   return 'capm';
    return 'multi-model';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">⚡</span>
          <h1 className="text-2xl font-black text-white">Derivatives Pricer</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">DPE · M1 · M2</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">Multi-model derivatives pricing with Black-Scholes, FFT, and Heston</p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'multi-model' && <PricingWorkspace />}
        {activeTab === 'greeks' && (
          <PlaceholderPanel
            title="Greeks Dashboard"
            desc="Interactive Greeks visualisation: Delta, Gamma, Theta, Vega, Rho across strikes and maturities."
          />
        )}
        {activeTab === 'chain' && (
          <PlaceholderPanel
            title="Option Chain View"
            desc="Full option chain display with real-time prices, IV, volume, and open interest."
          />
        )}
        {activeTab === 'capm' && (
          <PlaceholderPanel
            title="CAPM Integration"
            desc="Capital Asset Pricing Model integration for required return and risk premium analysis."
          />
        )}
      </div>
    </div>
  );
};
