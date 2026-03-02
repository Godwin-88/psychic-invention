import { useState } from 'react';
import { postPortfolioCoskewness } from '@/utils/api';
import { downloadFile, generateFilename } from '@/utils/export';

const SAMPLE_RETURNS = [
  [0.01, -0.01, 0.02],
  [0.02, 0.005, -0.01],
  [0.015, 0.02, 0.01],
  [0.005, -0.01, 0.015],
  [-0.01, 0.005, -0.02],
  [0.02, 0.015, 0.005],
  [-0.005, -0.02, 0.01],
  [0.01, 0.005, -0.005],
  [0.015, 0.01, 0.02],
  [0.005, -0.01, 0.02],
];
const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL'];
const DEFAULT_WEIGHTS = [0.33, 0.33, 0.34];

export const CoskewnessHeatmap = () => {
  const [weights, setWeights] = useState<number[]>(DEFAULT_WEIGHTS);
  const [result, setResult] = useState<{
    portfolio_skewness: number;
    excess_kurtosis_warning: boolean;
    coskewness_matrix: number[][];
  } | null>(null);
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
    setResult(null);
    try {
      const res = await postPortfolioCoskewness({
        returns: SAMPLE_RETURNS,
        weights: normalizeWeights(weights),
      });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Coskewness computation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!result) return;
    const payload = {
      timestamp: new Date().toISOString(),
      symbols: DEFAULT_SYMBOLS,
      weights,
      ...result,
    };
    const json = JSON.stringify(payload, null, 2);
    downloadFile(json, generateFilename('portfolio_coskewness', 'json'), 'application/json');
  };

  const handleExportCSV = () => {
    if (!result) return;
    const rows = [
      ['Metric', 'Value'],
      ['Portfolio Skewness', result.portfolio_skewness.toFixed(6)],
      ['Excess Kurtosis Warning', String(result.excess_kurtosis_warning)],
      [],
      ['Coskewness Matrix (M3)'],
      [DEFAULT_SYMBOLS.join(',')],
      ...result.coskewness_matrix.map((r) => r.map((v) => v.toFixed(6)).join(',')),
    ];
    const csv = rows.map((r) => (Array.isArray(r) ? r.join(',') : r)).join('\n');
    downloadFile(csv, generateFilename('portfolio_coskewness', 'csv'), 'text/csv');
  };

  // Heatmap color scale: blue (negative) -> gray (0) -> orange (positive)
  const heatColor = (val: number) => {
    const v = Math.max(-1, Math.min(1, val));
    if (v < 0) {
      const t = (v + 1) / 2;
      return `rgb(${Math.round(59 + (99 - 59) * t)}, ${Math.round(130 + (179 - 130) * t)}, ${Math.round(246 + (255 - 246) * t)})`;
    }
    const t = v;
    return `rgb(${Math.round(251 - (251 - 146) * t)}, ${Math.round(146 + (64 - 146) * t)}, ${Math.round(60 + (50 - 60) * t)})`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Higher-Order Statistics (M2 L2)</h3>
        <p className="text-sm text-slate-400 mb-4">
          Coskewness matrix M₃ and portfolio skewness via Kronecker product. Positive coskewness: correlated upside; negative: tail risk.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {DEFAULT_SYMBOLS.map((sym, i) => (
            <div key={sym}>
              <label className="block text-sm text-slate-400 mb-1">{sym} weight</label>
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
        <p className="text-xs text-slate-500 mb-4">Sum: {(weights.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%</p>

        <div className="flex gap-2">
          <button
            onClick={handleCompute}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Computing…' : 'Compute Coskewness'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-300 text-sm">{error}</div>
      )}

      {result && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-white">Results</h4>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
              >
                Export JSON
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
              <p className="text-slate-400 text-sm">Portfolio Skewness</p>
              <p className="font-mono text-white text-lg">{result.portfolio_skewness.toFixed(4)}</p>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
              <p className="text-slate-400 text-sm">Excess Kurtosis Warning</p>
              <p className={`font-medium ${result.excess_kurtosis_warning ? 'text-amber-400' : 'text-emerald-400'}`}>
                {result.excess_kurtosis_warning ? 'Heavy tails — VaR may underestimate' : 'Within normal range'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-sm mb-2">Coskewness Matrix (M₃)</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-slate-600 bg-slate-800/80 p-2 text-slate-400 text-left"></th>
                    {DEFAULT_SYMBOLS.map((s) => (
                      <th key={s} className="border border-slate-600 bg-slate-800/80 p-2 text-slate-300">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.coskewness_matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-600 bg-slate-800/50 p-2 text-slate-400 font-medium">
                        {DEFAULT_SYMBOLS[i]}
                      </td>
                      {row.map((val, j) => (
                        <td
                          key={j}
                          className="border border-slate-600 p-2 font-mono text-center"
                          style={{ backgroundColor: heatColor(val) }}
                        >
                          {val.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Blue = negative | Gray = ~0 | Orange = positive</p>
          </div>
        </div>
      )}
    </div>
  );
};
