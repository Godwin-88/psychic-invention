use pyo3::prelude::*;
use rustfft::{FftPlanner, num_complex::Complex};
use std::f64::consts::PI;

/// FFT‐based Carr–Madan pricing for European calls
#[pyfunction]
pub fn price_call_fft(
    s: f64,
    k_min: f64,    // 0.0
    eta: f64,      // 0.5
    n: usize,      // 512
    tau: f64,
    r: f64,
    sigma: f64,
    alpha: f64,    // 1.5, damping factor
) -> PyResult<Vec<f64>> {
    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(n);

    // Precompute mu and discount
    let mu = s.ln() + (r - 0.5 * sigma * sigma) * tau;
    let discount = (-r * tau).exp();

    // Build damped integrand
    let mut input = Vec::with_capacity(n);
    for j in 0..n {
        let v = j as f64 * eta;
        let cf = (Complex::i() * v * mu - Complex::from(0.5 * sigma * sigma * v * v * tau)).exp();
        // Damped payoff Fourier integrand:
        let numerator = cf * Complex::new(eta * discount, 0.0);
        let denom1 = Complex::i() * v + alpha;
        let denom2 = denom1 + Complex::new(1.0, 0.0);
        input.push(numerator / (denom1 * denom2));
    }

    // FFT
    let mut output = input.clone();
    fft.process(&mut output);

    // Recover call prices on grid
    let mut prices = Vec::with_capacity(n);
    for j in 0..n {
        let k_j = k_min + j as f64 * eta;
        let price = discount * f64::exp(-alpha * k_j) * output[j].re / PI;
        prices.push(price);
    }

    Ok(prices)
}

/// FFT‐based put pricing via put–call parity
#[pyfunction]
pub fn price_put_fft(
    s: f64,
    k_min: f64,
    eta: f64,
    n: usize,
    tau: f64,
    r: f64,
    sigma: f64,
    alpha: f64,
) -> PyResult<Vec<f64>> {
    let calls = price_call_fft(s, k_min, eta, n, tau, r, sigma, alpha)?;
    let mut puts = Vec::with_capacity(n);
    let discount = (-r * tau).exp();
    for (j, &c) in calls.iter().enumerate() {
        let k_j = k_min + j as f64 * eta;
        let p = c - s + k_j * discount;
        puts.push(p);
    }
    Ok(puts)
}
