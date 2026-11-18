use pyo3::prelude::*;
use pyo3::types::PyComplex;
use num_complex::Complex;
use std::f64::consts::PI;

/// Heston model parameters validation error
#[derive(Debug)]
pub enum HestonError {
    FellerConditionViolated,
    InvalidParameters,
    NumericalIntegrationFailed,
}

impl std::fmt::Display for HestonError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            HestonError::FellerConditionViolated => write!(f, "Feller condition violated: 2*kappa*theta <= xi^2"),
            HestonError::InvalidParameters => write!(f, "Invalid Heston parameters"),
            HestonError::NumericalIntegrationFailed => write!(f, "Numerical integration failed to converge"),
        }
    }
}

impl std::error::Error for HestonError {}

/// Validate Heston parameters satisfy the Feller condition
pub fn validate_feller_condition(kappa: f64, theta: f64, xi: f64) -> Result<(), HestonError> {
    if 2.0 * kappa * theta <= xi * xi {
        Err(HestonError::FellerConditionViolated)
    } else {
        Ok(())
    }
}

/// Validate the Heston parameter domain (positivity, |ρ| ≤ 1).
pub fn validate_heston_domain(v0: f64, kappa: f64, theta: f64, xi: f64, rho: f64) -> Result<(), HestonError> {
    if v0 <= 0.0 || kappa <= 0.0 || theta <= 0.0 || xi <= 0.0 || !(-1.0..=1.0).contains(&rho) {
        return Err(HestonError::InvalidParameters);
    }
    Ok(())
}

/// Validate all Heston parameters, including the Feller condition.
pub fn validate_heston_parameters(v0: f64, kappa: f64, theta: f64, xi: f64, rho: f64) -> Result<(), HestonError> {
    validate_heston_domain(v0, kappa, theta, xi, rho)?;
    validate_feller_condition(kappa, theta, xi)
}

/// Characteristic function of log‐asset price under Heston model
#[pyfunction]
pub fn cf_heston(
    py: Python,
    u: f64,
    s: f64,
    v0: f64,
    r: f64,
    kappa: f64,
    theta: f64,
    xi: f64,
    rho: f64,
    tau: f64,
) -> PyResult<PyObject> {
    let cf = cf_heston_impl(Complex::new(u, 0.0), s, v0, r, kappa, theta, xi, rho, tau);
    let py_c = PyComplex::from_doubles(py, cf.re, cf.im);
    Ok(py_c.into_py(py))
}

/// Internal implementation of the Heston characteristic function of ln(S_T),
/// evaluated at a (possibly complex) argument `u`.
///
/// Uses the Albrecher et al. (2007) "little Heston trap" formulation, which is
/// continuous in `u` (no branch-cut jumps in the complex logarithm).
pub(crate) fn cf_heston_impl(
    u: Complex<f64>,
    s: f64,
    v0: f64,
    r: f64,
    kappa: f64,
    theta: f64,
    xi: f64,
    rho: f64,
    tau: f64,
) -> Complex<f64> {
    if tau <= 0.0 {
        return (Complex::<f64>::i() * u * s.ln()).exp();
    }

    let i = Complex::i();
    let one = Complex::new(1.0, 0.0);
    let xi2 = xi * xi;

    let b = kappa - rho * xi * i * u;
    let d = (b * b + xi2 * (i * u + u * u)).sqrt();
    let g = (b - d) / (b + d);
    let exp_d_tau = (-d * tau).exp();

    let c = kappa * theta / xi2
        * ((b - d) * tau - 2.0 * ((one - g * exp_d_tau) / (one - g)).ln());
    let dd = (b - d) / xi2 * (one - exp_d_tau) / (one - g * exp_d_tau);

    (i * u * (s.ln() + r * tau) + c + dd * v0).exp()
}

