use pyo3::prelude::*;
use statrs::distribution::{Normal, ContinuousCDF};
use std::f64::consts::PI;

/// Greeks calculation result structure
#[derive(Debug, Clone, Copy)]
#[pyclass]
pub struct Greeks {
    #[pyo3(get)]
    pub delta: f64,
    #[pyo3(get)]
    pub gamma: f64,
    #[pyo3(get)]
    pub theta: f64,
    #[pyo3(get)]
    pub vega: f64,
    #[pyo3(get)]
    pub rho: f64,
}

#[pymethods]
impl Greeks {
    #[new]
    pub fn new(delta: f64, gamma: f64, theta: f64, vega: f64, rho: f64) -> Self {
        Greeks { delta, gamma, theta, vega, rho }
    }
    
    fn __repr__(&self) -> String {
        format!(
            "Greeks(delta={:.6}, gamma={:.6}, theta={:.6}, vega={:.6}, rho={:.6})",
            self.delta, self.gamma, self.theta, self.vega, self.rho
        )
    }
}

/// Trait for pricing models that support Greeks calculation
pub trait PricingModel {
    fn price_call(&self, s: f64, k: f64, tau: f64, r: f64, sigma: f64) -> Result<f64, Box<dyn std::error::Error>>;
    fn price_put(&self, s: f64, k: f64, tau: f64, r: f64, sigma: f64) -> Result<f64, Box<dyn std::error::Error>>;
}

/// Greeks calculator with both analytical and numerical methods
pub struct GreeksCalculator;

impl GreeksCalculator {
    /// Calculate all Greeks using numerical finite difference method
    pub fn calculate_numerical_greeks(
        s: f64, k: f64, tau: f64, r: f64, sigma: f64,
        price_fn: impl Fn(f64, f64, f64, f64, f64) -> Result<f64, PyErr>
    ) -> PyResult<Greeks> {
        // Finite difference parameters
        let ds = s * 0.01;  // 1% bump for spot
        let dt = tau * 0.01; // 1% bump for time
        let dsigma = sigma * 0.01; // 1% bump for volatility
        let dr = 0.0001; // 1 basis point bump for rate
        
        // Base price
        let price_base = price_fn(s, k, tau, r, sigma)?;
        
        // Delta: ∂V/∂S
        let price_up = price_fn(s + ds, k, tau, r, sigma)?;
        let price_down = price_fn(s - ds, k, tau, r, sigma)?;
        let delta = (price_up - price_down) / (2.0 * ds);
        
        // Gamma: ∂²V/∂S²
        let gamma = (price_up - 2.0 * price_base + price_down) / (ds * ds);
        
        // Theta: -∂V/∂t (negative because tau is time to expiration)
        let price_theta = price_fn(s, k, tau - dt, r, sigma)?;
        let theta = -(price_base - price_theta) / dt;
        
        // Vega: ∂V/∂σ
        let price_vega = price_fn(s, k, tau, r, sigma + dsigma)?;
        let vega = (price_vega - price_base) / dsigma;
        
        // Rho: ∂V/∂r
        let price_rho = price_fn(s, k, tau, r + dr, sigma)?;
        let rho = (price_rho - price_base) / dr;
        
        Ok(Greeks::new(delta, gamma, theta, vega, rho))
    }
    
    /// Calculate Black-Scholes Greeks analytically for improved accuracy
    pub fn calculate_bs_analytical_greeks(
        s: f64, k: f64, tau: f64, r: f64, sigma: f64, is_call: bool
    ) -> PyResult<Greeks> {
        let sqrt_tau = tau.sqrt();
        let d1 = ((s / k).ln() + (r + 0.5 * sigma * sigma) * tau) / (sigma * sqrt_tau);
        let d2 = d1 - sigma * sqrt_tau;
        
        let norm = Normal::new(0.0, 1.0).unwrap();
        let n_d1 = norm.cdf(d1);
        let n_d2 = norm.cdf(d2);
        let phi_d1 = (-0.5 * d1 * d1).exp() / (2.0 * PI).sqrt();
        
        // Delta
        let delta = if is_call {
            n_d1
        } else {
            n_d1 - 1.0
        };
        
        // Gamma (same for calls and puts)
        let gamma = phi_d1 / (s * sigma * sqrt_tau);
        
        // Theta
        let theta = if is_call {
            -(s * phi_d1 * sigma) / (2.0 * sqrt_tau) - r * k * (-r * tau).exp() * n_d2
        } else {
            -(s * phi_d1 * sigma) / (2.0 * sqrt_tau) + r * k * (-r * tau).exp() * (1.0 - n_d2)
        };
        
        // Vega (same for calls and puts)
        let vega = s * phi_d1 * sqrt_tau;
        
        // Rho
        let rho = if is_call {
            k * tau * (-r * tau).exp() * n_d2
        } else {
            -k * tau * (-r * tau).exp() * (1.0 - n_d2)
        };
        
        Ok(Greeks::new(delta, gamma, theta, vega, rho))
    }
}

