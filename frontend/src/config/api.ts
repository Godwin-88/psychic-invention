// API Configuration - Modular backend connection
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    HEALTH: '/health',
    PRICE_CALL_BS: '/price/call/bs',
    PRICE_PUT_BS: '/price/put/bs',
    PRICE_CALL_FFT: '/price/call/fft',
    PRICE_PUT_FFT: '/price/put/fft',
    // Market Data endpoints
    MARKET_DATA_HEALTH: '/market-data/health',
    MARKET_DATA_SPOT: '/market-data/spot',
    MARKET_DATA_OPTION_CHAIN: '/market-data/option-chain',
    MARKET_DATA_SYMBOLS: '/market-data/symbols',
    MARKET_DATA_CACHE_STATS: '/market-data/cache/stats',
    MARKET_DATA_CACHE_CLEAR: '/market-data/cache/clear',
  },
  TIMEOUT: 10000,
} as const;

export const DEMO_CONFIG = {
  REFRESH_INTERVAL: 5000, // 5 seconds
  SAMPLE_CALCULATIONS: 1000,
  PERFORMANCE_METRICS: {
    BS_AVG_TIME: 2,
    MC_AVG_TIME: 45,
    FFT_AVG_TIME: 15,
  },
} as const;
