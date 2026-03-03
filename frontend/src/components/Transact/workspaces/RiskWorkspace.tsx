/**
 * Risk Workspace — Menu 3 of the Transact Application
 * TRANSACT_APP_SPEC §3.3: VaR/CVaR, Greeks Aggregation, Covariance Health, MST
 *
 * Navigation is handled by the secondary sidebar (navConfig.ts + TransactLayout).
 * This component reads the URL path to determine which sub-panel to render.
 *
 * Routes:
 *   /transact/risk             → VaR Calculator    (M1 L2)
 *   /transact/risk/greeks      → Greeks Aggregation (M1 L2 §8)
 *   /transact/risk/covariance  → Covariance Health  (M7 L1–3)
 *   /transact/risk/mst         → MST Graph          (M7 L3)
 *   /transact/risk/dashboard   → Risk Dashboard     (Basel III)
 */
import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { RiskProvider, useRisk } from '@/context/RiskContext';
import { AssetSearchBar } from '@/components/AssetSearchBar';
import { VaRCalculatorPanel }     from '@/components/Risk/VaRCalculatorPanel';
import { GreeksAggregationPanel } from '@/components/Risk/GreeksAggregationPanel';
import { CovarianceHealthPanel }  from '@/components/Risk/CovarianceHealthPanel';
import { MSTGraphPanel }          from '@/components/Risk/MSTGraphPanel';
import { RiskDashboardSummary }   from '@/components/Risk/RiskDashboardSummary';

// ── Sub-panel metadata ────────────────────────────────────────────────────────
const PANEL_META: Record<string, { title: string; badge: string; desc: string }> = {
  var: {
    title: 'VaR Calculator',
    badge: 'M1 L2',
    desc:  'Historical · Parametric Normal · Parametric t-dist · Monte Carlo (100k paths)',
  },
  greeks: {
    title: 'Greeks Aggregation',
    badge: 'M1 L2 §8',
    desc:  'Portfolio Δ, Γ, ν, θ · Delta-VaR · Gamma-adjusted VaR (50k MC)',
  },
  covariance: {
    title: 'Covariance Health',
    badge: 'M7 L1–3',
    desc:  'Condition number κ · Ledoit-Wolf shrinkage · OAS shrinkage · Eigenspectrum',
  },
  mst: {
    title: 'MST Graph',
    badge: 'M7 L3',
    desc:  'Correlation-distance graph d(ρ) = √(2(1−ρ)) · Minimum Spanning Tree (Mantegna 1999)',
  },
  dashboard: {
    title: 'Risk Dashboard',
    badge: 'Basel III',
    desc:  'Multi-confidence × multi-horizon VaR & ES grid · Basel III 99 % / 10-day benchmark',
  },
};

const PERIODS = [
  { value: '1mo', label: '1 Mo' },
  { value: '3mo', label: '3 Mo' },
  { value: '6mo', label: '6 Mo' },
  { value: '1y',  label: '1 Yr' },
  { value: '2y',  label: '2 Yr' },
  { value: '5y',  label: '5 Yr' },
];

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  demo:   { label: 'Demo data',   cls: 'bg-amber-500/10  border-amber-500/30  text-amber-300'  },
  live:   { label: 'Live market', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
  manual: { label: 'Manual JSON', cls: 'bg-sky-500/10     border-sky-500/30     text-sky-300'    },
};

