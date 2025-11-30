// Custom Hooks - Modular state management
import { useState, useEffect } from 'react';
import { checkHealth, priceCallBS } from '@/utils/api';
import type { OptionRequest, PricingResponse } from '@/types';

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

export const usePricing = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingResponse | null>(null);

  const calculatePrice = async (request: OptionRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      const response = await priceCallBS(request);
      const endTime = performance.now();
      
      setResult({
        ...response,
        responseTime: Math.round(endTime - startTime),
      } as PricingResponse & { responseTime: number });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return { calculatePrice, loading, error, result };
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
