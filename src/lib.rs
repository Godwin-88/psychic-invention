use pyo3::prelude::*;
use pyo3::wrap_pyfunction;

mod black_scholes;

#[pymodule]
pub fn pricing_engine(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(black_scholes::price_call, m)?)?;
    m.add_function(wrap_pyfunction!(black_scholes::price_put, m)?)?;
    Ok(())
}