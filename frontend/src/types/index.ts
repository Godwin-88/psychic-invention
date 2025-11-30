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

export interface BlackScholesResult {
  callPrice: number;
  putPrice: number;
  model: string;
  responseTime: number;
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

export interface FFTPricingResult {
  model: string;
  callSurface: number[];
  putSurface: number[];
  params: {
    k_min: number;
    delta_k: number;
    n: number;
  };
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

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}
