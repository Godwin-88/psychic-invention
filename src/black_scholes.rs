use pyo3::prelude::*;
use pyo3::pyfunction;

#[pyfunction]
pub fn price_black_scholes_dummy() -> f64 {
    42.0  // Dummy implementation
}
