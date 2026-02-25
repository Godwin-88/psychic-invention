import { useNavigate, useLocation } from 'react-router-dom';
import { TradeEntryForm } from '@/components/Blotter/TradeEntryForm';
import { PositionTable } from '@/components/Blotter/PositionTable';
import { AttributionCard } from '@/components/Blotter/AttributionCard';

const subTabs = [
  { id: 'entry',       label: 'Trade Entry',         path: '/transact/blotter' },
  { id: 'positions',   label: 'Position Monitor',    path: '/transact/blotter/positions' },
  { id: 'attribution', label: 'P&L Attribution',     path: '/transact/blotter/attribution' },
  { id: 'history',     label: 'Transaction History', path: '/transact/blotter/history' },
  { id: 'export',      label: 'Export',              path: '/transact/blotter/export' },
];

const PlaceholderPanel = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-3xl">📋</div>
    <div>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{desc}</p>
    </div>
    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">Panel active</span>
  </div>
);

export const BlotterWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  function getActiveTab() {
    if (location.pathname.includes('/positions'))   return 'positions';
    if (location.pathname.includes('/attribution')) return 'attribution';
    if (location.pathname.includes('/history'))     return 'history';
    if (location.pathname.includes('/export'))      return 'export';
    return 'entry';
  }
  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📋</span>
          <h1 className="text-2xl font-black text-white">Trade Blotter</h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-300 border border-slate-500/20">DPE · M1 · M2</span>
        </div>
        <p className="text-sm text-slate-400 ml-9">Trade entry, real-time position monitoring, P&L attribution, and export</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-slate-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'entry'       && (
          <div className="space-y-6">
            <TradeEntryForm />
          </div>
        )}
        {activeTab === 'positions'   && (
          <div className="space-y-6">
            <PositionTable />
          </div>
        )}
        {activeTab === 'attribution' && (
          <div className="space-y-6">
            <AttributionCard />
          </div>
        )}
        {activeTab === 'history'     && (
          <PlaceholderPanel
            title="Transaction History"
            desc="Full audit trail of all trades with timestamps, counterparties, prices, and execution details."
          />
        )}
        {activeTab === 'export'      && (
          <PlaceholderPanel
            title="Export Centre"
            desc="Export blotter data to CSV, JSON, or Excel. Supports filtered date ranges and report templates."
          />
        )}
      </div>
    </div>
  );
};
