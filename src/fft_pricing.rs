use pyo3::prelude::*;
use rustfft::{FftPlanner, num_complex::Complex};
use std::f64::consts::PI;

/// FFT-based Carr–Madan pricing for European call options
#[pyfunction]
pub fn price_call_fft(
    s: f64,
    k_min: f64,
    eta: f64,
    n: usize,
    tau: f64,
    r: f64,
    sigma: f64,
    alpha: f64
) -> PyResult<Vec<f64>> {
    // Prepare FFT
    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(n);

    // Build input sequence
    let mut input = Vec::with_capacity(n);
    for j in 0..n {
        let v = j as f64 * eta;
        // Characteristic function for log stock under GBM
        let mu = (s.ln()) + (r - 0.5 * sigma * sigma) * tau;
        let cf = (Complex::i() * v * mu - Complex::from(0.5 * sigma * sigma * v * v * tau)).exp();
        // Damped payoff transform
        let numerator = cf * Complex::new(eta * f64::exp(-r * tau), 0.0);
        let denom = Complex::i() * v + alpha;
        let denom2 = Complex::i() * v + alpha + 1.0;
        input.push(numerator / (denom * denom2));
    }

    // Execute FFT
    let mut output = input.clone();
    fft.process(&mut output);

    // Compute call prices from FFT output
    let mut prices = Vec::with_capacity(n);
    for j in 0..n {
        let k_j = k_min + j as f64 * eta;
        let price = f64::exp(-alpha * k_j) * output[j].re / PI;
        prices.push(price);
    }

    Ok(prices)
}

/// FFT-based Carr–Madan pricing for European put options via parity:
/// P(K) = C(K) - S + K e^{-r τ}
#[pyfunction]
pub fn price_put_fft(
    s: f64,
    eta: f64,
    k_min: f64,
    n: usize,
    tau: f64,
    r: f64,
    sigma: f64,
    alpha: f64
) -> PyResult<Vec<f64>> {
    // First compute calls
    let call_prices = price_call_fft(s, k_min, eta, n, tau, r, sigma, alpha)?;
    // Convert into puts
    let mut put_prices = Vec::with_capacity(n);
    for (j, &c) in call_prices.iter().enumerate() {
        let k_j = k_min + j as f64 * eta;
        let p = c - s + k_j * (-r * tau).exp();
        put_prices.push(p);
    }
    Ok(put_prices)
}

