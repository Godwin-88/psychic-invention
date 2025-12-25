use pyo3::prelude::*;
use pyo3::wrap_pyfunction;

mod black_scholes;
mod monte_carlo;
mod fft_pricing;
mod fft_pricing_enhanced;
mod heston;
mod greeks;

#[cfg(test)]
mod fft_pricing_tests;

#[cfg(test)]
mod greeks_tests;

#[cfg(test)]
mod greeks_core_tests;

#[pymodule]
pub fn pricing_engine(_py: Python, m: &PyModule) -> PyResult<()> {
    // Phase 1 - Black-Scholes
    m.add_function(wrap_pyfunction!(black_scholes::price_call, m)?)?;
    m.add_function(wrap_pyfunction!(black_scholes::price_put, m)?)?;
    
    // Phase 2 - Monte Carlo
    m.add_function(wrap_pyfunction!(monte_carlo::price_call_mc, m)?)?;
    m.add_function(wrap_pyfunction!(monte_carlo::price_put_mc, m)?)?;
    
    // Phase 3 - FFT Pricing (Original)
    m.add_function(wrap_pyfunction!(fft_pricing::price_call_fft, m)?)?;
    m.add_function(wrap_pyfunction!(fft_pricing::price_put_fft, m)?)?;
    
    // Phase 3 - FFT Pricing (Enhanced)
    m.add_function(wrap_pyfunction!(fft_pricing_enhanced::price_call_fft_optimized, m)?)?;
    m.add_function(wrap_pyfunction!(fft_pricing_enhanced::price_put_fft_optimized, m)?)?;
    m.add_function(wrap_pyfunction!(fft_pricing_enhanced::price_call_fft_enhanced, m)?)?;
    m.add_function(wrap_pyfunction!(fft_pricing_enhanced::price_put_fft_enhanced, m)?)?;
    
    // Phase 4 - Heston Model
    m.add_function(wrap_pyfunction!(heston::cf_heston, m)?)?;
    m.add_function(wrap_pyfunction!(heston::price_heston_call, m)?)?;
    m.add_function(wrap_pyfunction!(heston::price_heston_put, m)?)?;
    m.add_function(wrap_pyfunction!(heston::validate_feller_condition_py, m)?)?;
    
    // Phase 5 - Greeks Calculator
    m.add_function(wrap_pyfunction!(greeks::calculate_bs_call_greeks, m)?)?;
    m.add_function(wrap_pyfunction!(greeks::calculate_bs_put_greeks, m)?)?;
    m.add_function(wrap_pyfunction!(greeks::calculate_numerical_call_greeks, m)?)?;
    m.add_function(wrap_pyfunction!(greeks::calculate_numerical_put_greeks, m)?)?;
    m.add_function(wrap_pyfunction!(greeks::calculate_fft_call_greeks, m)?)?;
    m.add_function(wrap_pyfunction!(greeks::calculate_fft_put_greeks, m)?)?;
    m.add_function(wrap_pyfunction!(greeks::calculate_heston_call_greeks, m)?)?;
    m.add_function(wrap_pyfunction!(greeks::calculate_heston_put_greeks, m)?)?;
    
    Ok(())
}