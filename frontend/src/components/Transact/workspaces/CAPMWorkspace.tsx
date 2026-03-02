import { useState, useMemo, useRef, useEffect } from 'react';

/**
 * CAPM: E(Ri) = Rf + β(Rm - Rf)
 * Security Market Line (SML), required return, risk premium
 */
export const CAPMWorkspace = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [rf, setRf] = useState(0.04);
  const [rm, setRm] = useState(0.10);
  const [beta, setBeta] = useState(1.0);
  const [delta, setDelta] = useState<number | ''>(''); // Optional: option delta for adjusted beta

  const marketRiskPremium = useMemo(() => rm - rf, [rf, rm]);
  const requiredReturn = useMemo(() => rf + beta * marketRiskPremium, [rf, beta, marketRiskPremium]);
  const deltaAdjustedBeta = useMemo(() => {
    if (delta === '' || typeof delta !== 'number') return null;
    return delta * beta; // Effective beta for option = delta * β_underlying
  }, [delta, beta]);

  // Draw Security Market Line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const margin = { top: 24, right: 24, bottom: 36, left: 48 };
    const chartW = w - margin.left - margin.right;
    const chartH = h - margin.top - margin.bottom;

    ctx.clearRect(0, 0, w, h);

    const betaMin = 0;
    const betaMax = 2.5;
    const rAt0 = rf;
    const rAtMax = rf + betaMax * marketRiskPremium;
    const rMin = Math.min(rf - 0.02, rAt0);
    const rMax = Math.max(rAtMax + 0.02, requiredReturn + 0.02);

    const scaleX = (b: number) => margin.left + ((b - betaMin) / (betaMax - betaMin)) * chartW;
    const scaleY = (r: number) => margin.top + chartH - ((r - rMin) / (rMax - rMin)) * chartH;

    // Grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    for (let b = 0; b <= betaMax; b += 0.5) {
      ctx.beginPath();
      ctx.moveTo(scaleX(b), margin.top);
      ctx.lineTo(scaleX(b), margin.top + chartH);
      ctx.stroke();
    }
    for (let r = Math.ceil(rMin * 20) / 20; r <= rMax; r += 0.05) {
      ctx.beginPath();
      ctx.moveTo(margin.left, scaleY(r));
      ctx.lineTo(margin.left + chartW, scaleY(r));
      ctx.stroke();
    }

    // SML line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX(betaMin), scaleY(rf));
    ctx.lineTo(scaleX(betaMax), scaleY(rf + betaMax * marketRiskPremium));
    ctx.stroke();

    // Current asset point
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(scaleX(beta), scaleY(requiredReturn), 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // X-axis label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.fillText('β (Beta)', margin.left + chartW / 2 - 24, h - 8);
    ctx.fillText('0', margin.left - 6, margin.top + chartH + 4);
    ctx.fillText('2.5', margin.left + chartW - 12, margin.top + chartH + 4);

    // Y-axis
    ctx.textAlign = 'right';
    ctx.fillText((rMin * 100).toFixed(0) + '%', margin.left - 8, margin.top + chartH + 4);
    ctx.fillText((rMax * 100).toFixed(0) + '%', margin.left - 8, margin.top + 4);
    ctx.fillText('E(R) %', margin.left - 8, 14);
    ctx.textAlign = 'left';
  }, [rf, rm, beta, requiredReturn, marketRiskPremium]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">CAPM Integration</h3>
        <p className="text-sm text-slate-400 mb-4">
          Capital Asset Pricing Model: E(Ri) = Rf + β(Rm − Rf). Compute required return and risk premium.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Parameters</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Risk-free rate (Rf)</label>
                <input
                  type="number"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={rf}
                  onChange={(e) => setRf(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                  aria-label="Risk-free rate"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Expected market return (Rm)</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={rm}
                  onChange={(e) => setRm(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                  aria-label="Expected market return"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Beta (β)</label>
                <input
                  type="number"
                  min={-1}
                  max={3}
                  step={0.1}
                  value={beta}
                  onChange={(e) => setBeta(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                  aria-label="Beta"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Option delta (optional)</label>
                <input
                  type="number"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={delta}
                  onChange={(e) => setDelta(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 0.5"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                  aria-label="Option delta for adjusted beta"
                />
                <p className="text-xs text-slate-500 mt-1">Delta-adjusted β = Δ × β for option exposure</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Results</h4>
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Market Risk Premium</p>
                <p className="text-2xl font-mono text-blue-400">{(marketRiskPremium * 100).toFixed(2)}%</p>
                <p className="text-xs text-slate-500">Rm − Rf</p>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Required Return</p>
                <p className="text-2xl font-mono text-white">{(requiredReturn * 100).toFixed(2)}%</p>
                <p className="text-xs text-slate-500">E(Ri) = Rf + β(Rm − Rf)</p>
              </div>
              {deltaAdjustedBeta != null && (
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Delta-Adjusted Beta</p>
                  <p className="text-2xl font-mono text-amber-400">{deltaAdjustedBeta.toFixed(3)}</p>
                  <p className="text-xs text-slate-500">Δ × β — effective beta for option</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Security Market Line</h4>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={400}
              height={220}
              className="w-full max-w-full h-[220px]"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Green dot: your asset (β={beta}, E(R)={(requiredReturn * 100).toFixed(1)}%)
          </p>
        </div>
      </div>
    </div>
  );
};