/// Adaptive Simpson quadrature on [a, b].
fn adaptive_simpson(f: &impl Fn(f64) -> f64, a: f64, b: f64, tol: f64, max_depth: usize) -> f64 {
    #[allow(clippy::too_many_arguments)]
    fn rec(
        f: &impl Fn(f64) -> f64,
        a: f64,
        b: f64,
        tol: f64,
        whole: f64,
        fa: f64,
        fb: f64,
        fm: f64,
        depth: usize,
    ) -> f64 {
        let m = 0.5 * (a + b);
        let lm = 0.5 * (a + m);
        let rm = 0.5 * (m + b);
        let flm = f(lm);
        let frm = f(rm);
        let left = (m - a) / 6.0 * (fa + 4.0 * flm + fm);
        let right = (b - m) / 6.0 * (fm + 4.0 * frm + fb);
        let delta = left + right - whole;
        if depth == 0 || delta.abs() <= 15.0 * tol {
            return left + right + delta / 15.0;
        }
        rec(f, a, m, tol / 2.0, left, fa, fm, flm, depth - 1)
            + rec(f, m, b, tol / 2.0, right, fm, fb, frm, depth - 1)
    }

    let fa = f(a);
    let fb = f(b);
    let m = 0.5 * (a + b);
    let fm = f(m);
    let whole = (b - a) / 6.0 * (fa + 4.0 * fm + fb);
    rec(f, a, b, tol, whole, fa, fb, fm, max_depth)
}

/// Integrate over [a, b] by splitting into `panels` sub-intervals, each refined
/// adaptively. Splitting prevents the adaptive rule from terminating early on
/// an oscillatory integrand whose coarse samples happen to agree.
fn integrate_panels(f: impl Fn(f64) -> f64, a: f64, b: f64, panels: usize, tol: f64) -> f64 {
    let h = (b - a) / panels as f64;
    let panel_tol = tol / panels as f64;
    (0..panels)
        .map(|j| {
            let lo = a + j as f64 * h;
            adaptive_simpson(&f, lo, lo + h, panel_tol, 30)
        })
        .sum()
}

/// Heston call pricing via the Gil-Pelaez / Heston (1993) probabilities:
///
/// C = S·P1 − K·e^{−rτ}·P2
/// P1 = ½ + (1/π)∫₀^∞ Re[ e^{−iu ln K} φ(u − i) / (iu · φ(−i)) ] du
/// P2 = ½ + (1/π)∫₀^∞ Re[ e^{−iu ln K} φ(u) / (iu) ] du
///
/// where φ is the characteristic function of ln S_T and φ(−i) = E[S_T] = S·e^{rτ}.
#[allow(clippy::too_many_arguments)]
fn price_heston_call_impl(
    s: f64,
    k: f64,
    v0: f64,
    r: f64,
    kappa: f64,
    theta: f64,
    xi: f64,
    rho: f64,
    tau: f64,
    q: f64,
) -> Result<f64, HestonError> {
    price_heston_call_checked(s, k, v0, r, kappa, theta, xi, rho, tau, q, true)
}

