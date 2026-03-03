/**
 * PricerWorkspace — Menu 1: Derivatives Pricer shell
 *
 * Tabs (route-driven via :submenu param):
 *   pricing    → PricingWorkspace  (BS · FFT · Heston · live asset)
 *   greeks     → GreeksDashboard   (Δ/Γ/Θ/ν/ρ · Δ/Γ heatmap)
 *   chain      → OptionChainWorkspace (yfinance live chain · BS theoretical)
 *   capm       → CAPMWorkspace     (live β · SML · Δ-adjusted exposure)
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { PricingWorkspace }       from '@/components/PricingWorkspace';
import { GreeksDashboard }        from '@/components/Pricer/GreeksDashboard';
import { OptionChainWorkspace }   from '@/components/Transact/workspaces/OptionChainWorkspace';
import { CAPMWorkspace }          from '@/components/Transact/workspaces/CAPMWorkspace';

const TABS = [
  { id: 'pricing', label: 'Pricing',      badge: 'BS · FFT · Heston',  desc: 'Multi-model: C = SN(d₁)−Ke⁻ʳᵗN(d₂) · Carr-Madan FFT · Heston SV · live spot + IV' },
  { id: 'greeks',  label: 'Greeks',       badge: 'Δ Γ Θ ν ρ',         desc: 'Analytical vs numerical · Δ/Γ heatmap (S×K grid) · all 3 models' },
  { id: 'chain',   label: 'Option Chain', badge: 'yfinance · live',    desc: 'Strike×Expiry grid · implied vol · BS theoretical · ITM/ATM/OTM' },
  { id: 'capm',    label: 'CAPM',         badge: 'M1 §2 · β live',     desc: 'E(Ri) = Rf + β(Rm−Rf) · live beta from 1-year daily log-returns · Δ-adjusted exposure' },
] as const;

type TabId = typeof TABS[number]['id'];

export const PricerWorkspace = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  function getActive(): TabId {
    const seg = location.pathname.split('/').pop() ?? '';
    if (seg === 'greeks')  return 'greeks';
    if (seg === 'chain')   return 'chain';
    if (seg === 'capm')    return 'capm';
    return 'pricing';
  }
  const active = getActive();
  const meta   = TABS.find(t => t.id === active)!;

  const goTo = (id: TabId) =>
    navigate(id === 'pricing' ? '/transact/pricer' : `/transact/pricer/${id}`);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">⚡</span>
          <h1 className="text-2xl font-black text-white">Derivatives Pricer</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">
            {meta.badge}
          </span>
        </div>
        <p className="text-sm text-slate-400 ml-9">{meta.desc}</p>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => goTo(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              active === t.id
                ? 'bg-blue-700 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <div className="min-h-[500px]">
        {active === 'pricing' && <PricingWorkspace />}
        {active === 'greeks'  && <GreeksDashboard />}
        {active === 'chain'   && <OptionChainWorkspace />}
        {active === 'capm'    && <CAPMWorkspace />}
      </div>
    </div>
  );
};
