import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectedAssets, type AssetType, type SelectedAsset } from '@/context/SelectedAssetsContext';
import { useHealthCheck } from '@/hooks/useApi';

const SEARCH_DEBOUNCE_MS = 300;

export const TransactHeader = () => {
  const navigate = useNavigate();
  const { isHealthy } = useHealthCheck();
  const {
    selectedAssetType,
    setSelectedAssetType,
    selectedAssets,
    addAsset,
    removeAsset,
    searchUniverse,
    assetTypes,
    maxSelected,
  } = useSelectedAssets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; type: AssetType; name: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      searchUniverse(searchQuery)
        .then((results) => setSearchResults(results))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchUniverse]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddAsset = (item: { symbol: string; type: AssetType; name: string }) => {
    if (selectedAssets.length >= maxSelected) return;
    addAsset({ symbol: item.symbol, type: item.type, name: item.name });
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shrink-0">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        {/* Brand + Back */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            title="Back to landing"
          >
            <span className="text-lg">←</span>
          </button>
          <button onClick={() => navigate('/transact')} className="group flex items-center gap-2.5 text-left shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/20">
              T
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none group-hover:text-blue-300 transition-colors">
                TRANSACT
              </p>
              <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] leading-none mt-0.5">
                Analytical Platform
              </p>
            </div>
          </button>
        </div>

        {/* Asset type selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 uppercase tracking-wider hidden sm:inline">Asset type</span>
          <select
            value={selectedAssetType}
            onChange={(e) => setSelectedAssetType(e.target.value as AssetType)}
            aria-label="Asset type"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          >
            {assetTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Asset picker (up to 5) */}
        <div className="flex-1 flex items-center gap-2 min-w-0 max-w-2xl" ref={searchRef}>
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {selectedAssets.map((a) => (
              <span
                key={a.symbol}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-sm font-medium text-blue-300"
              >
                {a.symbol}
                <button
                  onClick={() => removeAsset(a.symbol)}
                  className="text-slate-400 hover:text-white"
                  aria-label={`Remove ${a.symbol}`}
                >
                  ×
                </button>
              </span>
            ))}
            {selectedAssets.length < maxSelected && (
              <div className="relative">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 text-sm"
                >
                  + Add asset ({selectedAssets.length}/{maxSelected})
                </button>
                {searchOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/50 z-50 overflow-hidden">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        selectedAssetType === 'currency'
                          ? 'Search forex pairs (e.g. EUR, USD)'
                          : selectedAssetType === 'cryptocurrency'
                            ? 'Search crypto (e.g. BTC, ETH)'
                            : selectedAssetType === 'equity'
                              ? 'Search stocks (e.g. AAPL, MSFT)'
                              : selectedAssetType === 'future'
                                ? 'Search commodities'
                                : selectedAssetType === 'etf' || selectedAssetType === 'index'
                                  ? 'Search ETFs/indices'
                                  : 'Search symbol (e.g. AAPL, EUR, BTC)'
                      }
                      className="w-full px-3 py-2.5 bg-slate-800 border-b border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {searchLoading && (
                        <div className="px-3 py-2 text-sm text-slate-400">Searching yfinance…</div>
                      )}
                      {!searchLoading && searchResults.map((item) => (
                        <button
                          key={item.symbol}
                          onClick={() => handleAddAsset(item)}
                          disabled={selectedAssets.some((a) => a.symbol === item.symbol)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-between"
                        >
                          <span className="font-medium text-white">{item.symbol}</span>
                          <span className="text-slate-500 text-xs">{item.name}</span>
                        </button>
                      ))}
                      {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
                        <button
                          onClick={() =>
                            handleAddAsset({
                              symbol: searchQuery.trim().toUpperCase(),
                              type: selectedAssetType === 'all' ? 'equity' : selectedAssetType,
                              name: searchQuery.trim(),
                            })
                          }
                          className="w-full px-3 py-3 text-left text-sm text-blue-400 hover:bg-slate-800"
                        >
                          Add &quot;{searchQuery.trim().toUpperCase()}&quot; as custom asset
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: API status + Derivatives hint */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline text-xs text-slate-500">
            Derivatives available for selected assets
          </span>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={isHealthy ? 'text-emerald-400' : 'text-red-400'}>
              {isHealthy ? 'API' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
