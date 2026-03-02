// API Service - Modular backend communication
import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import type { 
  OptionRequest, 
  PricingResponse, 
  FFTRequest, 
  FFTResponse,
  MarketDataRequest,
  MarketDataResponse,
  OptionChainRequest,
  OptionChainResponse,
  SupportedSymbolsResponse
} from '@/types';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const checkHealth = async (): Promise<{ status: string }> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.HEALTH);
  return response.data;
};

// Black-Scholes pricing
export const priceCallBS = async (request: OptionRequest): Promise<PricingResponse> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PRICE_CALL_BS, request);
  return response.data;
};

export const pricePutBS = async (request: OptionRequest): Promise<PricingResponse> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PRICE_PUT_BS, request);
  return response.data;
};

// FFT pricing
export const priceCallFFT = async (request: FFTRequest): Promise<FFTResponse> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PRICE_CALL_FFT, request);
  return response.data;
};

export const pricePutFFT = async (request: FFTRequest): Promise<FFTResponse> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PRICE_PUT_FFT, request);
  return response.data;
};

// Greeks (BS, FFT, numerical)
export const postGreeksCall = async (data: { s: number; k: number; tau: number; r: number; sigma: number; model?: string }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.GREEKS_CALL, {
    ...data,
    model: data.model || 'bs',
  });
  return response.data;
};

export const postGreeksPut = async (data: { s: number; k: number; tau: number; r: number; sigma: number; model?: string }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.GREEKS_PUT, {
    ...data,
    model: data.model || 'bs',
  });
  return response.data;
};

// Market Data API functions
export const checkMarketDataHealth = async (): Promise<{ status: string; service: string; api_connection: boolean; timestamp: string }> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.MARKET_DATA_HEALTH);
  return response.data;
};

export const getMarketData = async (request: MarketDataRequest): Promise<MarketDataResponse> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.MARKET_DATA_SPOT, request);
  return response.data;
};

export const getOptionChain = async (request: OptionChainRequest): Promise<OptionChainResponse> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.MARKET_DATA_OPTION_CHAIN, request);
  return response.data;
};

export const getSupportedSymbols = async (): Promise<SupportedSymbolsResponse> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.MARKET_DATA_SYMBOLS);
  return response.data;
};

// Asset Universe (yfinance)
export const getAssetTypes = async (): Promise<{ id: string; label: string }[]> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.ASSETS_TYPES);
  return response.data;
};

export const searchAssets = async (
  query: string,
  type: string = 'all',
  count: number = 50
): Promise<{ symbol: string; type: string; name: string }[]> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.ASSETS_SEARCH, {
    params: { q: query.trim(), type, count },
  });
  return response.data;
};

export const getAssetHistory = async (
  symbol: string,
  period: string = '1mo'
): Promise<{ date: string; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }[]> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.ASSETS_HISTORY, {
    params: { symbol, period },
  });
  return response.data;
};

export const getCacheStats = async (): Promise<{ l1_cache_size: number; l2_cache_size: number; l1_cache_info: number; l2_cache_info: number; rate_limiter_failures: number }> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.MARKET_DATA_CACHE_STATS);
  return response.data;
};

export const clearCache = async (): Promise<{ status: string; message: string; timestamp: string }> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.MARKET_DATA_CACHE_CLEAR);
  return response.data;
};

// Transact Phase 1 API
export const postPortfolioMoments = async (data: { returns: number[][]; weights: number[]; market_returns?: number[] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PORTFOLIO_MOMENTS, data);
  return response.data;
};

export const postPortfolioPerformance = async (data: {
  portfolio_returns: number[];
  risk_free_rate?: number;
  portfolio_beta?: number;
  benchmark_returns?: number[];
  mar?: number;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PORTFOLIO_PERFORMANCE, data);
  return response.data;
};

export const postRiskVar = async (data: {
  returns: number[][];
  weights?: number[];
  alpha?: number;
  horizon_days?: number;
  portfolio_value?: number;
  include_monte_carlo?: boolean;
  mc_simulations?: number;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.RISK_VAR, data);
  return response.data;
};

export const postOptimizeMvo = async (data: {
  covariance: number[][];
  expected_returns: number[];
  target_return?: number;
  risk_free_rate?: number;
  long_only?: boolean;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.OPTIMIZE_MVO, data);
  return response.data;
};

export const postOptimizeMvoFrontier = async (data: {
  covariance: number[][];
  expected_returns: number[];
  risk_free_rate?: number;
  n_points?: number;
  long_only?: boolean;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.OPTIMIZE_MVO_FRONTIER, data);
  return response.data;
};

// Phase 2
export const postOptimizeBlm = async (data: {
  covariance: number[][];
  market_weights: number[];
  P: number[][];
  Q: number[];
  tau?: number;
  risk_aversion?: number;
  risk_free_rate?: number;
  long_only?: boolean;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.OPTIMIZE_BLM, data);
  return response.data;
};

