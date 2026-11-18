use pyo3::prelude::*;
use rayon::prelude::*;

// Pre-computed constants for optimization
const INV_SQRT_2PI: f64 = 0.3989422804014326779;

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

#[inline]
fn fast_normal_pdf(x: f64) -> f64 {
    crate::black_scholes::norm_pdf(x)
}

#[inline]
fn fast_normal_cdf(x: f64) -> f64 {
    crate::black_scholes::norm_cdf(x)
}

/// Unit conventions shared by EVERY Greeks function (analytical, numerical,
/// FFT, Heston) so results are comparable and can be aggregated:
/// - delta, gamma: per unit of spot
/// - theta: per calendar day (annual / 365)
/// - vega: per 1 volatility point (∂V/∂σ / 100)
/// - rho: per 1% change in rate (∂V/∂r / 100)
pub const DAYS_PER_YEAR: f64 = 365.0;

/// Greeks calculator with both analytical and numerical methods
pub struct GreeksCalculator;

impl GreeksCalculator {
    /// Calculate all Greeks using numerical finite difference method
    pub fn calculate_numerical_greeks(
        s: f64, k: f64, tau: f64, r: f64, sigma: f64,
        price_fn: impl Fn(f64, f64, f64, f64, f64) -> Result<f64, PyErr>
    ) -> PyResult<Greeks> {
        // 0.5% relative bumps: robust for pricers with ~1e-8 numerical noise
        // (FFT, Heston quadrature).
        Self::calculate_numerical_greeks_with_bump(s, k, tau, r, sigma, 0.005, price_fn)
    }

    /// Finite-difference Greeks with a configurable relative bump. Use a small
    /// bump (≈1e-4) only for pricers accurate to machine precision (closed-form
    /// Black–Scholes); noisy pricers need larger bumps to keep gamma stable.
    pub fn calculate_numerical_greeks_with_bump(
        s: f64, k: f64, tau: f64, r: f64, sigma: f64, bump: f64,
        price_fn: impl Fn(f64, f64, f64, f64, f64) -> Result<f64, PyErr>
    ) -> PyResult<Greeks> {
        let ds = s * bump;
        let dt = tau * bump;
        let dsigma = sigma * bump;
        let dr = 0.01 * bump; // 0.5% bump ⇒ 0.5 bp
        
        // Base price
        let price_base = price_fn(s, k, tau, r, sigma)?;
        
        // Delta: ∂V/∂S (central difference)
        let price_up = price_fn(s + ds, k, tau, r, sigma)?;
        let price_down = price_fn(s - ds, k, tau, r, sigma)?;
        let delta = (price_up - price_down) / (2.0 * ds);
        
        // Gamma: ∂²V/∂S² (second derivative)
        let gamma = (price_up - 2.0 * price_base + price_down) / (ds * ds);
        
        // Theta: ∂V/∂t = −∂V/∂τ (one-sided towards expiry), per calendar day
        let dt = dt.min(tau * 0.5);
        let price_theta = price_fn(s, k, tau - dt, r, sigma)?;
        let theta = -(price_base - price_theta) / dt / DAYS_PER_YEAR;

        // Vega: ∂V/∂σ (central difference), per 1 vol point
        let price_vega_up = price_fn(s, k, tau, r, sigma + dsigma)?;
        let price_vega_dn = price_fn(s, k, tau, r, sigma - dsigma)?;
        let vega = (price_vega_up - price_vega_dn) / (2.0 * dsigma) / 100.0;

        // Rho: ∂V/∂r (central difference), per 1% rate move
        let price_rho_up = price_fn(s, k, tau, r + dr, sigma)?;
        let price_rho_dn = price_fn(s, k, tau, r - dr, sigma)?;
        let rho = (price_rho_up - price_rho_dn) / (2.0 * dr) / 100.0;

        Ok(Greeks::new(delta, gamma, theta, vega, rho))
    }
    
    /// Calculate Black-Scholes Greeks analytically for improved accuracy and speed
    #[inline]
    pub fn calculate_bs_analytical_greeks(
        s: f64, k: f64, tau: f64, r: f64, sigma: f64, is_call: bool
    ) -> PyResult<Greeks> {
        Self::calculate_bs_analytical_greeks_q(s, k, tau, r, sigma, 0.0, is_call)
    }

