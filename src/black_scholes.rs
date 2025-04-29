use pyo3::prelude::*;
use statrs::distribution::{Normal, Univariate};

/// Compute the Black-Scholes price of a European call option.
#[pyfunction]
pub fn price_call(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64
) -> PyResult<f64> {
    let d1 = ((s / k).ln() + (r + 0.5 * sigma * sigma) * tau) / (sigma * tau.sqrt());
    let d2 = d1 - sigma * tau.sqrt();
    let norm = Normal::new(0.0, 1.0).unwrap();
    let c = s * norm.cdf(d1) - k * (-r * tau).exp() * norm.cdf(d2);
    Ok(c)
}

/// Compute the Black-Scholes price of a European put option via put-call parity.
#[pyfunction]
pub fn price_put(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64
) -> PyResult<f64> {
    let c = price_call(s, k, tau, r, sigma)?;
    let p = c - s + k * (-r * tau).exp();
    Ok(p)
}