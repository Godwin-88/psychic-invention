import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { PricingWorkspace } from '@/components/PricingWorkspace';
import { GreeksDashboard } from '@/components/Pricer/GreeksDashboard';
import { VizPanel } from '@/components/Transact/VizPanel';
import { VisualizationWorkspace } from '@/components/Transact/workspaces/VisualizationWorkspace';
import { OptionChainWorkspace } from '@/components/Transact/workspaces/OptionChainWorkspace';
import { CAPMWorkspace } from '@/components/Transact/workspaces/CAPMWorkspace';
import { useSelectedAssets } from '@/context/SelectedAssetsContext';

const subTabs = [
  { id: 'multi-model', label: 'Multi-Model Pricing', path: '/transact/pricer' },
  { id: 'greeks',      label: 'Greeks Dashboard',    path: '/transact/pricer/greeks' },
  { id: 'chain',       label: 'Option Chain',         path: '/transact/pricer/chain' },
  { id: 'capm',        label: 'CAPM Integration',     path: '/transact/pricer/capm' },
  { id: 'visualize',   label: 'Visualize',            path: '/transact/pricer/visualize' },
];

export const PricerWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedAssets } = useSelectedAssets();
  const [vizPanelOpen, setVizPanelOpen] = useState(false);
  const [selectedViz, setSelectedViz] = useState<string | undefined>();

  function getActiveTab() {
    if (location.pathname.includes('/visualize')) return 'visualize';
    if (location.pathname.includes('/greeks')) return 'greeks';
    if (location.pathname.includes('/chain'))  return 'chain';
    if (location.pathname.includes('/capm'))   return 'capm';
    return 'multi-model';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⚡</span>
            <h1 className="text-2xl font-black text-white">Derivatives Pricer</h1>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">DPE · M1 · M2</span>
          </div>
          <p className="text-sm text-slate-400 ml-9">Multi-model derivatives pricing with Black-Scholes, FFT, and Heston</p>
        </div>
        <button
          onClick={() => setVizPanelOpen(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-blue-500/50 transition-colors text-sm font-medium"
          title={selectedAssets.length > 0 ? 'Visualize selected assets' : 'Select assets to visualize'}
        >
          <BarChart2 className="w-4 h-4" />
          Visualize
          {selectedAssets.length > 0 && (
            <span className="text-xs text-blue-400">({selectedAssets.map(a => a.symbol).join(', ')})</span>
          )}
        </button>
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
        {activeTab === 'greeks' && <GreeksDashboard />}
        {activeTab === 'chain' && <OptionChainWorkspace />}
        {activeTab === 'capm' && <CAPMWorkspace />}
        {activeTab === 'visualize' && (
          <VisualizationWorkspace />
        )}
      </div>

      <VizPanel
        open={vizPanelOpen}
        onClose={() => setVizPanelOpen(false)}
        selectedAssets={selectedAssets}
        selectedViz={selectedViz}
        onSelectViz={setSelectedViz}
      />
    </div>
  );
};
