use pyo3::prelude::*;
use statrs::distribution::{Normal, ContinuousCDF};
use std::sync::Arc;
use rayon::prelude::*;

// Pre-computed constants for optimization
const SQRT_2PI: f64 = 2.5066282746310005024;
const INV_SQRT_2PI: f64 = 0.3989422804014326779;

/// Standard normal CDF via the complementary error function.
/// Accurate to ~1e-15 (the previous Abramowitz–Stegun polynomial had ~7.5e-8
/// absolute error, too coarse for implied-vol inversion and far-OTM Greeks).
#[inline]
pub fn norm_cdf(x: f64) -> f64 {
    0.5 * statrs::function::erf::erfc(-x / std::f64::consts::SQRT_2)
}

/// Standard normal PDF.
#[inline]
pub fn norm_pdf(x: f64) -> f64 {
    INV_SQRT_2PI * (-0.5 * x * x).exp()
}

#[inline]
fn fast_normal_cdf(x: f64) -> f64 {
    norm_cdf(x)
}

/// Internal optimized Black-Scholes call pricing (no PyResult wrapper for hot path)
#[inline]
pub fn price_call_internal(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64
) -> f64 {
    // Pre-compute common terms
    let sigma_sqrt_tau = sigma * tau.sqrt();
    let log_s_k = (s / k).ln();
    let r_plus_half_sigma_sq_tau = (r + 0.5 * sigma * sigma) * tau;
    
    let d1 = (log_s_k + r_plus_half_sigma_sq_tau) / sigma_sqrt_tau;
    let d2 = d1 - sigma_sqrt_tau;
    
    // Use fast CDF for hot path performance
    let n_d1 = fast_normal_cdf(d1);
    let n_d2 = fast_normal_cdf(d2);
    let discount = (-r * tau).exp();
    
    s * n_d1 - k * discount * n_d2
}

/// Internal optimized Black-Scholes put pricing (no PyResult wrapper for hot path)
#[inline]
pub fn price_put_internal(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64
) -> f64 {
    let call_price = price_call_internal(s, k, tau, r, sigma);
    let discount = (-r * tau).exp();
    call_price - s + k * discount
}

/// Shared input validation for the Python-facing pricers.
pub fn validate_inputs(s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64) -> PyResult<()> {
    if !(s > 0.0 && k > 0.0 && tau > 0.0 && sigma > 0.0) {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Spot, strike, time to expiry and volatility must be positive",
        ));
    }
    if !r.is_finite() || !q.is_finite() || r.abs() > 1.0 || q.abs() > 1.0 {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Rates r and q must be finite and within [-100%, 100%]",
        ));
    }
    Ok(())
}

/// Compute the Black-Scholes price of a European call option.
///
/// `q` is a continuous dividend (or borrow / foreign-rate) yield. The price is
/// Black–Scholes on the dividend-adjusted spot S·e^(−qτ) (Merton 1973).
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn price_call(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    q: f64,
) -> PyResult<f64> {
    validate_inputs(s, k, tau, r, sigma, q)?;
    Ok(price_call_internal(s * (-q * tau).exp(), k, tau, r, sigma))
}

/// Compute the Black-Scholes price of a European put option via put-call parity.
///
/// `q` is a continuous dividend (or borrow / foreign-rate) yield. The price is
/// Black–Scholes on the dividend-adjusted spot S·e^(−qτ) (Merton 1973).
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0))]
pub fn price_put(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    q: f64,
) -> PyResult<f64> {
    validate_inputs(s, k, tau, r, sigma, q)?;
    Ok(price_put_internal(s * (-q * tau).exp(), k, tau, r, sigma))
}

/// Batch pricing for multiple strikes with parallel processing
#[pyfunction]
pub fn price_calls_batch(
    s: f64,
    strikes: Vec<f64>,
    tau: f64,
    r: f64,
    sigma: f64
) -> PyResult<Vec<f64>> {
    // Input validation
    if s <= 0.0 || tau <= 0.0 || sigma <= 0.0 {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Spot, time, and volatility must be positive"
        ));
    }
    
    // Use parallel processing for large batches
    let results = if strikes.len() > 100 {
        strikes.par_iter()
            .map(|&k| {
                if k <= 0.0 {
                    0.0  // Invalid strike returns 0
                } else {
                    price_call_internal(s, k, tau, r, sigma)
                }
            })
            .collect()
    } else {
        // Sequential processing for small batches to avoid overhead
        strikes.iter()
            .map(|&k| {
                if k <= 0.0 {
                    0.0  // Invalid strike returns 0
                } else {
                    price_call_internal(s, k, tau, r, sigma)
                }
            })
            .collect()
    };
    
    Ok(results)
}

