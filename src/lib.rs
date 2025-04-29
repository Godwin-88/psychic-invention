use pyo3::prelude::*;
use pyo3::wrap_pyfunction;

mod black_scholes;

#[pymodule]
fn pricing_engine(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(black_scholes::price_black_scholes_dummy, m)?)?;
    Ok(())
}
