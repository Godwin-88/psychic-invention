import { useNavigate } from 'react-router-dom';
import { useHealthCheck } from '@/hooks/useApi';
import { MarketTicker } from './MarketTicker';

export const TransactHeader = () => {
  const navigate = useNavigate();
  const { isHealthy } = useHealthCheck();

  return (
    <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shrink-0 h-12">
      <div className="flex items-center gap-4 px-4 h-full">

        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors"
            title="Back to landing"
          >
            <span className="text-sm">←</span>
          </button>
          <button
            onClick={() => navigate('/transact')}
            className="group flex items-center gap-2 text-left shrink-0"
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-base shadow-md shadow-orange-500/30">
              🔥
            </div>
            <p className="text-sm font-black text-white leading-none group-hover:text-orange-300 transition-colors">
              QUANTI<span className="text-orange-400">🔥</span>
            </p>
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-slate-800 shrink-0" />

        {/* Live market ticker — fills all available space */}
        {isHealthy && <MarketTicker />}
        {!isHealthy && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] text-slate-700 uppercase tracking-widest">
              Market data unavailable — API offline
            </span>
          </div>
        )}

        {/* Separator */}
        <div className="w-px h-5 bg-slate-800 shrink-0" />

        {/* API status pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className={isHealthy ? 'text-emerald-400' : 'text-red-400'}>
            {isHealthy ? 'LIVE' : 'OFF'}
          </span>
        </div>
      </div>
    </header>
  );
};
