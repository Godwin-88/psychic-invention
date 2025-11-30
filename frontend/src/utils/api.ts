// API Service - Modular backend communication
import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import type { OptionRequest, PricingResponse, FFTRequest, FFTResponse } from '@/types';

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

// Error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);
