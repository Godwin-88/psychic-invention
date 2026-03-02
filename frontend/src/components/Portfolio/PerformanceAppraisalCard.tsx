interface PerformanceAppraisalCardProps {
  data?: Record<string, unknown> | null;
}

function MetricCard({
  label,
  value,
  fmt = 'num',
}: {
  label: string;
  value: number;
  fmt?: 'pct' | 'num';
}) {
  const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  const display = fmt === 'pct' ? `${(num * 100).toFixed(2)}%` : num.toFixed(4);
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono text-white mt-1">{display}</p>
    </div>
  );
}

const PERF_KEYS = ['sharpe_ratio', 'treynor_ratio', 'sortino_ratio', 'm2_modigliani', 'm2_sortino', 'information_ratio', 'appraisal_ratio', 'alpha'] as const;

function hasValidPerfData(data: unknown): data is Record<string, number> {
  if (!data || typeof data !== 'object') return false;
  return PERF_KEYS.every((k) => typeof (data as Record<string, unknown>)[k] === 'number');
}

export const PerformanceAppraisalCard = ({ data }: PerformanceAppraisalCardProps) => {
  if (!hasValidPerfData(data)) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 flex flex-col items-center justify-center min-h-[280px] gap-3 text-center">
        <h3 className="text-lg font-semibold text-white">Performance Appraisal (M1 Part II)</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Go to <span className="text-indigo-400 font-medium">Asset Universe</span>, enter weights, and click
          &quot;Compute Moments &amp; Performance&quot; to see Sharpe, Treynor, Sortino, M², and other appraisal ratios.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Performance Appraisal (M1 Part II)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Sharpe Ratio" value={data.sharpe_ratio} />
        <MetricCard label="Treynor Ratio" value={data.treynor_ratio} />
        <MetricCard label="Sortino Ratio" value={data.sortino_ratio} />
        <MetricCard label="M² (Modigliani)" value={data.m2_modigliani} fmt="pct" />
        <MetricCard label="M²-Sortino" value={data.m2_sortino} fmt="pct" />
        <MetricCard label="Information Ratio" value={data.information_ratio} />
        <MetricCard label="Appraisal Ratio" value={data.appraisal_ratio} />
        <MetricCard label="Alpha" value={data.alpha} fmt="pct" />
      </div>
    </div>
  );
};
