/**
 * PricingWorkspace — multi-model pricer (BS · FFT · Heston) with live quotes.
 *
 * Replaces the previous suites (PricingWorkspace / ResultsDisplay /
 * CompleteSystemIntegration), which targeted an older tabbed UI that no
 * longer exists.
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PricingWorkspace } from '../PricingWorkspace';
import { DataProviderProvider } from '@/context/DataProviderContext';
import { computeCallGreeks, computePutGreeks } from '@/utils/greeks';
import * as api from '@/utils/api';

vi.mock('@/utils/api', () => ({
  priceCallBS: vi.fn(),
  pricePutBS: vi.fn(),
  priceCallFFTOpt: vi.fn(),
  pricePutFFTOpt: vi.fn(),
  priceCallHeston: vi.fn(),
  pricePutHeston: vi.fn(),
  getAssetQuote: vi.fn(),
  getAssetOptions: vi.fn(),
}));

// KaTeX rendering is irrelevant here and slow in jsdom.
vi.mock('@/components/ui/Math', () => ({
  MathBlock: ({ latex }: { latex: string }) => <code data-testid="math">{latex}</code>,
}));

const m = vi.mocked(api);

const renderWorkspace = () =>
  render(
    <DataProviderProvider>
      <PricingWorkspace />
    </DataProviderProvider>,
  );

const priceButton = () => screen.getByRole('button', { name: /Price All Models/ });

/** Inputs in render order: S, K, τ, r, σ (then Heston fields when expanded). */
const numberInputs = () => screen.getAllByRole('spinbutton') as HTMLInputElement[];

function mockPrices({ heston = true } = {}) {
  m.priceCallBS.mockResolvedValue({ price: 4.6150, model: 'Black-Scholes' } as never);
  m.pricePutBS.mockResolvedValue({ price: 3.3728, model: 'Black-Scholes' } as never);
  m.priceCallFFTOpt.mockResolvedValue({ price: 4.6151, model: 'FFT' } as never);
  m.pricePutFFTOpt.mockResolvedValue({ price: 3.3729, model: 'FFT' } as never);
  if (heston) {
    m.priceCallHeston.mockResolvedValue({ price: 4.4000, model: 'Heston' } as never);
    m.pricePutHeston.mockResolvedValue({ price: 3.1600, model: 'Heston' } as never);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('PricingWorkspace — inputs and client-side Greeks', () => {
  it('renders the five option parameters with defaults', () => {
    renderWorkspace();
    const [s, k, tau, r, sigma] = numberInputs();
    expect(s.value).toBe('100');
    expect(k.value).toBe('100');
    expect(tau.value).toBe('0.25');
    expect(r.value).toBe('0.05');
    expect(sigma.value).toBe('0.2');
    expect(screen.getByText('S (Spot)')).toBeInTheDocument();
    expect(screen.getByText('σ (Vol)')).toBeInTheDocument();
  });

  it('shows Black-Scholes Greeks immediately, without a request', () => {
    renderWorkspace();
    const expected = computeCallGreeks({ s: 100, k: 100, tau: 0.25, r: 0.05, sigma: 0.2 });
    expect(screen.getByText(expected.delta.toFixed(4))).toBeInTheDocument();
    expect(screen.getByText(expected.gamma.toFixed(4))).toBeInTheDocument();
    expect(m.priceCallBS).not.toHaveBeenCalled();
  });

  it('switches Greeks to the put when Put is selected', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'put' }));
    const put = computePutGreeks({ s: 100, k: 100, tau: 0.25, r: 0.05, sigma: 0.2 });
    expect(screen.getByText(put.delta.toFixed(4))).toBeInTheDocument();
    expect(screen.getByText(/Greeks · BS put/)).toBeInTheDocument();
  });

  it('recomputes Greeks when an input changes', () => {
    renderWorkspace();
    fireEvent.change(numberInputs()[0], { target: { value: '110' } });
    const expected = computeCallGreeks({ s: 110, k: 100, tau: 0.25, r: 0.05, sigma: 0.2 });
    expect(screen.getByText(expected.delta.toFixed(4))).toBeInTheDocument();
  });

  it('expands the Heston parameters and flags a Feller violation', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /Heston Parameters/ }));
    expect(numberInputs()).toHaveLength(10);
    expect(screen.queryByText(/Feller: 2κθ/)).not.toBeInTheDocument();
    // ξ (vol-of-vol) is the 9th input: 2κθ = 0.16 < ξ² = 0.36
    fireEvent.change(numberInputs()[8], { target: { value: '0.6' } });
    expect(screen.getByText(/Feller: 2κθ/)).toBeInTheDocument();
  });
});

