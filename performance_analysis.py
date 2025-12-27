#!/usr/bin/env python3
"""
Performance Analysis and Verification Script

This script analyzes the performance benchmark results and verifies that all
pricing models meet the performance requirements specified in the design document.

Requirements: 6.1, 6.2, 6.3
"""

import sys
import os
import time
import statistics
from typing import Dict, List, Tuple

# Add the parent directory to the path to import pricing_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import pricing_engine
    PRICING_ENGINE_AVAILABLE = True
    print("✓ Pricing engine library loaded successfully")
except ImportError:
    import pricing_engine_mock as pricing_engine
    PRICING_ENGINE_AVAILABLE = False
    print("⚠ Using mock pricing engine for analysis")

class PerformanceAnalyzer:
    """Analyzes and reports performance metrics for all pricing models"""
    
    def __init__(self):
        self.results = {}
        self.requirements = {
            'black_scholes': 100,  # ms
            'fft_pricing': 100,    # ms
            'heston_model': 500,   # ms
            'greeks_calc': 200,    # ms
        }
        
    def measure_function_performance(self, func, *args, iterations=100):
        """Measure the performance of a function over multiple iterations"""
        times = []
        
        # Warmup
        for _ in range(5):
            func(*args)
        
        # Actual measurements
        for _ in range(iterations):
            start = time.perf_counter()
            result = func(*args)
            elapsed = (time.perf_counter() - start) * 1000  # Convert to ms
            times.append(elapsed)
        
        return {
            'min': min(times),
            'max': max(times),
            'mean': statistics.mean(times),
            'median': statistics.median(times),
            'std': statistics.stdev(times) if len(times) > 1 else 0,
            'p95': sorted(times)[int(0.95 * len(times))],
            'p99': sorted(times)[int(0.99 * len(times))],
            'iterations': iterations
        }
    
    def analyze_black_scholes_performance(self):
        """Analyze Black-Scholes pricing performance"""
        print("\n" + "="*60)
        print("BLACK-SCHOLES PERFORMANCE ANALYSIS")
        print("="*60)
        
        # Test parameters
        s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
        
        # Single call performance
        call_perf = self.measure_function_performance(
            pricing_engine.price_call, s, k, tau, r, sigma
        )
        put_perf = self.measure_function_performance(
            pricing_engine.price_put, s, k, tau, r, sigma
        )
        
        print(f"Single Call Pricing:")
        print(f"  Mean: {call_perf['mean']:.3f}ms")
        print(f"  Median: {call_perf['median']:.3f}ms")
        print(f"  P95: {call_perf['p95']:.3f}ms")
        print(f"  P99: {call_perf['p99']:.3f}ms")
        
        print(f"\nSingle Put Pricing:")
        print(f"  Mean: {put_perf['mean']:.3f}ms")
        print(f"  Median: {put_perf['median']:.3f}ms")
        print(f"  P95: {put_perf['p95']:.3f}ms")
        print(f"  P99: {put_perf['p99']:.3f}ms")
        
        # Batch performance test
        def batch_pricing():
            for i in range(100):
                strike = 90 + i * 0.2
                pricing_engine.price_call(s, strike, tau, r, sigma)
        
        batch_perf = self.measure_function_performance(batch_pricing, iterations=50)
        
        print(f"\nBatch Pricing (100 calls):")
        print(f"  Mean: {batch_perf['mean']:.3f}ms")
        print(f"  Median: {batch_perf['median']:.3f}ms")
        print(f"  P95: {batch_perf['p95']:.3f}ms")
        
        # Requirement verification
        requirement_met = call_perf['p95'] < self.requirements['black_scholes']
        status = "✓ PASS" if requirement_met else "✗ FAIL"
        print(f"\nRequirement Verification:")
        print(f"  Target: < {self.requirements['black_scholes']}ms")
        print(f"  Actual P95: {call_perf['p95']:.3f}ms")
        print(f"  Status: {status}")
        
        self.results['black_scholes'] = {
            'call_perf': call_perf,
            'put_perf': put_perf,
            'batch_perf': batch_perf,
            'requirement_met': requirement_met
        }
        
        return requirement_met
    
    def analyze_fft_performance(self):
        """Analyze FFT pricing performance"""
        print("\n" + "="*60)
        print("FFT PRICING PERFORMANCE ANALYSIS")
        print("="*60)
        
        # Test parameters
        s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
        
        # FFT optimized performance
        fft_call_perf = self.measure_function_performance(
            pricing_engine.price_call_fft_optimized, s, k, tau, r, sigma
        )
        fft_put_perf = self.measure_function_performance(
            pricing_engine.price_put_fft_optimized, s, k, tau, r, sigma
        )
        
        print(f"FFT Optimized Call Pricing:")
        print(f"  Mean: {fft_call_perf['mean']:.3f}ms")
        print(f"  Median: {fft_call_perf['median']:.3f}ms")
        print(f"  P95: {fft_call_perf['p95']:.3f}ms")
        print(f"  P99: {fft_call_perf['p99']:.3f}ms")
        
        print(f"\nFFT Optimized Put Pricing:")
        print(f"  Mean: {fft_put_perf['mean']:.3f}ms")
        print(f"  Median: {fft_put_perf['median']:.3f}ms")
        print(f"  P95: {fft_put_perf['p95']:.3f}ms")
        print(f"  P99: {fft_put_perf['p99']:.3f}ms")
        
        # FFT enhanced performance
        try:
            fft_enhanced_perf = self.measure_function_performance(
                pricing_engine.price_call_fft_enhanced, 
                s, k, 50.0, 0.01, 0.5, 2048, tau, r, sigma, 1.5
            )
            
            print(f"\nFFT Enhanced Call Pricing:")
            print(f"  Mean: {fft_enhanced_perf['mean']:.3f}ms")
            print(f"  Median: {fft_enhanced_perf['median']:.3f}ms")
            print(f"  P95: {fft_enhanced_perf['p95']:.3f}ms")
        except Exception as e:
            print(f"\nFFT Enhanced: Not available ({e})")
            fft_enhanced_perf = None
        
        # Requirement verification
        requirement_met = fft_call_perf['p95'] < self.requirements['fft_pricing']
        status = "✓ PASS" if requirement_met else "✗ FAIL"
        print(f"\nRequirement Verification:")
        print(f"  Target: < {self.requirements['fft_pricing']}ms")
        print(f"  Actual P95: {fft_call_perf['p95']:.3f}ms")
        print(f"  Status: {status}")
        
        self.results['fft_pricing'] = {
            'call_perf': fft_call_perf,
            'put_perf': fft_put_perf,
            'enhanced_perf': fft_enhanced_perf,
            'requirement_met': requirement_met
        }
        
        return requirement_met
    
    def analyze_heston_performance(self):
        """Analyze Heston model performance"""
        print("\n" + "="*60)
        print("HESTON MODEL PERFORMANCE ANALYSIS")
        print("="*60)
        
        # Test parameters
        s, k, tau, r = 100.0, 100.0, 0.25, 0.05
        v0, theta, kappa, sigma_v, rho = 0.04, 0.04, 2.0, 0.3, -0.7
        
        # Heston performance
        heston_call_perf = self.measure_function_performance(
            pricing_engine.price_heston_call, 
            s, k, v0, r, kappa, theta, sigma_v, rho, tau,
            iterations=50  # Fewer iterations due to complexity
        )
        heston_put_perf = self.measure_function_performance(
            pricing_engine.price_heston_put,
            s, k, v0, r, kappa, theta, sigma_v, rho, tau,
            iterations=50
        )
        
        print(f"Heston Call Pricing:")
        print(f"  Mean: {heston_call_perf['mean']:.3f}ms")
        print(f"  Median: {heston_call_perf['median']:.3f}ms")
        print(f"  P95: {heston_call_perf['p95']:.3f}ms")
        print(f"  P99: {heston_call_perf['p99']:.3f}ms")
        
        print(f"\nHeston Put Pricing:")
        print(f"  Mean: {heston_put_perf['mean']:.3f}ms")
        print(f"  Median: {heston_put_perf['median']:.3f}ms")
        print(f"  P95: {heston_put_perf['p95']:.3f}ms")
        print(f"  P99: {heston_put_perf['p99']:.3f}ms")
        
        # Requirement verification
        requirement_met = heston_call_perf['p95'] < self.requirements['heston_model']
        status = "✓ PASS" if requirement_met else "✗ FAIL"
        print(f"\nRequirement Verification:")
        print(f"  Target: < {self.requirements['heston_model']}ms")
        print(f"  Actual P95: {heston_call_perf['p95']:.3f}ms")
        print(f"  Status: {status}")
        
        self.results['heston_model'] = {
            'call_perf': heston_call_perf,
            'put_perf': heston_put_perf,
            'requirement_met': requirement_met
        }
        
        return requirement_met
    
    def analyze_greeks_performance(self):
        """Analyze Greeks calculation performance"""
        print("\n" + "="*60)
        print("GREEKS CALCULATION PERFORMANCE ANALYSIS")
        print("="*60)
        
        # Test parameters
        s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
        
        # Black-Scholes Greeks
        bs_greeks_perf = self.measure_function_performance(
            pricing_engine.calculate_bs_call_greeks, s, k, tau, r, sigma
        )
        
        print(f"Black-Scholes Greeks:")
        print(f"  Mean: {bs_greeks_perf['mean']:.3f}ms")
        print(f"  Median: {bs_greeks_perf['median']:.3f}ms")
        print(f"  P95: {bs_greeks_perf['p95']:.3f}ms")
        print(f"  P99: {bs_greeks_perf['p99']:.3f}ms")
        
        # Numerical Greeks
        try:
            numerical_greeks_perf = self.measure_function_performance(
                pricing_engine.calculate_numerical_call_greeks, s, k, tau, r, sigma
            )
            
            print(f"\nNumerical Greeks:")
            print(f"  Mean: {numerical_greeks_perf['mean']:.3f}ms")
            print(f"  Median: {numerical_greeks_perf['median']:.3f}ms")
            print(f"  P95: {numerical_greeks_perf['p95']:.3f}ms")
        except Exception as e:
            print(f"\nNumerical Greeks: Not available ({e})")
            numerical_greeks_perf = None
        
        # FFT Greeks
        try:
            fft_greeks_perf = self.measure_function_performance(
                pricing_engine.calculate_fft_call_greeks, s, k, tau, r, sigma
            )
            
            print(f"\nFFT Greeks:")
            print(f"  Mean: {fft_greeks_perf['mean']:.3f}ms")
            print(f"  Median: {fft_greeks_perf['median']:.3f}ms")
            print(f"  P95: {fft_greeks_perf['p95']:.3f}ms")
        except Exception as e:
            print(f"\nFFT Greeks: Not available ({e})")
            fft_greeks_perf = None
        
        # Heston Greeks
        try:
            v0, theta, kappa, sigma_v, rho = 0.04, 0.04, 2.0, 0.3, -0.7
            heston_greeks_perf = self.measure_function_performance(
                pricing_engine.calculate_heston_call_greeks,
                s, k, tau, r, v0, theta, kappa, sigma_v, rho,
                iterations=20  # Fewer iterations due to complexity
            )
            
            print(f"\nHeston Greeks:")
            print(f"  Mean: {heston_greeks_perf['mean']:.3f}ms")
            print(f"  Median: {heston_greeks_perf['median']:.3f}ms")
            print(f"  P95: {heston_greeks_perf['p95']:.3f}ms")
        except Exception as e:
            print(f"\nHeston Greeks: Not available ({e})")
            heston_greeks_perf = None
        
        # Requirement verification
        requirement_met = bs_greeks_perf['p95'] < self.requirements['greeks_calc']
        status = "✓ PASS" if requirement_met else "✗ FAIL"
        print(f"\nRequirement Verification:")
        print(f"  Target: < {self.requirements['greeks_calc']}ms")
        print(f"  Actual P95: {bs_greeks_perf['p95']:.3f}ms")
        print(f"  Status: {status}")
        
        self.results['greeks_calc'] = {
            'bs_greeks_perf': bs_greeks_perf,
            'numerical_greeks_perf': numerical_greeks_perf,
            'fft_greeks_perf': fft_greeks_perf,
            'heston_greeks_perf': heston_greeks_perf,
            'requirement_met': requirement_met
        }
        
        return requirement_met
    
    def analyze_throughput_performance(self):
        """Analyze overall system throughput"""
        print("\n" + "="*60)
        print("THROUGHPUT PERFORMANCE ANALYSIS")
        print("="*60)
        
        # High-frequency trading simulation
        def hft_simulation():
            s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
            for i in range(1000):
                strike = 99 + (i % 100) * 0.02
                pricing_engine.price_call(s, strike, tau, r, sigma)
        
        hft_perf = self.measure_function_performance(hft_simulation, iterations=10)
        hft_throughput = 1000 / (hft_perf['mean'] / 1000)  # ops/sec
        
        print(f"High-Frequency Trading Simulation (1000 calls):")
        print(f"  Mean time: {hft_perf['mean']:.1f}ms")
        print(f"  Throughput: {hft_throughput:.0f} ops/sec")
        
        # Risk management simulation
        def risk_simulation():
            s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
            for i in range(500):
                strike = 90 + (i % 200) * 0.1
                pricing_engine.calculate_bs_call_greeks(s, strike, tau, r, sigma)
        
        risk_perf = self.measure_function_performance(risk_simulation, iterations=10)
        risk_throughput = 500 / (risk_perf['mean'] / 1000)  # ops/sec
        
        print(f"\nRisk Management Simulation (500 Greeks):")
        print(f"  Mean time: {risk_perf['mean']:.1f}ms")
        print(f"  Throughput: {risk_throughput:.0f} ops/sec")
        
        # Mixed workload simulation
        def mixed_simulation():
            s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
            for i in range(200):
                strike = 85 + (i % 300) * 0.1
                if i % 4 == 0:
                    pricing_engine.price_call(s, strike, tau, r, sigma)
                elif i % 4 == 1:
                    pricing_engine.price_put(s, strike, tau, r, sigma)
                elif i % 4 == 2:
                    pricing_engine.price_call_fft_optimized(s, strike, tau, r, sigma)
                else:
                    pricing_engine.calculate_bs_call_greeks(s, strike, tau, r, sigma)
        
        mixed_perf = self.measure_function_performance(mixed_simulation, iterations=10)
        mixed_throughput = 200 / (mixed_perf['mean'] / 1000)  # ops/sec
        
        print(f"\nMixed Workload Simulation (200 operations):")
        print(f"  Mean time: {mixed_perf['mean']:.1f}ms")
        print(f"  Throughput: {mixed_throughput:.0f} ops/sec")
        
        # Throughput requirements
        hft_target = 1000  # ops/sec
        risk_target = 500  # ops/sec
        mixed_target = 200  # ops/sec
        
        hft_met = hft_throughput >= hft_target
        risk_met = risk_throughput >= risk_target
        mixed_met = mixed_throughput >= mixed_target
        
        print(f"\nThroughput Requirements:")
        print(f"  HFT: {hft_throughput:.0f} ops/sec (target: {hft_target}) {'✓' if hft_met else '✗'}")
        print(f"  Risk: {risk_throughput:.0f} ops/sec (target: {risk_target}) {'✓' if risk_met else '✗'}")
        print(f"  Mixed: {mixed_throughput:.0f} ops/sec (target: {mixed_target}) {'✓' if mixed_met else '✗'}")
        
        return hft_met and risk_met and mixed_met
    
    def generate_summary_report(self):
        """Generate a comprehensive performance summary report"""
        print("\n" + "="*80)
        print("PERFORMANCE BENCHMARK SUMMARY REPORT")
        print("="*80)
        
        all_requirements_met = True
        
        print("\nPerformance Requirements Status:")
        print("-" * 40)
        
        for model, requirement in self.requirements.items():
            if model in self.results:
                met = self.results[model]['requirement_met']
                status = "✓ PASS" if met else "✗ FAIL"
                print(f"{model.replace('_', ' ').title():<20} {status}")
                if not met:
                    all_requirements_met = False
            else:
                print(f"{model.replace('_', ' ').title():<20} ⚠ NOT TESTED")
                all_requirements_met = False
        
        print(f"\nOverall Status: {'✓ ALL REQUIREMENTS MET' if all_requirements_met else '✗ SOME REQUIREMENTS NOT MET'}")
        
        if PRICING_ENGINE_AVAILABLE:
            print("\n✓ Using production pricing engine")
        else:
            print("\n⚠ Using mock pricing engine - results may not reflect actual performance")
        
        print(f"\nBenchmark completed at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        return all_requirements_met

def main():
    """Main performance analysis function"""
    print("PRICING ENGINE PERFORMANCE BENCHMARK")
    print("=" * 80)
    print("Analyzing performance of all pricing models against requirements...")
    
    analyzer = PerformanceAnalyzer()
    
    # Run all performance analyses
    bs_ok = analyzer.analyze_black_scholes_performance()
    fft_ok = analyzer.analyze_fft_performance()
    heston_ok = analyzer.analyze_heston_performance()
    greeks_ok = analyzer.analyze_greeks_performance()
    throughput_ok = analyzer.analyze_throughput_performance()
    
    # Generate summary report
    all_ok = analyzer.generate_summary_report()
    
    # Exit with appropriate code
    sys.exit(0 if all_ok else 1)

if __name__ == "__main__":
    main()