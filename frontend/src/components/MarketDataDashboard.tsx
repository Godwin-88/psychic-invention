import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { useMarketData, useOptionChain, useSupportedSymbols, useMarketDataHealth, useMarketComparison } from '@/hooks/useApi';
import type { OptionRequest, MarketDataComparison } from '@/types';

/** Format a possibly-missing number (market data fields are often null). */
const fmt = (v: number | null | undefined, digits = 2): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);

/** Format an arithmetic expression whose operands may be null/undefined. */
const fmtExpr = (f: () => number | null | undefined, digits = 2): string => {
  try {
    return fmt(f(), digits);
  } catch {
    return '—';
  }
};


interface MarketDataDashboardProps {
  onSymbolSelect?: (symbol: string, marketData: any) => void;
  currentPricingParams?: OptionRequest;
  theoreticalPrice?: number;
}

export const MarketDataDashboard = ({ 
  onSymbolSelect,
  theoreticalPrice 
}: MarketDataDashboardProps) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [selectedExpiry, setSelectedExpiry] = useState<string>('2024-03-15');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [comparison, setComparison] = useState<MarketDataComparison | null>(null);

  const { isHealthy, loading: healthLoading } = useMarketDataHealth();
  const { data: supportedSymbols, loading: symbolsLoading } = useSupportedSymbols();
  const { 
    fetchMarketData, 
    loading: marketDataLoading, 
    error: marketDataError, 
    data: marketData,
    isAutoRefreshing,
    stopAutoRefresh 
  } = useMarketData(selectedSymbol, autoRefresh, 30000);
  
  const { 
    fetchOptionChain, 
    loading: optionChainLoading, 
    error: optionChainError, 
    data: optionChain 
  } = useOptionChain();

  const { calculateComparison } = useMarketComparison();

  // Fetch market data when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchMarketData({ symbol: selectedSymbol });
    }
  }, [selectedSymbol, fetchMarketData]);

  // Calculate comparison when we have both theoretical and market prices
  useEffect(() => {
    if (theoreticalPrice && marketData) {
      const comp = calculateComparison(theoreticalPrice, marketData);
      setComparison(comp);
    } else {
      setComparison(null);
    }
  }, [theoreticalPrice, marketData, calculateComparison]);

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    if (onSymbolSelect && marketData) {
      onSymbolSelect(symbol, marketData);
    }
  };

  const handleFetchOptionChain = () => {
    if (selectedSymbol && selectedExpiry) {
      fetchOptionChain({
        underlying: selectedSymbol,
        expiry: selectedExpiry
      });
    }
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      stopAutoRefresh();
    }
    setAutoRefresh(!autoRefresh);
  };

  const getHealthStatusColor = () => {
    if (healthLoading) return 'text-slate-400';
    return isHealthy ? 'text-green-400' : 'text-red-400';
  };

  const getHealthStatusText = () => {
    if (healthLoading) return 'Checking...';
    return isHealthy ? 'Connected' : 'Disconnected';
  };

  return (
    <section className="section-padding bg-slate-900 border-b border-slate-800">
      <div className="container space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3 font-semibold">Market Data Integration</p>
            <h2 className="text-3xl font-bold text-white mb-3">Real-time Market Data & Option Chains</h2>
            <p className="text-slate-300 max-w-3xl">
              Connect to live market data through the Deriv API integration. Compare theoretical prices 
              with market prices and analyze option chains in real-time.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <span className={`status-dot ${isHealthy ? 'bg-success' : 'bg-danger'}`}></span>
            <span className={getHealthStatusColor()}>{getHealthStatusText()}</span>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Market Data Panel */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Spot Market Data</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleAutoRefresh}
                  className={isAutoRefreshing ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {isAutoRefreshing ? 'Stop Auto-Refresh' : 'Auto-Refresh'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchMarketData({ symbol: selectedSymbol })}
                  loading={marketDataLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2 uppercase tracking-widest">Symbol</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className="input-field"
                  disabled={symbolsLoading}
                >
                  {supportedSymbols?.symbols.stocks.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
              </div>

              {marketDataError && (
                <div className="text-red-400 text-sm font-mono bg-red-900/20 p-3 rounded">
                  Error: {marketDataError}
                </div>
              )}

              {marketData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="result-tile">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Spot Price</p>
                      <p className="text-2xl font-mono text-white">${fmt(marketData.spot_price, 2)}</p>
                    </div>
                    <div className="result-tile">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Spread</p>
                      <p className="text-2xl font-mono text-white">${fmtExpr(() => marketData.ask - marketData.bid, 2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="metric-pill">
                      <span className="text-xs text-slate-400">Bid</span>
                      <span className="font-mono text-green-400">${fmt(marketData.bid, 2)}</span>
                    </div>
                    <div className="metric-pill">
                      <span className="text-xs text-slate-400">Ask</span>
                      <span className="font-mono text-red-400">${fmt(marketData.ask, 2)}</span>
                    </div>
                  </div>

                  {marketData.implied_volatility && (
                    <div className="metric-pill">
                      <span className="text-xs text-slate-400">Implied Vol</span>
                      <span className="font-mono">{fmtExpr(() => (marketData.implied_volatility ?? NaN) * 100, 1)}%</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 font-mono">
                    Last updated: {new Date(marketData.timestamp).toLocaleTimeString()} 
                    ({fmt(marketData.data_age_seconds, 0)}s ago)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Comparison Panel */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Theoretical vs Market Price</h3>
            
            {comparison ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="result-tile">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Theoretical</p>
                    <p className="text-2xl font-mono text-blue-400">${fmt(comparison.theoretical_price, 4)}</p>
                  </div>
                  <div className="result-tile">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Market Mid</p>
                    <p className="text-2xl font-mono text-white">${fmt(comparison.market_price, 4)}</p>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Difference:</span>
                      <span className={`font-mono ${comparison.price_difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${fmt(comparison.price_difference, 4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Difference %:</span>
                      <span className={`font-mono ${comparison.price_difference_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fmt(comparison.price_difference_percent, 2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bid-Ask Spread:</span>
                      <span className="font-mono text-slate-300">${fmt(comparison.spread, 4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Within Spread:</span>
                      <span className={`font-mono ${Math.abs(comparison.price_difference) <= comparison.spread ? 'text-green-400' : 'text-yellow-400'}`}>
                        {Math.abs(comparison.price_difference) <= comparison.spread ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-slate-400 font-mono">Calculate a theoretical price to see comparison</p>
                <p className="text-xs text-slate-500">Use the pricing workspace to generate theoretical prices.</p>
              </div>
            )}
          </div>
        </div>

        {/* Option Chain Panel */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Option Chain</h3>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Expiry Date</label>
                <input
                  type="date"
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <Button
                onClick={handleFetchOptionChain}
                loading={optionChainLoading}
                disabled={!selectedSymbol || !selectedExpiry}
              >
                Fetch Chain
              </Button>
            </div>
          </div>

          {optionChainError && (
            <div className="text-red-400 text-sm font-mono bg-red-900/20 p-3 rounded mb-4">
              Error: {optionChainError}
            </div>
          )}

          {optionChain && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>Underlying: {optionChain.underlying}</span>
                <span>Expiry: {new Date(optionChain.expiry).toLocaleDateString()}</span>
                <span>Total Strikes: {optionChain.total_strikes}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-800">
                      <th className="px-4 py-3 text-left">Strike</th>
                      <th className="px-4 py-3 text-left">Call Bid</th>
                      <th className="px-4 py-3 text-left">Call Ask</th>
                      <th className="px-4 py-3 text-left">Call IV</th>
                      <th className="px-4 py-3 text-left">Put Bid</th>
                      <th className="px-4 py-3 text-left">Put Ask</th>
                      <th className="px-4 py-3 text-left">Put IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optionChain.calls.slice(0, 10).map((call, _index) => {
                      const put = optionChain.puts.find(p => p.strike === call.strike);
                      return (
                        <tr key={call.strike} className="border-t border-slate-800 hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-semibold">${fmt(call.strike, 0)}</td>
                          <td className="px-4 py-3 text-green-400">${fmt(call.bid, 2)}</td>
                          <td className="px-4 py-3 text-red-400">${fmt(call.ask, 2)}</td>
                          <td className="px-4 py-3">{fmtExpr(() => call.implied_volatility * 100, 1)}%</td>
                          <td className="px-4 py-3 text-green-400">${fmt(put?.bid, 2) || 'N/A'}</td>
                          <td className="px-4 py-3 text-red-400">${fmt(put?.ask, 2) || 'N/A'}</td>
                          <td className="px-4 py-3">{put ? fmtExpr(() => put.implied_volatility * 100, 1) + '%' : 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!optionChain && !optionChainLoading && (
            <div className="empty-state">
              <p className="text-slate-400 font-mono">Select a symbol and expiry date to fetch option chain</p>
              <p className="text-xs text-slate-500">Option chain data includes strikes, prices, and implied volatilities.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};