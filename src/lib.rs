use pyo3::prelude::*;
use pyo3::wrap_pyfunction;

mod black_scholes;
mod monte_carlo;
mod fft_pricing;
mod heston;

#[pymodule]
pub fn pricing_engine(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(black_scholes::price_call, m)?)?;
    m.add_function(wrap_pyfunction!(black_scholes::price_put, m)?)?;
    m.add_function(wrap_pyfunction!(monte_carlo::price_call_mc, m)?)?;
    m.add_function(wrap_pyfunction!(monte_carlo::price_put_mc, m)?)?;
    m.add_function(wrap_pyfunction!(fft_pricing::price_call_fft, m)?)?;
    m.add_function(wrap_pyfunction!(fft_pricing::price_put_fft, m)?)?;
    m.add_function(wrap_pyfunction!(heston::cf_heston, m)?)?;
    m.add_function(wrap_pyfunction!(heston::price_heston_call, m)?)?;
    Ok(())
}

