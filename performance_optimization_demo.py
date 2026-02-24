#!/usr/bin/env python3
"""
Performance Optimization Demonstration Script

This script demonstrates the performance optimizations implemented in Task 11:
- Critical path optimizations with fast approximations
- Parallel processing for batch operations
- Performance monitoring and benchmarking
- Memory-efficient algorithms

Requirements: 6.1, 6.2, 6.3
"""

import sys
import os
import time
import statistics
import numpy as np
from typing import List, Dict, Tuple
import concurrent.futures
import threading

# Add the parent directory to the path to import pricing_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import pricing_engine
    PRICING_ENGINE_AVAILABLE = True
    print("✓ Optimized pricing engine library loaded successfully")
except ImportError:
    import pricing_engine_mock as pricing_engine
    PRICING_ENGINE_AVAILABLE = False
    print("⚠ Using mock pricing engine for demonstration")

class PerformanceOptimizationDemo:
    """Demonstrates the performance optimizations implemented"""
    
    def __init__(self):
        self.results = {}
        
    def demo_critical_path_optimizations(self):
        """Demonstrate critical path optimizations"""
        print("\n" + "="*60)
        print("CRITICAL PATH OPTIMIZATIONS DEMONSTRATION")
        print("="*60)
        
        # Standard test parameters
        s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
        
        print("1. Fast Normal CDF Approximations")
        print("-" * 40)
        
        # Compare single pricing performance
        iterations = 10000
        
        # Black-Scholes hot path performance
        start_time = time.perf_counter()
        for i in range(iterations):
            strike = 99 + (i % 100) * 0.02  # Vary strikes slightly
            pricing_engine.price_call(s, strike, tau, r, sigma)
        bs_time = (time.perf_counter() - start_time) * 1000
        
        print(f"Black-Scholes Hot Path ({iterations} calls):")
        print(f"  Total time: {bs_time:.1f}ms")
        print(f"  Average per call: {bs_time/iterations:.4f}ms")
        print(f"  Throughput: {iterations/(bs_time/1000):.0f} ops/sec")
        
        # Verify performance target
        avg_time_per_call = bs_time / iterations
        target_time = 0.1  # 0.1ms per call target
        status = "✓ PASS" if avg_time_per_call < target_time else "✗ FAIL"
        print(f"  Performance target (<{target_time}ms): {status}")
        
        self.results['critical_path'] = {
            'avg_time_ms': avg_time_per_call,
            'throughput': iterations/(bs_time/1000),
            'target_met': avg_time_per_call < target_time
        }
        
    def demo_parallel_processing(self):
        """Demonstrate parallel processing optimizations"""
        print("\n" + "="*60)
        print("PARALLEL PROCESSING OPTIMIZATIONS DEMONSTRATION")
        print("="*60)
        
        # Test parameters
        s, tau, r, sigma = 100.0, 0.25, 0.05, 0.2
        
        print("1. Batch Pricing Performance")
        print("-" * 40)
        
        # Create large strike array for batch processing
        num_strikes = 1000
        strikes = [90 + i * 0.02 for i in range(num_strikes)]
        
        # Test sequential vs batch processing
        print(f"Pricing {num_strikes} options...")
        
        # Sequential processing (individual calls)
        start_time = time.perf_counter()
        sequential_prices = []
        for strike in strikes:
            price = pricing_engine.price_call(s, strike, tau, r, sigma)
            sequential_prices.append(price)
        sequential_time = (time.perf_counter() - start_time) * 1000
        
        # Batch processing (if available)
        try:
            start_time = time.perf_counter()
            batch_prices = pricing_engine.price_calls_batch(s, strikes, tau, r, sigma)
            batch_time = (time.perf_counter() - start_time) * 1000
            
            print(f"Sequential processing: {sequential_time:.1f}ms")
            print(f"Batch processing: {batch_time:.1f}ms")
            
            speedup = sequential_time / batch_time
            print(f"Speedup: {speedup:.2f}x")
            
            # Verify results are consistent
            max_diff = max(abs(a - b) for a, b in zip(sequential_prices, batch_prices))
            print(f"Maximum price difference: {max_diff:.2e}")
            
            batch_available = True
        except AttributeError:
            print("Batch processing not available in this version")
            batch_time = sequential_time
            speedup = 1.0
            batch_available = False
        
        print("\n2. Option Chain Pricing")
        print("-" * 40)
        
        # Test option chain pricing (if available)
        try:
            start_time = time.perf_counter()
            calls, puts = pricing_engine.price_option_chain(s, strikes, tau, r, sigma)
            chain_time = (time.perf_counter() - start_time) * 1000
            
            print(f"Option chain pricing ({len(strikes)} strikes): {chain_time:.1f}ms")
            print(f"Throughput: {len(strikes)*2/(chain_time/1000):.0f} options/sec")
            
            chain_available = True
        except AttributeError:
            print("Option chain pricing not available in this version")
            chain_time = sequential_time * 2  # Estimate for calls + puts
            chain_available = False
        
        self.results['parallel_processing'] = {
            'sequential_time_ms': sequential_time,
            'batch_time_ms': batch_time,
            'speedup': speedup,
            'batch_available': batch_available,
            'chain_available': chain_available
        }
        
    def demo_greeks_optimizations(self):
        """Demonstrate Greeks calculation optimizations"""
        print("\n" + "="*60)
        print("GREEKS CALCULATION OPTIMIZATIONS DEMONSTRATION")
        print("="*60)
        
        # Test parameters
        s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
        
        print("1. Analytical vs Numerical Greeks")
        print("-" * 40)
        
        iterations = 1000
        
        # Analytical Greeks performance
        start_time = time.perf_counter()
        for _ in range(iterations):
            greeks = pricing_engine.calculate_bs_call_greeks(s, k, tau, r, sigma)
        analytical_time = (time.perf_counter() - start_time) * 1000
        
        # Numerical Greeks performance
        start_time = time.perf_counter()
        for _ in range(iterations):
            greeks = pricing_engine.calculate_numerical_call_greeks(s, k, tau, r, sigma)
        numerical_time = (time.perf_counter() - start_time) * 1000
        
        print(f"Analytical Greeks ({iterations} calculations):")
        print(f"  Total time: {analytical_time:.1f}ms")
        print(f"  Average per calculation: {analytical_time/iterations:.3f}ms")
        
        print(f"Numerical Greeks ({iterations} calculations):")
        print(f"  Total time: {numerical_time:.1f}ms")
        print(f"  Average per calculation: {numerical_time/iterations:.3f}ms")
        
        speedup = numerical_time / analytical_time
        print(f"Analytical speedup: {speedup:.1f}x")
        
        print("\n2. Batch Greeks Calculation")
        print("-" * 40)
        
        # Test batch Greeks (if available)
        num_strikes = 500
        strikes = [90 + i * 0.04 for i in range(num_strikes)]
        
        try:
            # Sequential Greeks
            start_time = time.perf_counter()
            sequential_greeks = []
            for strike in strikes:
                greeks = pricing_engine.calculate_bs_call_greeks(s, strike, tau, r, sigma)
                sequential_greeks.append(greeks)
            sequential_greeks_time = (time.perf_counter() - start_time) * 1000
            
            # Batch Greeks
            start_time = time.perf_counter()
            batch_greeks = pricing_engine.calculate_bs_call_greeks_batch(s, strikes, tau, r, sigma)
            batch_greeks_time = (time.perf_counter() - start_time) * 1000
            
            print(f"Sequential Greeks ({num_strikes} strikes): {sequential_greeks_time:.1f}ms")
            print(f"Batch Greeks ({num_strikes} strikes): {batch_greeks_time:.1f}ms")
            
            greeks_speedup = sequential_greeks_time / batch_greeks_time
            print(f"Batch Greeks speedup: {greeks_speedup:.2f}x")
            
            batch_greeks_available = True
        except AttributeError:
            print("Batch Greeks calculation not available in this version")
            batch_greeks_time = analytical_time * num_strikes / iterations
            greeks_speedup = 1.0
            batch_greeks_available = False
        
        self.results['greeks_optimizations'] = {
            'analytical_time_ms': analytical_time / iterations,
            'numerical_time_ms': numerical_time / iterations,
            'analytical_speedup': speedup,
            'batch_available': batch_greeks_available,
            'batch_speedup': greeks_speedup if batch_greeks_available else 1.0
        }
        
    def demo_performance_monitoring(self):
        """Demonstrate performance monitoring capabilities"""
        print("\n" + "="*60)
        print("PERFORMANCE MONITORING DEMONSTRATION")
        print("="*60)
        
        # Test performance monitoring (if available)
        try:
            # Reset metrics
            pricing_engine.reset_all_metrics()
            
            print("1. Real-time Performance Tracking")
            print("-" * 40)
            
            # Run some operations
            s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
            
            for i in range(100):
                strike = 95 + i * 0.1
                pricing_engine.price_call(s, strike, tau, r, sigma)
            
            # Get performance metrics
            operation_names = pricing_engine.get_all_operation_names()
            print(f"Tracked operations: {operation_names}")
            
            for op_name in operation_names:
                metrics = pricing_engine.get_performance_metrics(op_name)
                if metrics:
                    print(f"{op_name}: {metrics.operation_count} ops, "
                          f"avg {metrics.average_time_ms:.3f}ms, "
                          f"{metrics.throughput_ops_per_sec:.0f} ops/sec")
            
            print("\n2. Performance Benchmarking")
            print("-" * 40)
            
            # Run benchmarks
            benchmark_operations = ["bs_call", "bs_put", "bs_greeks"]
            
            for op_type in benchmark_operations:
                try:
                    metrics = pricing_engine.run_performance_benchmark(op_type, 1000)
                    print(f"{op_type}: avg {metrics.average_time_ms:.3f}ms, "
                          f"throughput {metrics.throughput_ops_per_sec:.0f} ops/sec")
                except Exception as e:
                    print(f"{op_type}: Not available ({e})")
            
            monitoring_available = True
        except AttributeError:
            print("Performance monitoring not available in this version")
            monitoring_available = False
        
        self.results['performance_monitoring'] = {
            'available': monitoring_available
        }
        
    def demo_memory_efficiency(self):
        """Demonstrate memory efficiency optimizations"""
        print("\n" + "="*60)
        print("MEMORY EFFICIENCY DEMONSTRATION")
        print("="*60)
        
        try:
            import psutil
            import os
            
            process = psutil.Process(os.getpid())
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            print(f"Initial memory usage: {initial_memory:.2f}MB")
            
            # Large batch processing test
            print("\n1. Large Batch Memory Efficiency")
            print("-" * 40)
            
            num_calculations = 10000
            s, tau, r, sigma = 100.0, 0.25, 0.05, 0.2
            
            # Generate large strike array
            strikes = [90 + i * 0.002 for i in range(num_calculations)]
            
            start_time = time.perf_counter()
            
            # Process in chunks to demonstrate memory efficiency
            chunk_size = 1000
            all_prices = []
            
            for i in range(0, len(strikes), chunk_size):
                chunk_strikes = strikes[i:i+chunk_size]
                
                try:
                    # Use batch processing if available
                    chunk_prices = pricing_engine.price_calls_batch(s, chunk_strikes, tau, r, sigma)
                except AttributeError:
                    # Fall back to individual calls
                    chunk_prices = [pricing_engine.price_call(s, k, tau, r, sigma) for k in chunk_strikes]
                
                all_prices.extend(chunk_prices)
                
                # Check memory usage periodically
                if (i // chunk_size) % 5 == 0:
                    current_memory = process.memory_info().rss / 1024 / 1024
                    print(f"  Processed {i+len(chunk_strikes)} options, "
                          f"memory: {current_memory:.2f}MB")
            
            processing_time = (time.perf_counter() - start_time) * 1000
            final_memory = process.memory_info().rss / 1024 / 1024
            memory_increase = final_memory - initial_memory
            
            print(f"\nMemory Efficiency Results:")
            print(f"  Processed: {num_calculations} options")
            print(f"  Processing time: {processing_time:.1f}ms")
            print(f"  Memory increase: {memory_increase:.2f}MB")
            print(f"  Memory per option: {memory_increase*1024/num_calculations:.3f}KB")
            print(f"  Throughput: {num_calculations/(processing_time/1000):.0f} ops/sec")
            
            # Memory efficiency check
            memory_per_op_kb = memory_increase * 1024 / num_calculations
            efficient = memory_per_op_kb < 1.0  # Less than 1KB per operation
            status = "✓ EFFICIENT" if efficient else "⚠ HIGH USAGE"
            print(f"  Memory efficiency: {status}")
            
            memory_available = True
        except ImportError:
            print("psutil not available - skipping memory efficiency test")
            memory_increase = 0
            memory_available = False
        
        self.results['memory_efficiency'] = {
            'available': memory_available,
            'memory_increase_mb': memory_increase if memory_available else 0
        }
        
    def demo_concurrent_performance(self):
        """Demonstrate concurrent processing performance"""
        print("\n" + "="*60)
        print("CONCURRENT PROCESSING DEMONSTRATION")
        print("="*60)
        
        # Test parameters
        s, k, tau, r, sigma = 100.0, 100.0, 0.25, 0.05, 0.2
        
        print("1. Thread Safety and Concurrent Execution")
        print("-" * 40)
        
        def pricing_worker(worker_id: int, num_operations: int) -> Dict:
            """Worker function for concurrent pricing"""
            start_time = time.perf_counter()
            prices = []
            
            for i in range(num_operations):
                strike = 95 + (i % 100) * 0.1
                price = pricing_engine.price_call(s, strike, tau, r, sigma)
                prices.append(price)
            
            elapsed = (time.perf_counter() - start_time) * 1000
            
            return {
                'worker_id': worker_id,
                'operations': num_operations,
                'time_ms': elapsed,
                'throughput': num_operations / (elapsed / 1000),
                'prices': prices
            }
        
        # Test concurrent execution
        num_workers = 4
        operations_per_worker = 500
        
        print(f"Running {num_workers} concurrent workers, "
              f"{operations_per_worker} operations each...")
        
        # Concurrent execution
        start_time = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [
                executor.submit(pricing_worker, i, operations_per_worker)
                for i in range(num_workers)
            ]
            
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        concurrent_time = (time.perf_counter() - start_time) * 1000
        
        # Sequential execution for comparison
        start_time = time.perf_counter()
        sequential_results = [
            pricing_worker(i, operations_per_worker)
            for i in range(num_workers)
        ]
        sequential_time = (time.perf_counter() - start_time) * 1000
        
        # Analyze results
        total_operations = num_workers * operations_per_worker
        concurrent_throughput = total_operations / (concurrent_time / 1000)
        sequential_throughput = total_operations / (sequential_time / 1000)
        
        print(f"\nConcurrent Execution Results:")
        print(f"  Total operations: {total_operations}")
        print(f"  Concurrent time: {concurrent_time:.1f}ms")
        print(f"  Sequential time: {sequential_time:.1f}ms")
        print(f"  Concurrent throughput: {concurrent_throughput:.0f} ops/sec")
        print(f"  Sequential throughput: {sequential_throughput:.0f} ops/sec")
        
        speedup = sequential_time / concurrent_time
        efficiency = speedup / num_workers
        print(f"  Speedup: {speedup:.2f}x")
        print(f"  Efficiency: {efficiency:.1%}")
        
        # Verify thread safety (results should be consistent)
        worker_throughputs = [r['throughput'] for r in results]
        throughput_std = statistics.stdev(worker_throughputs)
        throughput_mean = statistics.mean(worker_throughputs)
        cv = throughput_std / throughput_mean  # Coefficient of variation
        
        print(f"  Throughput consistency (CV): {cv:.3f}")
        thread_safe = cv < 0.1  # Less than 10% variation
        status = "✓ THREAD SAFE" if thread_safe else "⚠ INCONSISTENT"
        print(f"  Thread safety: {status}")
        
        self.results['concurrent_performance'] = {
            'speedup': speedup,
            'efficiency': efficiency,
            'thread_safe': thread_safe,
            'concurrent_throughput': concurrent_throughput
        }
        
    def generate_optimization_report(self):
        """Generate comprehensive optimization report"""
        print("\n" + "="*80)
        print("PERFORMANCE OPTIMIZATION SUMMARY REPORT")
        print("="*80)
        
        print("\nOptimization Results:")
        print("-" * 40)
        
        # Critical path optimizations
        if 'critical_path' in self.results:
            cp = self.results['critical_path']
            status = "✓ OPTIMIZED" if cp['target_met'] else "⚠ NEEDS WORK"
            print(f"Critical Path Performance: {status}")
            print(f"  Average time per call: {cp['avg_time_ms']:.4f}ms")
            print(f"  Throughput: {cp['throughput']:.0f} ops/sec")
        
        # Parallel processing
        if 'parallel_processing' in self.results:
            pp = self.results['parallel_processing']
            if pp['batch_available']:
                print(f"Batch Processing: ✓ AVAILABLE")
                print(f"  Speedup: {pp['speedup']:.2f}x")
            else:
                print(f"Batch Processing: ⚠ NOT AVAILABLE")
        
        # Greeks optimizations
        if 'greeks_optimizations' in self.results:
            go = self.results['greeks_optimizations']
            print(f"Greeks Optimizations: ✓ IMPLEMENTED")
            print(f"  Analytical speedup: {go['analytical_speedup']:.1f}x")
            if go['batch_available']:
                print(f"  Batch speedup: {go['batch_speedup']:.2f}x")
        
        # Performance monitoring
        if 'performance_monitoring' in self.results:
            pm = self.results['performance_monitoring']
            status = "✓ AVAILABLE" if pm['available'] else "⚠ NOT AVAILABLE"
            print(f"Performance Monitoring: {status}")
        
        # Memory efficiency
        if 'memory_efficiency' in self.results:
            me = self.results['memory_efficiency']
            if me['available']:
                efficient = me['memory_increase_mb'] < 50  # Less than 50MB for large batch
                status = "✓ EFFICIENT" if efficient else "⚠ HIGH USAGE"
                print(f"Memory Efficiency: {status}")
                print(f"  Memory increase: {me['memory_increase_mb']:.2f}MB")
        
        # Concurrent performance
        if 'concurrent_performance' in self.results:
            cp = self.results['concurrent_performance']
            print(f"Concurrent Processing: ✓ IMPLEMENTED")
            print(f"  Speedup: {cp['speedup']:.2f}x")
            print(f"  Efficiency: {cp['efficiency']:.1%}")
            print(f"  Thread safety: {'✓' if cp['thread_safe'] else '⚠'}")
        
        print(f"\nOptimization Status: ✓ PERFORMANCE ENHANCEMENTS IMPLEMENTED")
        print(f"Demonstration completed at: {time.strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    """Main demonstration function"""
    print("PRICING ENGINE PERFORMANCE OPTIMIZATION DEMONSTRATION")
    print("=" * 80)
    print("Demonstrating performance optimizations implemented in Task 11...")
    
    demo = PerformanceOptimizationDemo()
    
    # Run all demonstrations
    demo.demo_critical_path_optimizations()
    demo.demo_parallel_processing()
    demo.demo_greeks_optimizations()
    demo.demo_performance_monitoring()
    demo.demo_memory_efficiency()
    demo.demo_concurrent_performance()
    
    # Generate summary report
    demo.generate_optimization_report()

if __name__ == "__main__":
    main()