/// Heston call with optional Feller enforcement. The pricing formula is valid
/// whether or not 2κθ > ξ² holds (the condition only keeps variance strictly
/// positive); calibrations to market smiles frequently violate it, so the
/// calibrator prices with `enforce_feller = false`.
#[allow(clippy::too_many_arguments)]
pub fn price_heston_call_checked(
    s: f64,
    k: f64,
    v0: f64,
    r: f64,
    kappa: f64,
    theta: f64,
    xi: f64,
    rho: f64,
    tau: f64,
    q: f64,
    enforce_feller: bool,
) -> Result<f64, HestonError> {
    if enforce_feller {
        validate_heston_parameters(v0, kappa, theta, xi, rho)?;
    } else {
        validate_heston_domain(v0, kappa, theta, xi, rho)?;
    }
    if s <= 0.0 || k <= 0.0 {
        return Err(HestonError::InvalidParameters);
    }
    if tau <= 0.0 {
        return Ok((s - k).max(0.0));
    }

    // With a dividend yield the log-price drifts at r − q; φ is evaluated
    // with that drift and the spot leg is discounted at q.
    let drift = r - q;
    let i = Complex::i();
    let ln_k = k.ln();
    let forward = s * (drift * tau).exp(); // φ(−i)

    let p1_integrand = |u: f64| -> f64 {
        let uc = Complex::new(u, 0.0);
        let cf_val = cf_heston_impl(uc - i, s, v0, drift, kappa, theta, xi, rho, tau);
        ((-i * uc * ln_k).exp() * cf_val / (i * uc * forward)).re
    };
    let p2_integrand = |u: f64| -> f64 {
        let uc = Complex::new(u, 0.0);
        let cf_val = cf_heston_impl(uc, s, v0, drift, kappa, theta, xi, rho, tau);
        ((-i * uc * ln_k).exp() * cf_val / (i * uc)).re
    };

    // Both integrands are finite as u → 0⁺; start just above 0 to avoid 0/0.
    // The CF decays roughly like exp(−c·u·√(v̄)·τ); a generous upper limit
    // covers short maturities and low variance.
    let lower = 1e-10;
    let upper = (200.0 / tau.sqrt()).clamp(200.0, 2000.0);
    let tol = 1e-10;

    let i1 = integrate_panels(p1_integrand, lower, upper, 64, tol);
    let i2 = integrate_panels(p2_integrand, lower, upper, 64, tol);
    if !i1.is_finite() || !i2.is_finite() {
        return Err(HestonError::NumericalIntegrationFailed);
    }

    let p1 = 0.5 + i1 / PI;
    let p2 = 0.5 + i2 / PI;
    let spot_pv = s * (-q * tau).exp();
    let call_price = spot_pv * p1 - k * (-r * tau).exp() * p2;

    // Enforce no-arbitrage bounds: max(S e^{−qτ} − K e^{−rτ}, 0) ≤ C ≤ S e^{−qτ}.
    let lower_bound = (spot_pv - k * (-r * tau).exp()).max(0.0);
    Ok(call_price.clamp(lower_bound, spot_pv))
}

/// Heston call pricing via numeric integration
#[pyfunction]
#[pyo3(signature = (s, k, v0, r, kappa, theta, xi, rho, tau, q=0.0, enforce_feller=true))]
#[allow(clippy::too_many_arguments)]
pub fn price_heston_call(
    s: f64,
    k: f64,
    v0: f64,
    r: f64,
    kappa: f64,
    theta: f64,
    xi: f64,
    rho: f64,
    tau: f64,
    q: f64,
    enforce_feller: bool,
) -> PyResult<f64> {
    match price_heston_call_checked(s, k, v0, r, kappa, theta, xi, rho, tau, q, enforce_feller) {
        Ok(price) => Ok(price),
        Err(e) => Err(PyErr::new::<pyo3::exceptions::PyValueError, _>(e.to_string())),
    }
}

/// Price many Heston calls (one per (strike, expiry) pair) in parallel with the
/// GIL released. Used by calibration, where it is the hot loop.
#[pyfunction]
#[pyo3(signature = (s, strikes, expiries, v0, r, kappa, theta, xi, rho, q=0.0, enforce_feller=true))]
#[allow(clippy::too_many_arguments)]
pub fn price_heston_calls_batch(
    py: Python<'_>,
    s: f64,
    strikes: Vec<f64>,
    expiries: Vec<f64>,
    v0: f64,
    r: f64,
    kappa: f64,
    theta: f64,
    xi: f64,
    rho: f64,
    q: f64,
    enforce_feller: bool,
) -> PyResult<Vec<f64>> {
    use rayon::prelude::*;
    if strikes.len() != expiries.len() {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "strikes and expiries must have the same length",
        ));
    }
    let out: Result<Vec<f64>, HestonError> = py.allow_threads(|| {
        strikes
            .par_iter()
            .zip(expiries.par_iter())
            .map(|(&k, &tau)| price_heston_call_checked(s, k, v0, r, kappa, theta, xi, rho, tau, q, enforce_feller))
            .collect()
    });
    out.map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))
}