    /// Black–Scholes–Merton Greeks with continuous dividend yield `q`.
    pub fn calculate_bs_analytical_greeks_q(
        s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64, is_call: bool
    ) -> PyResult<Greeks> {
        crate::black_scholes::validate_inputs(s, k, tau, r, sigma, q)?;
        let sqrt_tau = tau.sqrt();
        let sigma_sqrt_tau = sigma * sqrt_tau;
        let d1 = ((s / k).ln() + (r - q + 0.5 * sigma * sigma) * tau) / sigma_sqrt_tau;
        let d2 = d1 - sigma_sqrt_tau;

        let n_d1 = fast_normal_cdf(d1);
        let n_d2 = fast_normal_cdf(d2);
        let phi_d1 = fast_normal_pdf(d1);
        let df_r = (-r * tau).exp();
        let df_q = (-q * tau).exp();

        let delta = if is_call { df_q * n_d1 } else { df_q * (n_d1 - 1.0) };
        let gamma = df_q * phi_d1 / (s * sigma_sqrt_tau);

        let decay = -(s * df_q * phi_d1 * sigma) / (2.0 * sqrt_tau);
        let theta_annual = if is_call {
            decay - r * k * df_r * n_d2 + q * s * df_q * n_d1
        } else {
            decay + r * k * df_r * (1.0 - n_d2) - q * s * df_q * (1.0 - n_d1)
        };
        let theta = theta_annual / DAYS_PER_YEAR;

        let vega = s * df_q * phi_d1 * sqrt_tau / 100.0;
        let rho = if is_call {
            k * tau * df_r * n_d2 / 100.0
        } else {
            -k * tau * df_r * (1.0 - n_d2) / 100.0
        };

        Ok(Greeks::new(delta, gamma, theta, vega, rho))
    }

    /// Batch Greeks calculation with parallel processing
    pub fn calculate_bs_greeks_batch(
        s: f64,
        strikes: &[f64],
        tau: f64,
        r: f64,
        sigma: f64,
        is_call: bool
    ) -> Vec<Greeks> {
        // Pre-compute common terms once for all strikes
        let sqrt_tau = tau.sqrt();
        let r_plus_half_sigma_sq_tau = (r + 0.5 * sigma * sigma) * tau;
        let discount = (-r * tau).exp();
        let log_s = s.ln();
        
        // Use parallel processing for large batches
        if strikes.len() > 50 {
            strikes.par_iter()
                .map(|&k| {
                    if k <= 0.0 {
                        Greeks::new(0.0, 0.0, 0.0, 0.0, 0.0)
                    } else {
                        Self::calculate_single_bs_greeks_optimized(
                            s, k, log_s, sqrt_tau, sigma, r,
                            r_plus_half_sigma_sq_tau, discount, is_call
                        )
                    }
                })
                .collect()
        } else {
            // Sequential processing for small batches
            strikes.iter()
                .map(|&k| {
                    if k <= 0.0 {
                        Greeks::new(0.0, 0.0, 0.0, 0.0, 0.0)
                    } else {
                        Self::calculate_single_bs_greeks_optimized(
                            s, k, log_s, sqrt_tau, sigma, r,
                            r_plus_half_sigma_sq_tau, discount, is_call
                        )
                    }
                })
                .collect()
        }
    }
    
    /// Optimized single Greeks calculation with pre-computed terms
    #[inline]
    #[allow(clippy::too_many_arguments)]
    fn calculate_single_bs_greeks_optimized(
        s: f64,
        k: f64,
        log_s: f64,
        sqrt_tau: f64,
        sigma: f64,
        r: f64,
        r_plus_half_sigma_sq_tau: f64,
        discount: f64,
        is_call: bool
    ) -> Greeks {
        let tau = sqrt_tau * sqrt_tau;
        let sigma_sqrt_tau = sigma * sqrt_tau;
        let d1 = (log_s - k.ln() + r_plus_half_sigma_sq_tau) / sigma_sqrt_tau;
        let d2 = d1 - sigma_sqrt_tau;

        let n_d1 = fast_normal_cdf(d1);
        let n_d2 = fast_normal_cdf(d2);
        let phi_d1 = fast_normal_pdf(d1);

        let delta = if is_call { n_d1 } else { n_d1 - 1.0 };
        let gamma = phi_d1 / (s * sigma_sqrt_tau);

        // Theta (per calendar day): −Sφ(d1)σ/(2√τ) ∓ rKe^{−rτ}N(±d2)
        let decay = -(s * phi_d1 * sigma) / (2.0 * sqrt_tau);
        let theta_annual = if is_call {
            decay - r * k * discount * n_d2
        } else {
            decay + r * k * discount * (1.0 - n_d2)
        };
        let theta = theta_annual / DAYS_PER_YEAR;

        let vega = (s * phi_d1 * sqrt_tau) / 100.0;
        let rho = if is_call {
            (k * tau * discount * n_d2) / 100.0
        } else {
            -(k * tau * discount * (1.0 - n_d2)) / 100.0
        };

        Greeks::new(delta, gamma, theta, vega, rho)
    }
}

// Python interface functions
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn calculate_bs_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64
) -> PyResult<Greeks> {
    GreeksCalculator::calculate_bs_analytical_greeks_q(s, k, tau, r, sigma, q, true)
}