describe('PricingWorkspace — pricing all models', () => {
  it('prices calls and puts with BS, FFT and Heston and shows a card for each', async () => {
    mockPrices();
    renderWorkspace();
    fireEvent.click(priceButton());

    // "Black-Scholes" also labels the static theory box, so wait on result-only text.
    await screen.findByText('Heston SV');
    expect(screen.getByText('FFT (Carr-Madan)')).toBeInTheDocument();
    expect(screen.getByText('Analytical · Closed-form')).toBeInTheDocument();
    expect(screen.getAllByText('$4.6150').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$4.4000').length).toBeGreaterThan(0);

    const bsArgs = { s: 100, k: 100, tau: 0.25, r: 0.05, sigma: 0.2 };
    expect(m.priceCallBS).toHaveBeenCalledWith(bsArgs);
    expect(m.pricePutFFTOpt).toHaveBeenCalledWith(bsArgs);
    expect(m.priceCallHeston).toHaveBeenCalledWith(
      expect.objectContaining({ ...bsArgs, v0: 0.04, kappa: 2, theta: 0.04, sigma_v: 0.3, rho: -0.7 }),
    );
  });

  it('reports model agreement against Black-Scholes', async () => {
    mockPrices();
    renderWorkspace();
    fireEvent.click(priceButton());
    const heading = await screen.findByText(/Model Agreement/);
    const panel = heading.closest('div') as HTMLElement;
    expect(within(panel).getByText(/FFT \(Carr-Madan\) deviation/)).toBeInTheDocument();
    // FFT within 1% of BS; Heston 4.4 vs 4.615 is 4.66% (< 5% threshold)
    expect(within(panel).getAllByText('✓ agree')).toHaveLength(2);
  });

  it('skips Heston and explains why when the Feller condition fails', async () => {
    mockPrices({ heston: false });
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /Heston Parameters/ }));
    fireEvent.change(numberInputs()[8], { target: { value: '0.6' } });
    fireEvent.click(priceButton());

    await screen.findByText('FFT (Carr-Madan)');
    expect(screen.queryByText('Heston SV')).not.toBeInTheDocument();
    expect(m.priceCallHeston).not.toHaveBeenCalled();
    expect(screen.getByText(/Feller condition violated.*Heston skipped/)).toBeInTheDocument();
  });

  it('rejects non-positive inputs without calling the API', async () => {
    renderWorkspace();
    fireEvent.change(numberInputs()[4], { target: { value: '0' } });
    fireEvent.click(priceButton());
    expect(await screen.findByText('S, K, τ, σ must all be positive')).toBeInTheDocument();
    expect(m.priceCallBS).not.toHaveBeenCalled();
  });

  it('shows the API error when pricing fails', async () => {
    mockPrices();
    m.priceCallBS.mockRejectedValue(new Error('Backend unavailable'));
    renderWorkspace();
    fireEvent.click(priceButton());
    expect(await screen.findByText('Backend unavailable')).toBeInTheDocument();
    expect(screen.queryByText('FFT (Carr-Madan)')).not.toBeInTheDocument();
  });
});

describe('PricingWorkspace — live quote', () => {
  it('fills S, K and σ from the quote and the nearest-ATM implied vol', async () => {
    m.getAssetQuote.mockResolvedValue({ symbol: 'AAPL', spot: 187.42, name: 'Apple Inc.', currency: 'USD' });
    m.getAssetOptions.mockResolvedValue({
      symbol: 'AAPL', spot: 187.42, n_contracts: 2,
      contracts: [
        { moneyness: 0.1, implied_vol: 0.4 },
        { moneyness: 0.01, implied_vol: 0.27 },
      ],
    } as never);
    renderWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/Symbol/), { target: { value: 'aapl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load Quote' }));

    await screen.findByText('Apple Inc.');
    const [s, k, , , sigma] = numberInputs();
    expect(s.value).toBe('187.42');
    expect(k.value).toBe('187');
    expect(sigma.value).toBe('0.27');
    // the selected data provider is passed through (default yfinance)
    expect(m.getAssetQuote).toHaveBeenCalledWith('AAPL', 'yfinance');
    expect(m.getAssetOptions).toHaveBeenCalledWith('AAPL', 2, 0.2, 'yfinance');
  });

  it('shows an error for an unknown symbol', async () => {
    m.getAssetQuote.mockRejectedValue(new Error('404'));
    m.getAssetOptions.mockResolvedValue(null as never);
    renderWorkspace();
    fireEvent.change(screen.getByPlaceholderText(/Symbol/), { target: { value: 'ZZZZ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load Quote' }));
    expect(await screen.findByText('Could not load quote for ZZZZ. Check symbol.')).toBeInTheDocument();
  });

  it('disables Load Quote until a symbol is entered', () => {
    renderWorkspace();
    expect(screen.getByRole('button', { name: 'Load Quote' })).toBeDisabled();
  });
});

describe('PricingWorkspace — loading state', () => {
  it('disables the price button while requests are in flight', async () => {
    let resolve!: (v: unknown) => void;
    mockPrices();
    m.priceCallBS.mockReturnValue(new Promise(r => { resolve = r; }) as never);
    renderWorkspace();
    fireEvent.click(priceButton());
    expect(screen.getByRole('button', { name: /Pricing all models/ })).toBeDisabled();
    resolve({ price: 4.615 });
    await waitFor(() => expect(priceButton()).not.toBeDisabled());
  });
});
