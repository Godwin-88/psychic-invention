/**
 * CAPMWorkspace — Capital Asset Pricing Model (Menu 1.4 · M1 §2)
 *
 * E(Ri) = Rf + β(Rm − Rf)
 *
 * Live beta: fetch 1-year daily history for asset + benchmark (SPY),
 * compute β = cov(r_i, r_m) / var(r_m) from log-returns.
 *
 * Delta-adjusted exposure: Δ × β_underlying (option position beta)
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getAssetHistory } from '@/utils/api';

// ── Beta computation ──────────────────────────────────────────────────────────
function logReturns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(Math.log(prices[i] / prices[i - 1]));
  return r;
}
function mean(a: number[]) { return a.reduce((s, v) => s + v, 0) / a.length; }
function cov(a: number[], b: number[]) {
  const ma = mean(a), mb = mean(b);
  return a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / (a.length - 1);
}
function variance(a: number[]) { return cov(a, a); }

// ── Component ─────────────────────────────────────────────────────────────────
export const CAPMWorkspace = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Live beta state
  const [assetSym,  setAssetSym]  = useState('');
  const [benchSym,  setBenchSym]  = useState('SPY');
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaError,   setBetaError]   = useState<string | null>(null);
  const [betaInfo,    setBetaInfo]    = useState<{ beta: number; r2: number; n: number; symbol: string; benchmark: string } | null>(null);

  // ── CAPM parameters
  const [rf,   setRf]   = useState(0.04);
  const [rm,   setRm]   = useState(0.10);
  const [beta, setBeta] = useState(1.0);
  const [delta, setDelta] = useState<number | ''>('');

  // ── Derived
  const mrp         = useMemo(() => rm - rf, [rm, rf]);
  const reqReturn   = useMemo(() => rf + beta * mrp, [rf, beta, mrp]);
  const adjBeta     = useMemo(() => typeof delta === 'number' ? delta * beta : null, [delta, beta]);

  // ── Live beta fetch
  const computeLiveBeta = useCallback(async () => {
    if (!assetSym) return;
    setBetaLoading(true); setBetaError(null);
    try {
      const [assetHist, benchHist] = await Promise.all([
        getAssetHistory(assetSym.toUpperCase(), '1y'),
        getAssetHistory(benchSym.toUpperCase(), '1y'),
      ]);
      // Align on common dates
      const assetMap: Record<string, number> = {};
      assetHist.forEach(h => { if (h.close != null) assetMap[h.date] = h.close; });
      const benchMap: Record<string, number> = {};
      benchHist.forEach(h => { if (h.close != null) benchMap[h.date] = h.close; });
      const common = Object.keys(assetMap).filter(d => benchMap[d]).sort();
      if (common.length < 30) throw new Error('Too few common dates — try a different symbol');

      const rAsset = logReturns(common.map(d => assetMap[d]));
      const rBench = logReturns(common.map(d => benchMap[d]));

      const b = cov(rAsset, rBench) / variance(rBench);
      const corr = cov(rAsset, rBench) / Math.sqrt(variance(rAsset) * variance(rBench));

      setBetaInfo({ beta: b, r2: corr ** 2, n: rAsset.length, symbol: assetSym.toUpperCase(), benchmark: benchSym.toUpperCase() });
      setBeta(Math.round(b * 100) / 100);
    } catch (e: unknown) {
      setBetaError(e instanceof Error ? e.message : 'Beta computation failed');
    } finally { setBetaLoading(false); }
  }, [assetSym, benchSym]);

  // ── Draw SML ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const mg = { top: 24, right: 20, bottom: 36, left: 52 };
    const cW = W - mg.left - mg.right, cH = H - mg.top - mg.bottom;

    ctx.clearRect(0, 0, W, H);
    const betaMax = 2.5;
    const rMin = rf - 0.02, rMax = rf + betaMax * mrp + 0.03;
    const sx = (b: number) => mg.left + (b / betaMax) * cW;
    const sy = (r: number) => mg.top + cH - ((r - rMin) / (rMax - rMin)) * cH;

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'; ctx.lineWidth = 1;
    for (let b = 0; b <= betaMax; b += 0.5) { ctx.beginPath(); ctx.moveTo(sx(b), mg.top); ctx.lineTo(sx(b), mg.top + cH); ctx.stroke(); }
    for (let r = Math.ceil(rMin * 20) / 20; r <= rMax; r += 0.02) { ctx.beginPath(); ctx.moveTo(mg.left, sy(r)); ctx.lineTo(mg.left + cW, sy(r)); ctx.stroke(); }

    // SML
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx(0), sy(rf)); ctx.lineTo(sx(betaMax), sy(rf + betaMax * mrp)); ctx.stroke();

    // Asset dot
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(sx(beta), sy(reqReturn), 6, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

    // Delta-adjusted dot
    if (adjBeta !== null) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(sx(adjBeta), sy(rf + adjBeta * mrp), 5, 0, 2 * Math.PI); ctx.fill();
    }

    // Axis labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('β', mg.left + cW / 2, H - 6);
    ctx.textAlign = 'right';
    ctx.fillText(`${(rMax * 100).toFixed(0)}%`, mg.left - 4, mg.top + 4);
    ctx.fillText(`${(rMin * 100).toFixed(0)}%`, mg.left - 4, mg.top + cH + 4);
    ctx.textAlign = 'left';
    ctx.fillText('E(R)', mg.left + 2, mg.top - 8);
  }, [rf, rm, beta, reqReturn, mrp, adjBeta]);

  return (
    <div className="space-y-5">

      {/* Live Beta Panel */}
      <div className="rounded-xl border border-blue-800/40 bg-blue-900/5 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-200 mb-1">Compute Live Beta  ·  β = cov(r_i, r_m) / var(r_m)</p>
          <p className="text-xs text-slate-500">Fetches 1-year daily log-returns from yfinance · auto-populates β below</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Asset Symbol</label>
            <input type="text" value={assetSym} placeholder="e.g. AAPL"
              onChange={e => setAssetSym(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && computeLiveBeta()}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Benchmark</label>
            <input type="text" value={benchSym}
              onChange={e => setBenchSym(e.target.value.toUpperCase())}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm focus:border-blue-500 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <button onClick={computeLiveBeta} disabled={!assetSym || betaLoading}
              className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-40 transition flex items-center justify-center gap-2">
              {betaLoading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              )}
              {betaLoading ? 'Computing…' : 'Compute Live Beta'}
            </button>
          </div>
        </div>
        {betaError && <p className="text-red-400 text-xs">{betaError}</p>}
        {betaInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Beta β</p>
              <p className="text-xl font-mono text-blue-300">{betaInfo.beta.toFixed(4)}</p>
              <p className="text-[10px] text-slate-600">{betaInfo.symbol} vs {betaInfo.benchmark}</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">R² (corr²)</p>
              <p className="text-xl font-mono text-violet-300">{betaInfo.r2.toFixed(4)}</p>
              <p className="text-[10px] text-slate-600">Systematic risk %</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Observations</p>
              <p className="text-xl font-mono text-slate-200">{betaInfo.n}</p>
              <p className="text-[10px] text-slate-600">daily log-returns</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Status</p>
              <p className={`text-sm font-semibold mt-1 ${Math.abs(betaInfo.beta - 1) < 0.2 ? 'text-slate-300' : betaInfo.beta > 1 ? 'text-red-400' : 'text-green-400'}`}>
                {betaInfo.beta > 1.5 ? 'High risk' : betaInfo.beta > 1.1 ? 'Aggressive' : betaInfo.beta > 0.9 ? 'Market-like' : betaInfo.beta > 0.5 ? 'Defensive' : 'Low beta'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CAPM + SML */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
        <p className="text-sm font-semibold text-slate-200 mb-4">
          CAPM  ·  E(Rᵢ) = Rᶠ + β(Rₘ − Rᶠ)
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: inputs */}
          <div className="space-y-3">
            {[
              { label: 'Risk-free rate Rᶠ', val: rf, set: setRf, step: 0.005, min: 0, max: 0.3 },
              { label: 'Market return Rₘ',  val: rm, set: setRm, step: 0.005, min: rf, max: 0.5 },
              { label: 'Beta β',             val: beta, set: setBeta, step: 0.05, min: -2, max: 5 },
            ].map(({ label, val, set, step, min, max }) => (
              <div key={label}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type="number" value={val} step={step} min={min} max={max}
                  onChange={e => set(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm focus:border-blue-500 outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Option Δ (optional)</label>
              <input type="number" value={delta} step={0.01} min={-1} max={1}
                placeholder="e.g. 0.5 to compute Δ-adjusted β"
                onChange={e => setDelta(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm focus:border-blue-500 outline-none" />
              <p className="text-[10px] text-slate-600 mt-0.5">Δ × β = effective beta for an option position</p>
            </div>
          </div>

          {/* Right: results */}
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Market Risk Premium</p>
              <p className="text-2xl font-mono text-blue-400">{(mrp * 100).toFixed(2)}%</p>
              <p className="text-xs text-slate-500">Rₘ − Rᶠ</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Required Return E(Rᵢ)</p>
              <p className="text-2xl font-mono text-white">{(reqReturn * 100).toFixed(2)}%</p>
              <p className="text-xs text-slate-500">Rᶠ + β(Rₘ−Rᶠ) = {(rf*100).toFixed(2)}% + {beta}×{(mrp*100).toFixed(2)}%</p>
            </div>
            {adjBeta !== null && (
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Delta-Adjusted Beta</p>
                <p className="text-2xl font-mono text-amber-400">{adjBeta.toFixed(4)}</p>
                <p className="text-xs text-slate-500">Δ × β = {delta} × {beta} — effective market exposure of option position</p>
              </div>
            )}
          </div>
        </div>

        {/* SML Chart */}
        <div className="mt-5">
          <p className="text-xs font-medium text-slate-400 mb-2">
            Security Market Line
            {adjBeta !== null && <span className="text-amber-400 ml-2">· amber = Δ-adjusted position</span>}
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-800/20 overflow-hidden">
            <canvas ref={canvasRef} width={460} height={220} className="w-full max-w-full h-[220px]" />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Green: asset (β={beta}, E(R)={( reqReturn*100).toFixed(1)}%) · Blue line: SML
          </p>
        </div>
      </div>

      {/* Theory */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-[11px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400 mb-1">CAPM · M1 §2</p>
        <p>E(Rᵢ) = Rᶠ + βᵢ(Rₘ−Rᶠ)  where βᵢ = cov(rᵢ, rₘ) / var(rₘ)  [estimated from 1-year daily log-returns]</p>
        <p>Systematic risk: β²σ²ₘ · Non-systematic: σ²ᵤ = σ²ᵢ(1 − ρ²ᵢₘ) · Total: σ²ᵢ = β²σ²ₘ + σ²ᵤ</p>
        <p>Option beta: βₒₚₜ = Δ × βᵤₙₐ (Delta-adjusted, M1 §2.1 — effective market exposure)</p>
      </div>
    </div>
  );
};