/// Batch pricing for multiple puts with parallel processing
#[pyfunction]
pub fn price_puts_batch(
    s: f64,
    strikes: Vec<f64>,
    tau: f64,
    r: f64,
    sigma: f64
) -> PyResult<Vec<f64>> {
    // Input validation
    if s <= 0.0 || tau <= 0.0 || sigma <= 0.0 {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Spot, time, and volatility must be positive"
        ));
    }
    
    // Use parallel processing for large batches
    let results = if strikes.len() > 100 {
        strikes.par_iter()
            .map(|&k| {
                if k <= 0.0 {
                    0.0  // Invalid strike returns 0
                } else {
                    price_put_internal(s, k, tau, r, sigma)
                }
            })
            .collect()
    } else {
        // Sequential processing for small batches to avoid overhead
        strikes.iter()
            .map(|&k| {
                if k <= 0.0 {
                    0.0  // Invalid strike returns 0
                } else {
                    price_put_internal(s, k, tau, r, sigma)
                }
            })
            .collect()
    };
    
    Ok(results)
}

/// High-performance option chain pricing with parallel processing
#[pyfunction]
pub fn price_option_chain(
    s: f64,
    strikes: Vec<f64>,
    tau: f64,
    r: f64,
    sigma: f64
) -> PyResult<(Vec<f64>, Vec<f64>)> {
    // Input validation
    if s <= 0.0 || tau <= 0.0 || sigma <= 0.0 {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Spot, time, and volatility must be positive"
        ));
    }
    
    // Pre-compute common terms for efficiency
    let sigma_sqrt_tau = sigma * tau.sqrt();
    let r_plus_half_sigma_sq_tau = (r + 0.5 * sigma * sigma) * tau;
    let discount = (-r * tau).exp();
    
    // Use parallel processing for large option chains
    let (calls, puts) = if strikes.len() > 50 {
        let results: Vec<(f64, f64)> = strikes.par_iter()
            .map(|&k| {
                if k <= 0.0 {
                    (0.0, 0.0)  // Invalid strike returns zeros
                } else {
                    let log_s_k = (s / k).ln();
                    let d1 = (log_s_k + r_plus_half_sigma_sq_tau) / sigma_sqrt_tau;
                    let d2 = d1 - sigma_sqrt_tau;
                    
                    let n_d1 = fast_normal_cdf(d1);
                    let n_d2 = fast_normal_cdf(d2);
                    
                    let call_price = s * n_d1 - k * discount * n_d2;
                    let put_price = call_price - s + k * discount;
                    
                    (call_price, put_price)
                }
            })
            .collect();
        
        let calls: Vec<f64> = results.iter().map(|(c, _)| *c).collect();
        let puts: Vec<f64> = results.iter().map(|(_, p)| *p).collect();
        (calls, puts)
    } else {
        // Sequential processing for small chains
        let mut calls = Vec::with_capacity(strikes.len());
        let mut puts = Vec::with_capacity(strikes.len());
        
        for &k in &strikes {
            if k <= 0.0 {
                calls.push(0.0);
                puts.push(0.0);
            } else {
                let log_s_k = (s / k).ln();
                let d1 = (log_s_k + r_plus_half_sigma_sq_tau) / sigma_sqrt_tau;
                let d2 = d1 - sigma_sqrt_tau;
                
                let n_d1 = fast_normal_cdf(d1);
                let n_d2 = fast_normal_cdf(d2);
                
                let call_price = s * n_d1 - k * discount * n_d2;
                let put_price = call_price - s + k * discount;
                
                calls.push(call_price);
                puts.push(put_price);
            }
        }
        
        (calls, puts)
    };
    
    Ok((calls, puts))
}