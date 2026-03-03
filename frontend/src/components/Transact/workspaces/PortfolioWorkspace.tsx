/**
 * Portfolio Workspace — Menu 2 (TRANSACT_APP_SPEC §3.2)
 * Wraps all sub-panels with PortfolioProvider for shared state.
 */
import { useLocation } from 'react-router-dom';
import { PortfolioProvider } from '@/context/PortfolioContext';
import { PortfolioBuilder } from '@/components/Portfolio/PortfolioBuilder';
import { MomentsPanel } from '@/components/Portfolio/MomentsPanel';
import { PerformanceAppraisalCard } from '@/components/Portfolio/PerformanceAppraisalCard';
import { CoskewnessHeatmap } from '@/components/Portfolio/CoskewnessHeatmap';
import { ReturnAttributionPanel } from '@/components/Portfolio/ReturnAttributionPanel';

const SUB_LABELS: Record<string, string> = {
  builder: 'Asset Universe & Weight Builder',
  moments: 'Sample Moments',
  performance: 'Performance Appraisal',
  stats: 'Higher-Order Statistics',
  attribution: 'Return Attribution',
};

const SOURCE_BADGES: Record<string, string> = {
  builder: 'M1 §3.2.1',
  moments: 'M1 L1',
  performance: 'M1 Part II §4–7',
  stats: 'M2 L2',
  attribution: 'M1 §4 · M2 §5',
};

const SUB_DESCRIPTIONS: Record<string, string> = {
  builder: 'Define asset universe, set weights, fetch real market returns, compute all analytics.',
  moments: 'R_p = w^T r̄ · σ²_p = w^T Σ w · β_p = w^T β · γ̂ skewness · κ̂ kurtosis',
  performance: 'Sharpe · Treynor · Sortino · M² (Modigliani) · M²-Sortino · Information Ratio · Appraisal Ratio · Jensen α',
  stats: 'Coskewness M₃ matrix · portfolio skewness via Kronecker product · heavy-tail kurtosis flag',
  attribution: 'r_p = α + β_p·r_m + Σ λ_k·β_{p,k} + ε · Jensen alpha · CAPM decomposition · multi-factor extension',
};

function WorkspaceContent({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case 'moments':     return <MomentsPanel />;
    case 'performance': return <PerformanceAppraisalCard />;
    case 'stats':       return <CoskewnessHeatmap />;
    case 'attribution': return <ReturnAttributionPanel />;
    default:            return <PortfolioBuilder />;
  }
}

function PortfolioWorkspaceInner() {
  const location = useLocation();

  function getActiveTab() {
    if (location.pathname.includes('/moments'))     return 'moments';
    if (location.pathname.includes('/performance')) return 'performance';
    if (location.pathname.includes('/stats'))       return 'stats';
    if (location.pathname.includes('/attribution')) return 'attribution';
    return 'builder';
  }

  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-black text-white">{SUB_LABELS[activeTab]}</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {SOURCE_BADGES[activeTab]}
          </span>
        </div>
        <p className="text-sm text-slate-400 ml-9">{SUB_DESCRIPTIONS[activeTab]}</p>
      </div>

      {/* Active sub-panel content */}
      <div className="min-h-[500px]">
        <WorkspaceContent activeTab={activeTab} />
      </div>
    </div>
  );
}

export const PortfolioWorkspace = () => (
  <PortfolioProvider>
    <PortfolioWorkspaceInner />
  </PortfolioProvider>
);