#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn calculate_bs_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64
) -> PyResult<Greeks> {
    GreeksCalculator::calculate_bs_analytical_greeks_q(s, k, tau, r, sigma, q, false)
}

/// Batch Greeks calculation for calls
#[pyfunction]
pub fn calculate_bs_call_greeks_batch(
    s: f64,
    strikes: Vec<f64>,
    tau: f64,
    r: f64,
    sigma: f64
) -> PyResult<Vec<Greeks>> {
    Ok(GreeksCalculator::calculate_bs_greeks_batch(s, &strikes, tau, r, sigma, true))
}

/// Batch Greeks calculation for puts
#[pyfunction]
pub fn calculate_bs_put_greeks_batch(
    s: f64,
    strikes: Vec<f64>,
    tau: f64,
    r: f64,
    sigma: f64
) -> PyResult<Vec<Greeks>> {
    Ok(GreeksCalculator::calculate_bs_greeks_batch(s, &strikes, tau, r, sigma, false))
}

#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn calculate_numerical_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64
) -> PyResult<Greeks> {
    use crate::black_scholes::price_call;
    let f = |s, k, tau, r, sigma| price_call(s, k, tau, r, sigma, q);
    GreeksCalculator::calculate_numerical_greeks_with_bump(s, k, tau, r, sigma, 1e-4, f)
}

#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn calculate_numerical_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64
) -> PyResult<Greeks> {
    use crate::black_scholes::price_put;
    let f = |s, k, tau, r, sigma| price_put(s, k, tau, r, sigma, q);
    GreeksCalculator::calculate_numerical_greeks_with_bump(s, k, tau, r, sigma, 1e-4, f)
}

// FFT Greeks calculation
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn calculate_fft_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64
) -> PyResult<Greeks> {
    use crate::fft_pricing_enhanced::price_call_fft_optimized;
    let f = |s, k, tau, r, sigma| price_call_fft_optimized(s, k, tau, r, sigma, q);
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, sigma, f)
}

#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn calculate_fft_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64
) -> PyResult<Greeks> {
    use crate::fft_pricing_enhanced::price_put_fft_optimized;
    let f = |s, k, tau, r, sigma| price_put_fft_optimized(s, k, tau, r, sigma, q);
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, sigma, f)
}

// Heston Greeks calculation
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, v0, theta, kappa, sigma_v, rho, q=0.0))]
#[allow(clippy::too_many_arguments)]
pub fn calculate_heston_call_greeks(
    s: f64, k: f64, tau: f64, r: f64, v0: f64, theta: f64, kappa: f64, sigma_v: f64, rho: f64, q: f64
) -> PyResult<Greeks> {
    use crate::heston::price_heston_call;
    // Vega is taken with respect to the instantaneous volatility √v0:
    // the bumped σ maps back to v0 = σ².
    let price_fn = |s: f64, k: f64, tau: f64, r: f64, sigma: f64| -> Result<f64, PyErr> {
        price_heston_call(s, k, sigma * sigma, r, kappa, theta, sigma_v, rho, tau, q)
    };
    GreeksCalculator::calculate_numerical_greeks(s, k, tau, r, v0.sqrt(), price_fn)
}

#[pyfunction]
#[pyo3(signature = (s, k, tau, r, v0, theta, kappa, sigma_v, rho, q=0.0))]
#[allow(clippy::too_many_arguments)]
pub fn calculate_heston_put_greeks(
    s: f64, k: f64, tau: f64, r: f64, v0: f64, theta: f64, kappa: f64, sigma_v: f64, rho: f64, q: f64
) -> PyResult<Greeks> {
    use crate::heston::price_heston_put;
    // Vega is taken with respect to the instantaneous volatility √v0:
    // the bumped σ maps back to v0 = σ².
    let price_fn = |s: f64, k: f64, tau: f64, r: f64, sigma: f64| -> Result<f64, PyErr> {
        price_heston_put(s, k, sigma * sigma, r, kappa, theta, sigma_v, rho, tau, q)
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
        
        let greeks = calculate_bs_call_greeks(s, k, tau, r, sigma, 0.0).unwrap();
        
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
        
        let analytical = calculate_bs_call_greeks(s, k, tau, r, sigma, 0.0).unwrap();
        let numerical = calculate_numerical_call_greeks(s, k, tau, r, sigma, 0.0).unwrap();
        
        // Should be close but not exact due to finite difference approximation
        assert_relative_eq!(analytical.delta, numerical.delta, epsilon = 0.01);
        assert_relative_eq!(analytical.gamma, numerical.gamma, epsilon = 0.05);
        assert_relative_eq!(analytical.vega, numerical.vega, epsilon = 0.01);
        assert_relative_eq!(analytical.rho, numerical.rho, epsilon = 0.01);
    }
}