export const postOptimizeRiskParity = async (data: {
  covariance: number[][];
  expected_returns?: number[];
  rho?: number;
  long_only?: boolean;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.OPTIMIZE_RISK_PARITY, data);
  return response.data;
};

export const postOptimizeHrp = async (data: { covariance: number[][] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.OPTIMIZE_HRP, data);
  return response.data;
};

export const postOptimizeKelly = async (data: {
  returns: number[][];
  fractional?: number;
  long_only?: boolean;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.OPTIMIZE_KELLY, data);
  return response.data;
};

export const postOptimizeKellySingle = async (data: { p: number; q: number; a?: number; b?: number }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.OPTIMIZE_KELLY_SINGLE, data);
  return response.data;
};

// Phase 3
export const postFactorsEstimate = async (data: { returns: number[][]; factors: number[][] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.FACTORS_ESTIMATE, data);
  return response.data;
};
export const postFactorsFamaMacbeth = async (data: { returns: number[][]; factors: number[][] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.FACTORS_FAMA_MACBETH, data);
  return response.data;
};
export const postPortfolioCoskewness = async (data: { returns: number[][]; weights: number[] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PORTFOLIO_COSKEWNESS, data);
  return response.data;
};
export const postHestonCalibrate = async (data: { s: number; r: number; strikes: number[]; expiries: number[]; market_prices: number[] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.HESTON_CALIBRATE, data);
  return response.data;
};
export const postVolImpliedSurface = async (data: { s: number; r: number; strikes: number[]; expiries: number[]; market_prices: number[] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.VOL_IMPLIED_SURFACE, data);
  return response.data;
};
export const postFactorsSmartBeta = async (data: { factor_scores: number[]; returns: number[][]; method?: string }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.FACTORS_SMART_BETA, data);
  return response.data;
};
export const postFactorsCrowding = async (data: { factor_loadings: number[][] }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.FACTORS_CROWDING, data);
  return response.data;
};

export const postBlotterTrade = async (data: {
  asset: string;
  direction: 'long' | 'short';
  quantity: number;
  entry_price: number;
  entry_date?: string;
  model_used?: string;
  theoretical_price?: number;
  strategy_tag?: string;
  asset_class?: string;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.BLOTTER_TRADE, data);
  return response.data;
};

export const getBlotterPositions = async (current_prices?: Record<string, number>) => {
  const params = current_prices ? { current_prices: JSON.stringify(current_prices) } : {};
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.BLOTTER_POSITIONS, { params });
  return response.data;
};

export const postBlotterPositions = async (current_prices: Record<string, number>) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.BLOTTER_POSITIONS, { current_prices });
  return response.data;
};

export const getBlotterHistory = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.BLOTTER_HISTORY);
  return response.data;
};

// Phase 4: Scenarios & Behavioral
export const postScenariosDefine = async (data: { name: string; return_shocks?: number[]; vol_shocks?: number[]; corr_shift?: number }) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.SCENARIOS_DEFINE, data);
  return response.data;
};
export const postScenariosRun = async (data: {
  returns: number[][];
  weights: number[];
  return_shocks?: number[];
  vol_shocks?: number[];
  corr_shift?: number;
  historical?: string;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.SCENARIOS_RUN, data);
  return response.data;
};
export const postScenariosProbabilistic = async (data: {
  scenario_returns: number[][];
  scenario_probs: number[];
  target_return: number;
  long_only?: boolean;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.SCENARIOS_PROBABILISTIC, data);
  return response.data;
};
export const postScenariosMonteCarlo = async (data: {
  returns: number[][];
  weights: number[];
  portfolio_value?: number;
  horizon_days?: number;
  n_paths?: number;
  use_t_dist?: boolean;
  df?: number;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.SCENARIOS_MONTE_CARLO, data);
  return response.data;
};
export const postScenariosBehavioral = async (data: {
  returns: number[][];
  weights: number[];
  mode?: 'prospect' | 'herding';
  correlation_shift?: number;
  alpha?: number;
  portfolio_value?: number;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.SCENARIOS_BEHAVIORAL, data);
  return response.data;
};
export const postBlotterAttribution = async (data: {
  portfolio_returns: number[];
  market_returns: number[];
  risk_free_rate?: number;
  factor_betas?: number[];
  factor_returns?: number[][];
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.BLOTTER_ATTRIBUTION, data);
  return response.data;
};
export const postBlotterPnl = async (data: {
  price_history?: { date: string; prices: Record<string, number> }[];
  current_prices?: Record<string, number>;
  from_date?: string;
  to_date?: string;
}) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.BLOTTER_PNL, data);
  return response.data;
};

// Error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);