// Python interface functions
#[pyfunction]
pub fn calculate_bs_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64
) -> PyResult<Greeks> {
    GreeksCalculator::calculate_bs_analytical_greeks(s, k, tau, r, sigma, true)
}

#[pyfunction]
pub fn calculate_bs_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64
) -> PyResult<Greeks> {
    GreeksCalculator::calculate_bs_analytical_greeks(s, k, tau, r, sigma, false)
}

#[pyfunction]
pub fn calculate_numerical_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64
) -> PyResult<Greeks> {
    use crate::black_scholes::price_call;
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, sigma, price_call)
}

#[pyfunction]
pub fn calculate_numerical_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64
) -> PyResult<Greeks> {
    use crate::black_scholes::price_put;
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, sigma, price_put)
}

// FFT Greeks calculation
#[pyfunction]
pub fn calculate_fft_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64
) -> PyResult<Greeks> {
    use crate::fft_pricing_enhanced::price_call_fft_optimized;
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, sigma, price_call_fft_optimized)
}

#[pyfunction]
pub fn calculate_fft_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64
) -> PyResult<Greeks> {
    use crate::fft_pricing_enhanced::price_put_fft_optimized;
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, sigma, price_put_fft_optimized)
}

// Heston Greeks calculation
#[pyfunction]
pub fn calculate_heston_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, v0: f64, theta: f64, kappa: f64, sigma_v: f64, rho: f64
) -> PyResult<Greeks> {
    use crate::heston::price_heston_call;
    let price_fn = |s: f64, k: f64, tau: f64, r: f64, _sigma: f64| -> Result<f64, PyErr> {
        price_heston_call(s, k, tau, r, v0, theta, kappa, sigma_v, rho)
    };
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, v0.sqrt(), price_fn)
}

#[pyfunction]
pub fn calculate_heston_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, v0: f64, theta: f64, kappa: f64, sigma_v: f64, rho: f64
) -> PyResult<Greeks> {
    use crate::heston::price_heston_put;
    let price_fn = |s: f64, k: f64, tau: f64, r: f64, _sigma: f64| -> Result<f64, PyErr> {
        price_heston_put(s, k, tau, r, v0, theta, kappa, sigma_v, rho)
    };
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, v0.sqrt(), price_fn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_bs_analytical_greeks_basic() {
        let s = 100.0;
        let k = 100.0;
        let tau = 1.0;
        let r = 0.05;
        let sigma = 0.2;
        
        let greeks = calculate_bs_call_greeks(s, k, tau, r, sigma).unwrap();
        
        // Basic sanity checks
        assert!(greeks.delta > 0.0 && greeks.delta < 1.0, "Call delta should be between 0 and 1");
        assert!(greeks.gamma > 0.0, "Gamma should be positive");
        assert!(greeks.vega > 0.0, "Vega should be positive");
        assert!(greeks.rho > 0.0, "Call rho should be positive");
    }
    
    #[test]
    fn test_numerical_vs_analytical_consistency() {
        let s = 100.0;
        let k = 100.0;
        let tau = 1.0;
        let r = 0.05;
        let sigma = 0.2;
        
        let analytical = calculate_bs_call_greeks(s, k, tau, r, sigma).unwrap();
        let numerical = calculate_numerical_call_greeks(s, k, tau, r, sigma).unwrap();
        
        // Should be close but not exact due to finite difference approximation
        assert_relative_eq!(analytical.delta, numerical.delta, epsilon = 0.01);
        assert_relative_eq!(analytical.gamma, numerical.gamma, epsilon = 0.05);
        assert_relative_eq!(analytical.vega, numerical.vega, epsilon = 0.01);
        assert_relative_eq!(analytical.rho, numerical.rho, epsilon = 0.01);
    }
}