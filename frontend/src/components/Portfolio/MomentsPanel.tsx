interface MomentsPanelProps {
  data: Record<string, unknown>;
}

export const MomentsPanel = ({ data }: MomentsPanelProps) => (
  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Sample Moments (M1 L1)</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard label="Portfolio Return" value={data.portfolio_return as number} fmt="pct" />
      <MetricCard label="Portfolio Volatility" value={data.portfolio_volatility as number} fmt="pct" />
      <MetricCard label="Portfolio Beta" value={data.portfolio_beta as number} />
      <MetricCard label="Skewness" value={data.skewness as number} />
      <MetricCard label="Kurtosis (excess)" value={data.kurtosis_excess as number} />
      <MetricCard label="Systematic Risk" value={data.systematic_risk as number} fmt="pct" />
      <MetricCard label="Non-Systematic Risk" value={data.non_systematic_risk as number} fmt="pct" />
    </div>
  </div>
);

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
