// Custom Hooks - Modular state management
import { useState, useEffect } from 'react';
import { checkHealth, priceCallBS, pricePutBS, priceCallFFT, pricePutFFT } from '@/utils/api';
import type {
  OptionRequest,
  BlackScholesResult,
  FFTRequest,
  FFTPricingResult,
} from '@/types';

export const useHealthCheck = () => {
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await checkHealth();
        setIsHealthy(true);
      } catch {
        setIsHealthy(false);
      } finally {
        setLoading(false);
      }
    };

    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, loading };
};

export const useBlackScholesPricing = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BlackScholesResult | null>(null);

  const calculate = async (request: OptionRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      const [call, put] = await Promise.all([
        priceCallBS(request),
        pricePutBS(request),
      ]);
      const endTime = performance.now();
      
      setResult({
        callPrice: call.price,
        putPrice: put.price,
        model: call.model,
        responseTime: Math.round(endTime - startTime),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return { calculate, loading, error, result };
};

export const useFFTPricing = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FFTPricingResult | null>(null);

  const calculate = async (request: FFTRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await Promise.all([
        priceCallFFT(request),
        pricePutFFT(request),
      ]);

      const [callSurface, putSurface] = response;
      setResult({
        model: callSurface.model,
        callSurface: callSurface.prices,
        putSurface: putSurface.prices,
        params: {
          k_min: request.k_min,
          delta_k: request.delta_k,
          n: request.n,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FFT pricing failed');
    } finally {
      setLoading(false);
    }
  };

  return { calculate, loading, error, result };
};

export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    calculationsServed: 0,
    avgResponseTime: 2,
    uptime: 99.9,
  });

  useEffect(() => {
    // Simulate live metrics for demo
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        calculationsServed: prev.calculationsServed + Math.floor(Math.random() * 5) + 1,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
};
