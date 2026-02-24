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

export const getCacheStats = async (): Promise<{ l1_cache_size: number; l2_cache_size: number; l1_cache_info: number; l2_cache_info: number; rate_limiter_failures: number }> => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.MARKET_DATA_CACHE_STATS);
  return response.data;
};

export const clearCache = async (): Promise<{ status: string; message: string; timestamp: string }> => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.MARKET_DATA_CACHE_CLEAR);
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
