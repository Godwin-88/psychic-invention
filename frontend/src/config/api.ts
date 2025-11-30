// API Configuration - Modular backend connection
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    HEALTH: '/health',
    PRICE_CALL_BS: '/price/call/bs',
    PRICE_PUT_BS: '/price/put/bs',
    PRICE_CALL_FFT: '/price/call/fft',
    PRICE_PUT_FFT: '/price/put/fft',
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
