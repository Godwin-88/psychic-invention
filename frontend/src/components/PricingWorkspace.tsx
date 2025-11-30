import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { useBlackScholesPricing, useFFTPricing } from '@/hooks/useApi';
import type { OptionRequest, FFTRequest } from '@/types';
import { computeCallGreeks } from '@/utils/greeks';

const defaultOptionRequest: OptionRequest = {
  s: 100,
  k: 100,
  tau: 1,
  r: 0.05,
  sigma: 0.2,
};

const defaultFFTState = {
  s: 100,
  k: 100,
  tau: 1,
  r: 0.05,
  sigma: 0.2,
  alpha: 1.5,
  delta_v: 0.01,
  n: 2048,
};

type FFTState = typeof defaultFFTState;
type PricingWorkspaceProps = {
  defaultTab?: 'bs' | 'fft';
};

export const PricingWorkspace = ({ defaultTab = 'bs' }: PricingWorkspaceProps) => {
  const [tab, setTab] = useState<'bs' | 'fft'>(defaultTab);
  const [optionRequest, setOptionRequest] = useState<OptionRequest>(defaultOptionRequest);
  const [fftState, setFFTState] = useState<FFTState>(defaultFFTState);

  const {
    calculate: runBS,
    loading: bsLoading,
    error: bsError,
    result: bsResult,
  } = useBlackScholesPricing();

  const {
    calculate: runFFT,
    loading: fftLoading,
    error: fftError,
    result: fftResult,
  } = useFFTPricing();

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const greeks = useMemo(() => (bsResult ? computeCallGreeks(optionRequest) : null), [bsResult, optionRequest]);

  const handleOptionChange = (field: keyof OptionRequest, value: string) => {
    setOptionRequest(prev => ({
      ...prev,
      [field]: Number(value) || 0,
    }));
  };

  const handleFFTChange = (field: keyof FFTState, value: string) => {
    setFFTState(prev => ({
      ...prev,
      [field]: Number(value) || 0,
    }));
  };

  const deltaK = useMemo(() => {
    return (2 * Math.PI) / (fftState.n * fftState.delta_v);
  }, [fftState.n, fftState.delta_v]);

  const kMin = useMemo(() => {
    return Math.log(fftState.k) - (fftState.n / 2) * deltaK;
  }, [fftState.k, fftState.n, deltaK]);

  const fftWindow = useMemo(() => {
    if (!fftResult) return [];
    const rows = fftResult.callSurface.map((call, idx) => {
      const logStrike = fftResult.params.k_min + idx * fftResult.params.delta_k;
      const strike = Math.exp(logStrike);
      return {
        strike,
        call,
        put: fftResult.putSurface[idx],
      };
    }).filter(row => Number.isFinite(row.call) && Number.isFinite(row.put));

    if (!rows.length) return [];

    const centerIndex = rows.findIndex(row => row.strike >= fftState.k);
    const start = Math.max(0, (centerIndex === -1 ? rows.length - 5 : centerIndex - 2));
    return rows.slice(start, start + 7);
  }, [fftResult, fftState.k]);

  const submitFFT = () => {
    const payload: FFTRequest = {
      ...fftState,
      tau: fftState.tau,
      k: fftState.k,
      k_min: kMin,
      delta_k: deltaK,
    };
    runFFT(payload);
  };

  return (
    <section className="section-padding bg-slate-950 border-b border-slate-800">
      <div className="container space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3 font-semibold">Interactive workspace</p>
            <h2 className="text-3xl font-bold text-white mb-3">Take models live against the FastAPI backend</h2>
            <p className="text-slate-300 max-w-3xl">
              Choose a pricing model, set parameters, and route the request through the Rust bindings.
              Results persist in the terminal window with contextual metrics for risk teams.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-slate-400">
            <span className="status-dot bg-success"></span>
            <span>Direct to backend</span>
          </div>
        </header>

        <div className="bg-slate-900 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap border-b border-slate-800">
            <button
              className={`workspace-tab ${tab === 'bs' ? 'active' : ''}`}
              onClick={() => setTab('bs')}
            >
              Analytical · Black-Scholes
            </button>
            <button
              className={`workspace-tab ${tab === 'fft' ? 'active' : ''}`}
              onClick={() => setTab('fft')}
            >
              Surface · Carr-Madan FFT
            </button>
          </div>

          {tab === 'bs' && (
            <div className="workspace-panel">
              <div className="grid gap-8 lg:grid-cols-2">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); runBS(optionRequest); }}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(['s', 'k', 'tau', 'r', 'sigma'] as (keyof OptionRequest)[]).map(field => (
                      <label key={field} className="text-sm">
                        <span className="text-slate-400 block mb-2 uppercase tracking-widest">{field.toUpperCase()}</span>
                        <input
                          type="number"
                          value={optionRequest[field]}
                          onChange={(e) => handleOptionChange(field, e.target.value)}
                          className="input-field"
                          step="0.01"
                        />
                      </label>
                    ))}
                  </div>
                  <Button type="submit" loading={bsLoading}>
                    {bsLoading ? 'Pricing...' : 'Calculate Call & Put'}
                  </Button>
                  {bsError && <p className="text-danger text-sm font-mono">Error: {bsError}</p>}
                </form>

                <div className="space-y-6">
                  {bsResult ? (
                    <>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="result-tile">
                          <p className="text-xs uppercase tracking-widest text-slate-400">Call</p>
                          <p className="text-3xl font-mono text-white">${bsResult.callPrice.toFixed(4)}</p>
                        </div>
                        <div className="result-tile">
                          <p className="text-xs uppercase tracking-widest text-slate-400">Put</p>
                          <p className="text-3xl font-mono text-white">${bsResult.putPrice.toFixed(4)}</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="metric-pill">
                          <span className="text-xs text-slate-400">Model</span>
                          <span className="font-semibold">{bsResult.model}</span>
                        </div>
                        <div className="metric-pill">
                          <span className="text-xs text-slate-400">Latency</span>
                          <span className="font-mono">{bsResult.responseTime} ms</span>
                        </div>
                        <div className="metric-pill">
                          <span className="text-xs text-slate-400">Parity</span>
                          <span className="font-mono text-success">S-Ke^(-rT)</span>
                        </div>
                      </div>
                      {greeks && (
                        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Greeks (call)</p>
                          <div className="grid sm:grid-cols-3 gap-3 text-sm font-mono">
                            <span>Δ {greeks.delta.toFixed(3)}</span>
                            <span>Γ {greeks.gamma.toExponential(2)}</span>
                            <span>Θ {greeks.theta.toFixed(3)}</span>
                            <span>ν {greeks.vega.toFixed(3)}</span>
                            <span>ρ {greeks.rho.toFixed(3)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty-state">
                      <p className="text-slate-400 font-mono">Awaiting calculation...</p>
                      <p className="text-xs text-slate-500">Send a payload and results will render here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'fft' && (
            <div className="workspace-panel">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(['s', 'k', 'tau', 'r', 'sigma'] as (keyof FFTState)[]).map(field => (
                      <label key={field} className="text-sm">
                        <span className="text-slate-400 block mb-2 uppercase tracking-widest">{field.toUpperCase()}</span>
                        <input
                          type="number"
                          value={fftState[field]}
                          onChange={(e) => handleFFTChange(field, e.target.value)}
                          className="input-field"
                          step="0.01"
                        />
                      </label>
                    ))}
                    <label className="text-sm">
                      <span className="text-slate-400 block mb-2 uppercase tracking-widest">α (damping)</span>
                      <input
                        type="number"
                        value={fftState.alpha}
                        onChange={(e) => handleFFTChange('alpha', e.target.value)}
                        className="input-field"
                        step="0.1"
                        min="0.5"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-400 block mb-2 uppercase tracking-widest">Δv (frequency)</span>
                      <input
                        type="number"
                        value={fftState.delta_v}
                        onChange={(e) => handleFFTChange('delta_v', e.target.value)}
                        className="input-field"
                        step="0.001"
                        min="0.001"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-400 block mb-2 uppercase tracking-widest">Grid (n)</span>
                      <select
                        value={fftState.n}
                        onChange={(e) => handleFFTChange('n', e.target.value)}
                        className="input-field"
                      >
                        {[1024, 2048, 4096].map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-400 block mb-2 uppercase tracking-widest">Δk (derived)</span>
                      <input
                        value={deltaK.toExponential(3)}
                        className="input-field bg-slate-800"
                        disabled
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-400 block mb-2 uppercase tracking-widest">kmin (derived)</span>
                      <input
                        value={kMin.toFixed(3)}
                        className="input-field bg-slate-800"
                        disabled
                      />
                    </label>
                  </div>
                  <Button className="mt-6" loading={fftLoading} onClick={submitFFT}>
                    {fftLoading ? 'Generating surface...' : 'Generate FFT Surface'}
                  </Button>
                  {fftError && <p className="text-danger text-sm font-mono mt-3">Error: {fftError}</p>}
                </div>

                <div className="space-y-6">
                  {fftResult ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
                        <div className="metric-pill">
                          <span>Model</span>
                          <span className="text-white">{fftResult.model}</span>
                        </div>
                        <div className="metric-pill">
                          <span>Grid</span>
                          <span className="text-white">{fftResult.params.n}</span>
                        </div>
                        <div className="metric-pill">
                          <span>Δk</span>
                          <span className="text-white">{fftResult.params.delta_k.toExponential(2)}</span>
                        </div>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                          <p className="text-xs uppercase tracking-widest text-slate-500">Option chain slice</p>
                          <span className="text-slate-400 text-xs">Centered at K={fftState.k}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm font-mono">
                            <thead>
                              <tr className="text-slate-400 text-xs uppercase tracking-widest">
                                <th className="px-4 py-2 text-left">Strike</th>
                                <th className="px-4 py-2 text-left">Call</th>
                                <th className="px-4 py-2 text-left">Put</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fftWindow.map((row) => (
                                <tr key={row.strike} className="border-t border-slate-800">
                                  <td className="px-4 py-2">${row.strike.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-primary-300">${row.call.toFixed(4)}</td>
                                  <td className="px-4 py-2 text-gold">${row.put.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <p className="text-slate-400 font-mono">Generate an FFT grid to view surface data.</p>
                      <p className="text-xs text-slate-500">We recommend n=2048, α=1.5 for stability.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
