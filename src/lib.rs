use pyo3::prelude::*;
use pyo3::wrap_pyfunction;

mod black_scholes;
mod monte_carlo;
mod fft_pricing;

#[pymodule]
pub fn pricing_engine(_py: Python, m: &PyModule) -> PyResult<()> {
    // Phase 1
    m.add_function(wrap_pyfunction!(black_scholes::price_call, m)?)?;
    m.add_function(wrap_pyfunction!(black_scholes::price_put, m)?)?;
    // Phase 2
    m.add_function(wrap_pyfunction!(monte_carlo::price_call_mc, m)?)?;
    // Phase 3
    m.add_function(wrap_pyfunction!(fft_pricing::price_call_fft, m)?)?;
    Ok(())
}