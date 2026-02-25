import { useState } from 'react';
import { postPortfolioMoments, postPortfolioPerformance } from '@/utils/api';
import { MomentsPanel } from './MomentsPanel';
import { PerformanceAppraisalCard } from './PerformanceAppraisalCard';

const SAMPLE_RETURNS = [
  [0.01, -0.005, 0.02, 0.015],
  [-0.02, 0.01, -0.01, 0.005],
  [0.015, 0.02, 0.01, -0.005],
  [0.005, -0.01, 0.015, 0.02],
  [-0.01, 0.005, -0.02, 0.01],
  [0.02, 0.015, 0.005, 0.01],
  [-0.005, -0.02, 0.01, 0.015],
  [0.01, 0.005, -0.005, 0.02],
  [0.015, 0.01, 0.02, -0.01],
  [-0.02, 0.015, 0.005, 0.01],
  [0.005, -0.005, 0.01, 0.015],
  [0.01, 0.02, -0.01, 0.005],
  [0.02, -0.01, 0.015, 0.01],
  [-0.01, 0.01, 0.005, -0.005],
  [0.015, 0.005, 0.02, 0.015],
  [0.005, 0.02, -0.015, 0.01],
  [-0.015, -0.005, 0.01, 0.02],
  [0.01, 0.015, 0.005, 0.01],
  [0.02, 0.01, -0.01, 0.015],
  [0.005, -0.01, 0.02, 0.005],
];

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];
const DEFAULT_WEIGHTS = [0.25, 0.25, 0.25, 0.25];

export const PortfolioBuilder = () => {
  const [symbols] = useState(DEFAULT_SYMBOLS);
  const [weights, setWeights] = useState<number[]>(DEFAULT_WEIGHTS);
  const [moments, setMoments] = useState<Record<string, unknown> | null>(null);
  const [performance, setPerformance] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeWeights = (w: number[]) => {
    const sum = w.reduce((a, b) => a + b, 0);
    return sum > 0 ? w.map((x) => x / sum) : w;
  };

  const handleWeightChange = (idx: number, value: number) => {
    const next = [...weights];
    next[idx] = Math.max(0, value);
    setWeights(normalizeWeights(next));
  };

  const handleCompute = async () => {
    setLoading(true);
    setError(null);
    try {
      const norm = normalizeWeights(weights);
      const [momRes, perfRes] = await Promise.all([
        postPortfolioMoments({
          returns: SAMPLE_RETURNS,
          weights: norm,
        }),
        postPortfolioPerformance({
          portfolio_returns: SAMPLE_RETURNS.map((r) => r.reduce((a, b, i) => a + b * norm[i], 0)),
          risk_free_rate: 0.02,
          portfolio_beta: 1.0,
        }),
      ]);
      setMoments(momRes);
      setPerformance(perfRes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to compute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Asset Weights</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {symbols.map((sym, i) => (
            <div key={sym}>
              <label className="block text-sm text-slate-400 mb-1">{sym}</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={weights[i]}
                onChange={(e) => handleWeightChange(i, parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Sum: {(weights.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
        </p>
        <button
          onClick={handleCompute}
          disabled={loading}
          className="mt-4 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium disabled:opacity-50"
        >
          {loading ? 'Computing…' : 'Compute Moments & Performance'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {moments && <MomentsPanel data={moments} />}
      {performance && <PerformanceAppraisalCard data={performance} />}
    </div>
  );
};
