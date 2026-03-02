import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/Button';
import { OptionChainDisplay } from '@/components/OptionChainDisplay';
import { useOptionChain, useSupportedSymbols } from '@/hooks/useApi';
import { useSelectedAssets } from '@/context/SelectedAssetsContext';
import type { OptionChainData, OptionContractResponse } from '@/types';

function toOptionChainData(
  calls: OptionContractResponse[],
  puts: OptionContractResponse[],
  expiryStr: string
): OptionChainData[] {
  const byStrike = new Map<number, { call?: OptionContractResponse; put?: OptionContractResponse }>();
  calls.forEach((c) => {
    const e = byStrike.get(c.strike) ?? {};
    e.call = c;
    byStrike.set(c.strike, e);
  });
  puts.forEach((p) => {
    const e = byStrike.get(p.strike) ?? {};
    e.put = p;
    byStrike.set(p.strike, e);
  });
  return Array.from(byStrike.entries())
    .map(([strike, { call, put }]) => {
      const mid = (v: number, w: number) => ((v ?? 0) + (w ?? 0)) / 2;
      const callPrice = call ? mid(call.bid, call.ask) : 0;
      const putPrice = put ? mid(put.bid, put.ask) : 0;
      const callGreeks = call && (call.delta != null)
        ? { delta: call.delta, gamma: call.gamma ?? 0, theta: call.theta ?? 0, vega: call.vega ?? 0, rho: call.rho ?? 0 }
        : undefined;
      const putGreeks = put && (put.delta != null)
        ? { delta: put.delta, gamma: put.gamma ?? 0, theta: put.theta ?? 0, vega: put.vega ?? 0, rho: put.rho ?? 0 }
        : undefined;
      return {
        strike,
        expiration: expiryStr,
        callPrice,
        putPrice,
        callImpliedVol: call?.implied_volatility,
        putImpliedVol: put?.implied_volatility,
        callGreeks,
        putGreeks,
      };
    })
    .sort((a, b) => a.strike - b.strike);
}

export const OptionChainWorkspace = () => {
  const { selectedAssets } = useSelectedAssets();
  const { data: supportedSymbols } = useSupportedSymbols();
  const { fetchOptionChain, loading, error, data } = useOptionChain();

  const defaultSymbol = selectedAssets[0]?.symbol ?? 'AAPL';
  const [underlying, setUnderlying] = useState(defaultSymbol);

  useEffect(() => {
    if (selectedAssets[0]?.symbol) setUnderlying(selectedAssets[0].symbol);
  }, [selectedAssets[0]?.symbol]);

  const [expiry, setExpiry] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  const symbols = useMemo(() => {
    const stocks = supportedSymbols?.symbols?.stocks ?? [];
    const selected = selectedAssets.map((a) => a.symbol).filter((s) => !stocks.includes(s));
    return [...new Set([...stocks, ...selected])];
  }, [supportedSymbols, selectedAssets]);

  const chainData = useMemo(() => {
    if (!data) return [];
    const expiryStr = typeof data.expiry === 'string'
      ? data.expiry.slice(0, 10)
      : new Date(data.expiry).toISOString().slice(0, 10);
    return toOptionChainData(data.calls ?? [], data.puts ?? [], expiryStr);
  }, [data]);

  const handleFetch = () => {
    fetchOptionChain({ underlying, expiry });
  };

  const spotPrice = data ? undefined : undefined; // Could fetch from getMarketData if needed

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Option Chain</h3>
        <p className="text-sm text-slate-400 mb-4">
          Fetch live option chain for an underlying. Requires Deriv API connection for real-time data.
        </p>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Underlying</label>
            <select
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm min-w-[120px]"
              aria-label="Underlying symbol"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              {symbols.length === 0 && (
                <option value={defaultSymbol}>{defaultSymbol}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Expiry</label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
              aria-label="Expiration date"
            />
          </div>
          <Button onClick={handleFetch} loading={loading} disabled={!underlying || !expiry}>
            Fetch Chain
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {chainData.length > 0 ? (
          <OptionChainDisplay
            data={chainData}
            currentSpotPrice={spotPrice}
            showGreeks={true}
            showImpliedVol={true}
          />
        ) : !loading && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-8 text-center">
            <p className="text-slate-400">Select underlying and expiry, then click Fetch Chain</p>
            <p className="text-slate-500 text-xs mt-1">Market data may be limited for some symbols</p>
          </div>
        )}
      </div>
    </div>
  );
};
