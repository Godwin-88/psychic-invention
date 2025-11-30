// Core Types - Modular type definitions
export interface OptionRequest {
  s: number;    // Spot price
  k: number;    // Strike price
  tau: number;  // Time to expiration
  r: number;    // Risk-free rate
  sigma: number; // Volatility
}

export interface PricingResponse {
  price: number;
  model: string;
}

export interface FFTRequest extends OptionRequest {
  k_min: number;
  delta_v: number;
  delta_k: number;
  n: number;
  alpha: number;
}

export interface FFTResponse {
  prices: number[];
  model: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  calculationsServed: number;
  uptime: number;
}

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  metrics: {
    speed: string;
    accuracy: string;
    usage: string;
  };
}
