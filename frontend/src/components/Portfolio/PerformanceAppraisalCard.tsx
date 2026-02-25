interface PerformanceAppraisalCardProps {
  data: Record<string, unknown>;
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
  const display = fmt === 'pct' ? `${(value * 100).toFixed(2)}%` : value.toFixed(4);
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono text-white mt-1">{display}</p>
    </div>
  );
}

export const PerformanceAppraisalCard = ({ data }: PerformanceAppraisalCardProps) => (
  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Performance Appraisal (M1 Part II)</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard label="Sharpe Ratio" value={data.sharpe_ratio as number} />
      <MetricCard label="Treynor Ratio" value={data.treynor_ratio as number} />
      <MetricCard label="Sortino Ratio" value={data.sortino_ratio as number} />
      <MetricCard label="M² (Modigliani)" value={data.m2_modigliani as number} fmt="pct" />
      <MetricCard label="M²-Sortino" value={data.m2_sortino as number} fmt="pct" />
      <MetricCard label="Information Ratio" value={data.information_ratio as number} />
      <MetricCard label="Appraisal Ratio" value={data.appraisal_ratio as number} />
      <MetricCard label="Alpha" value={data.alpha as number} fmt="pct" />
    </div>
  </div>
);
