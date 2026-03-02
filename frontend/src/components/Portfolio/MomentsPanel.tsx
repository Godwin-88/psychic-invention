interface MomentsPanelProps {
  data?: Record<string, unknown> | null;
}

const REQUIRED_KEYS = ['portfolio_return', 'portfolio_volatility', 'portfolio_beta', 'skewness', 'kurtosis_excess', 'systematic_risk', 'non_systematic_risk'] as const;

function hasValidMomentsData(data: unknown): data is Record<string, number> {
  if (!data || typeof data !== 'object') return false;
  return REQUIRED_KEYS.every((k) => typeof (data as Record<string, unknown>)[k] === 'number');
}

export const MomentsPanel = ({ data }: MomentsPanelProps) => {
  if (!hasValidMomentsData(data)) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 flex flex-col items-center justify-center min-h-[280px] gap-3 text-center">
        <h3 className="text-lg font-semibold text-white">Sample Moments (M1 L1)</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Go to <span className="text-indigo-400 font-medium">Asset Universe</span>, enter weights, and click
          &quot;Compute Moments &amp; Performance&quot; to see portfolio return, volatility, beta, and higher moments.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Sample Moments (M1 L1)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Portfolio Return" value={data.portfolio_return} fmt="pct" />
        <MetricCard label="Portfolio Volatility" value={data.portfolio_volatility} fmt="pct" />
        <MetricCard label="Portfolio Beta" value={data.portfolio_beta} />
        <MetricCard label="Skewness" value={data.skewness} />
        <MetricCard label="Kurtosis (excess)" value={data.kurtosis_excess} />
        <MetricCard label="Systematic Risk" value={data.systematic_risk} fmt="pct" />
        <MetricCard label="Non-Systematic Risk" value={data.non_systematic_risk} fmt="pct" />
      </div>
    </div>
  );
};

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
