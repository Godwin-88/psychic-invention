import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMarketData } from '../useApi';
import * as api from '@/utils/api';

vi.mock('@/utils/api', () => ({ getMarketData: vi.fn() }));
const getMarketData = vi.mocked(api.getMarketData);

describe('useMarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collapses concurrent fetches for the same request into one API call', async () => {
    let release!: () => void;
    getMarketData.mockImplementation(
      () => new Promise(resolve => { release = () => resolve({ symbol: 'AAPL' } as never); }),
    );
    const { result } = renderHook(() => useMarketData('AAPL'));
    let all!: Promise<unknown>;
    act(() => {
      all = Promise.all([
        result.current.fetchMarketData({ symbol: 'AAPL' }),
        result.current.fetchMarketData({ symbol: 'AAPL' }),
        result.current.fetchMarketData({ symbol: 'AAPL' }),
      ]);
    });
    expect(getMarketData).toHaveBeenCalledTimes(1);
    await act(async () => { release(); await all; });
    expect(result.current.data).toEqual({ symbol: 'AAPL' });

    // once settled, a new fetch goes to the API again
    getMarketData.mockResolvedValue({ symbol: 'AAPL' } as never);
    await act(() => result.current.fetchMarketData({ symbol: 'AAPL' }));
    expect(getMarketData).toHaveBeenCalledTimes(2);
  });

  it('does not merge requests for different symbols', async () => {
    getMarketData.mockResolvedValue({ symbol: 'X' } as never);
    const { result } = renderHook(() => useMarketData());
    await act(() => Promise.all([
      result.current.fetchMarketData({ symbol: 'AAPL' }),
      result.current.fetchMarketData({ symbol: 'MSFT' }),
    ]).then(() => undefined));
    expect(getMarketData).toHaveBeenCalledTimes(2);
  });

  it('reports auto-refresh state immediately from its inputs', () => {
    getMarketData.mockResolvedValue({ symbol: 'AAPL' } as never);
    const { result, rerender } = renderHook(({ on }) => useMarketData('AAPL', on), {
      initialProps: { on: false },
    });
    expect(result.current.isAutoRefreshing).toBe(false);
    rerender({ on: true });
    expect(result.current.isAutoRefreshing).toBe(true);
  });
});