// ── Data source panel ─────────────────────────────────────────────────────────
function DataSourcePanel() {
  const {
    returns, labels, dataSource, dataFetchPeriod, setDataFetchPeriod,
    fetchLiveData, fetchLoading, fetchError,
    setReturns, setWeights, setLabels, loadDemoData,
  } = useRisk();

  // Selected symbols for live fetch (independent from demo data labels)
  const [chips, setChips] = useState<string[]>([]);

  const handleAdd = useCallback((symbol: string) => {
    setChips(c => c.includes(symbol) ? c : [...c, symbol]);
  }, []);

  const handleRemove = useCallback((symbol: string) => {
    setChips(c => c.filter(s => s !== symbol));
  }, []);

  // Manual JSON import
  const [jsonText, setJsonText]     = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleImport = () => {
    setParseError(null);
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.returns) || parsed.returns.length === 0)
        throw new Error('Expected { returns: number[][], weights?: number[], labels?: string[] }');
      setReturns(parsed.returns as number[][]);
      if (Array.isArray(parsed.weights)) setWeights(parsed.weights as number[]);
      if (Array.isArray(parsed.labels))  setLabels(parsed.labels as string[]);
      setJsonText('');
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Parse failed');
    }
  };

  const badge = SOURCE_BADGE[dataSource] ?? SOURCE_BADGE.demo;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-5">
      {/* ── Status bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-white">Portfolio Data</span>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${badge.cls}`}>
          {badge.label} — {labels.join(', ')} ({returns.length} obs)
        </span>
        <button
          onClick={loadDemoData}
          className="ml-auto text-xs text-slate-400 hover:text-white underline underline-offset-2"
        >
          Reset to demo
        </button>
      </div>

      {/* ── Asset search ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-300">
          Select assets to fetch live market data
        </p>
        <AssetSearchBar
          chips={chips}
          onAdd={(symbol) => handleAdd(symbol)}
          onRemove={handleRemove}
          maxChips={15}
        />
      </div>

      {/* ── Period + fetch button ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-slate-400">Period:</span>
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setDataFetchPeriod(p.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              dataFetchPeriod === p.value
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => fetchLiveData(chips, dataFetchPeriod)}
          disabled={fetchLoading || chips.length < 2}
          className="ml-auto px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-40 transition flex items-center gap-2"
        >
          {fetchLoading ? (
            <>
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Fetching…
            </>
          ) : `Fetch Live Data${chips.length >= 2 ? ` (${chips.length})` : ''}`}
        </button>
      </div>

      {chips.length < 2 && chips.length > 0 && (
        <p className="text-[11px] text-amber-400">Add at least 2 assets to fetch live data.</p>
      )}

      {fetchError && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-2.5 text-red-300 text-xs">
          {fetchError}
        </div>
      )}

      {/* ── Manual JSON import (collapsible) ───────────────────────── */}
      <details className="text-xs text-slate-500 border-t border-slate-800 pt-3">
        <summary className="cursor-pointer hover:text-slate-300 select-none">
          Import custom returns matrix (JSON)
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-slate-600">
            Format: {`{ "returns": [[r00,r01,…],…], "weights": [w0,…], "labels": ["A","B",…] }`}
          </p>
          <textarea
            rows={4}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='{ "returns": [...], "weights": [...], "labels": [...] }'
            className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-2 font-mono focus:outline-none focus:border-primary-500"
          />
          {parseError && <p className="text-red-400">{parseError}</p>}
          <button
            onClick={handleImport}
            disabled={!jsonText.trim()}
            className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs hover:bg-primary-500 disabled:opacity-40 transition"
          >
            Import
          </button>
        </div>
      </details>
    </div>
  );
}

// ── Active panel resolver ─────────────────────────────────────────────────────
function ActivePanel({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case 'greeks':     return <GreeksAggregationPanel />;
    case 'covariance': return <CovarianceHealthPanel />;
    case 'mst':        return <MSTGraphPanel />;
    case 'dashboard':  return <RiskDashboardSummary />;
    default:           return <VaRCalculatorPanel />;
  }
}

// ── Inner workspace ───────────────────────────────────────────────────────────
function RiskWorkspaceInner() {
  const location = useLocation();

  function getActiveTab() {
    if (location.pathname.includes('/greeks'))     return 'greeks';
    if (location.pathname.includes('/covariance')) return 'covariance';
    if (location.pathname.includes('/mst'))        return 'mst';
    if (location.pathname.includes('/dashboard'))  return 'dashboard';
    return 'var';
  }

  const activeTab = getActiveTab();
  const meta = PANEL_META[activeTab] ?? PANEL_META.var;

  return (
    <div className="p-6 space-y-6">
      {/* ── Section header ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-2xl font-black text-white">{meta.title}</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20">
            {meta.badge}
          </span>
        </div>
        <p className="text-sm text-slate-400 ml-9">{meta.desc}</p>
      </div>

      {/* ── Data source panel ────────────────────────────────────────── */}
      <DataSourcePanel />

      {/* ── Active sub-panel ─────────────────────────────────────────── */}
      <div className="min-h-[500px]">
        <ActivePanel activeTab={activeTab} />
      </div>
    </div>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
export const RiskWorkspace = () => (
  <RiskProvider>
    <RiskWorkspaceInner />
  </RiskProvider>
);