/// Validate Feller condition from Python
#[pyfunction]
pub fn validate_feller_condition_py(kappa: f64, theta: f64, xi: f64) -> PyResult<bool> {
    Ok(validate_feller_condition(kappa, theta, xi).is_ok())
}

/// Heston put via put–call parity.
#[pyfunction]
#[pyo3(signature = (s, k, v0, r, kappa, theta, xi, rho, tau, q=0.0, enforce_feller=true))]
#[allow(clippy::too_many_arguments)]
pub fn price_heston_put(
    s: f64,
    k: f64,
    v0: f64,
    r: f64,
    kappa: f64,
    theta: f64,
    xi: f64,
    rho: f64,
    tau: f64,
    q: f64,
    enforce_feller: bool,
) -> PyResult<f64> {
    let c = price_heston_call(s, k, v0, r, kappa, theta, xi, rho, tau, q, enforce_feller)?;
    // Put–call parity with dividends: P = C − S e^{−qτ} + K e^{−rτ}
    let p = c - s * (-q * tau).exp() + k * (-r * tau).exp();
    Ok(p.max(0.0))
}


#[cfg(test)]
mod tests {
    use super::*;

    fn bs_call(s: f64, k: f64, r: f64, sigma: f64, tau: f64) -> f64 {
        crate::black_scholes::price_call_internal(s, k, tau, r, sigma)
    }

    #[test]
    fn heston_matches_reference_value() {
        // Standard benchmark: S=K=100, v0=θ=0.04, κ=2, ξ=0.3, ρ=−0.7, r=5%, τ=1
        // Reference ≈ 10.3942 (independent quadrature check).
        let c = price_heston_call_impl(100.0, 100.0, 0.04, 0.05, 2.0, 0.04, 0.3, -0.7, 1.0, 0.0).unwrap();
        assert!((c - 10.3942).abs() < 1e-3, "got {c}");
    }

    #[test]
    fn heston_converges_to_black_scholes_as_vol_of_vol_vanishes() {
        // ξ → 0 with v0 = θ ⇒ constant variance ⇒ Black–Scholes with σ = √θ.
        for &k in &[80.0, 100.0, 120.0] {
            let h = price_heston_call_impl(100.0, k, 0.04, 0.05, 2.0, 0.04, 0.01, 0.0, 1.0, 0.0).unwrap();
            let bs = bs_call(100.0, k, 0.05, 0.2, 1.0);
            assert!((h - bs).abs() < 5e-3, "K={k}: heston {h} vs bs {bs}");
        }
    }

    #[test]
    fn cf_at_minus_i_is_forward() {
        let f = cf_heston_impl(Complex::new(0.0, -1.0), 100.0, 0.04, 0.05, 2.0, 0.04, 0.3, -0.7, 1.0);
        assert!((f.re - 100.0 * 0.05f64.exp()).abs() < 1e-8 && f.im.abs() < 1e-8);
    }

    #[test]
    fn heston_with_dividend_reduces_to_merton() {
        let q = 0.03;
        let h = price_heston_call_impl(100.0, 100.0, 0.04, 0.05, 2.0, 0.04, 0.01, 0.0, 1.0, q).unwrap();
        let bs = bs_call(100.0 * (-q as f64).exp(), 100.0, 0.05, 0.2, 1.0);
        assert!((h - bs).abs() < 5e-3, "heston {h} vs merton {bs}");
    }

    #[test]
    fn heston_short_maturity_and_otm_are_sane() {
        let c = price_heston_call_impl(100.0, 130.0, 0.04, 0.01, 1.5, 0.04, 0.3, -0.5, 0.05, 0.0).unwrap();
        assert!(c >= 0.0 && c < 0.5, "got {c}");
        let c2 = price_heston_call_impl(100.0, 70.0, 0.04, 0.01, 1.5, 0.04, 0.3, -0.5, 0.05, 0.0).unwrap();
        assert!((c2 - (100.0 - 70.0 * (-0.01f64 * 0.05).exp())).abs() < 0.05, "got {c2}");
    }
}
