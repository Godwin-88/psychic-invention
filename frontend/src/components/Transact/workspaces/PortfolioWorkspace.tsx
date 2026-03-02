import { useNavigate, useLocation } from 'react-router-dom';
import { PortfolioBuilder } from '@/components/Portfolio/PortfolioBuilder';
import { MomentsPanel } from '@/components/Portfolio/MomentsPanel';
import { PerformanceAppraisalCard } from '@/components/Portfolio/PerformanceAppraisalCard';
import { CoskewnessHeatmap } from '@/components/Portfolio/CoskewnessHeatmap';

const subTabs = [
  { id: 'builder',     label: 'Asset Universe',        path: '/transact/portfolio' },
  { id: 'moments',     label: 'Sample Moments',        path: '/transact/portfolio/moments' },
  { id: 'performance', label: 'Performance Appraisal', path: '/transact/portfolio/performance' },
  { id: 'stats',       label: 'Higher-Order Stats',    path: '/transact/portfolio/stats' },
  { id: 'attribution', label: 'Return Attribution',    path: '/transact/portfolio/attribution' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
      📊
    </div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">Panel active</span>
  </div>
);

export const PortfolioWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-black text-white">Portfolio Analytics</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">M1 · M2</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">Portfolio builder, sample moments, performance appraisal, and attribution</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'builder'     && <PortfolioBuilder />}
        {activeTab === 'moments'     && <MomentsPanel />}
        {activeTab === 'performance' && <PerformanceAppraisalCard />}
        {activeTab === 'stats'       && <CoskewnessHeatmap />}
        {activeTab === 'attribution' && (
          <PlaceholderPanel
            title="Return Attribution"
            desc="Brinson-Hood-Beebower attribution: allocation, selection, and interaction effects."
          />
        )}
      </div>
    </div>
  );
};
