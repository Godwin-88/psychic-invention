//! American option pricing with the Leisen–Reimer (1996) binomial tree.
//!
//! Leisen–Reimer uses the Peizer–Pratt inversion to place the tree's
//! probabilities on the Black–Scholes d1/d2, giving second-order convergence
//! (smooth in the number of steps, unlike CRR's odd/even oscillation).

use pyo3::prelude::*;

/// Peizer–Pratt method-2 inversion of the normal CDF for an n-step tree.
fn peizer_pratt(z: f64, n: f64) -> f64 {
    let denom = n + 1.0 / 3.0 + 0.1 / (n + 1.0);
    let x = z / denom;
    let root = (0.25 - 0.25 * (-(x * x) * (n + 1.0 / 6.0)).exp()).sqrt();
    if z >= 0.0 { 0.5 + root } else { 0.5 - root }
}

/// Price, delta and gamma of an American option.
#[derive(Debug, Clone, Copy)]
pub struct AmericanResult {
    pub price: f64,
    pub delta: f64,
    pub gamma: f64,
    pub early_exercise_premium: f64,
}

#[allow(clippy::too_many_arguments)]
pub fn price_american_lr(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    q: f64,
    is_call: bool,
    steps: usize,
) -> AmericanResult {
    // Leisen–Reimer requires an odd number of steps.
    let n = if steps.is_multiple_of(2) { steps + 1 } else { steps };
    let nf = n as f64;
    let dt = tau / nf;

    let sqrt_tau = tau.sqrt();
    let d1 = ((s / k).ln() + (r - q + 0.5 * sigma * sigma) * tau) / (sigma * sqrt_tau);
    let d2 = d1 - sigma * sqrt_tau;

    let p = peizer_pratt(d2, nf);
    let p_star = peizer_pratt(d1, nf);
    let growth = ((r - q) * dt).exp();
    let u = growth * p_star / p;
    let d = (growth - p * u) / (1.0 - p);
    let disc = (-r * dt).exp();
    let pu = disc * p;
    let pd = disc * (1.0 - p);

    let payoff = |st: f64| if is_call { (st - k).max(0.0) } else { (k - st).max(0.0) };

    // Terminal values. Node j has j up-moves.
    let mut values: Vec<f64> = (0..=n)
        .map(|j| payoff(s * u.powi(j as i32) * d.powi((n - j) as i32)))
        .collect();
    let mut european: Vec<f64> = values.clone();

    // Keep the two earliest layers for delta/gamma.
    let mut layer1 = [0.0; 2];
    let mut layer2 = [0.0; 3];

    for step in (0..n).rev() {
        for j in 0..=step {
            let st = s * u.powi(j as i32) * d.powi((step - j) as i32);
            let cont = pu * values[j + 1] + pd * values[j];
            values[j] = cont.max(payoff(st));
            european[j] = pu * european[j + 1] + pd * european[j];
        }
        if step == 2 {
            layer2.copy_from_slice(&values[0..3]);
        }
        if step == 1 {
            layer1.copy_from_slice(&values[0..2]);
        }
    }

    let s_u = s * u;
    let s_d = s * d;
    let delta = (layer1[1] - layer1[0]) / (s_u - s_d);
    let s_uu = s * u * u;
    let s_ud = s * u * d;
    let s_dd = s * d * d;
    let delta_up = (layer2[2] - layer2[1]) / (s_uu - s_ud);
    let delta_dn = (layer2[1] - layer2[0]) / (s_ud - s_dd);
    let gamma = (delta_up - delta_dn) / (0.5 * (s_uu - s_dd));

    AmericanResult {
        price: values[0],
        delta,
        gamma,
        early_exercise_premium: (values[0] - european[0]).max(0.0),
    }
}

/// Richardson-extrapolated Leisen–Reimer price.
///
/// For American options the LR error is O(1/n) because of the early-exercise
/// boundary, so 2·P(2n) − P(n) removes the leading term (e.g. S=36, K=40,
/// r=6%, σ=20%, T=1: raw 1001 steps 4.48619 → extrapolated 4.48667, against
/// a converged value of ≈4.4867).
#[allow(clippy::too_many_arguments)]
pub fn price_american(
    s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64, is_call: bool, steps: usize,
) -> AmericanResult {
    let coarse = price_american_lr(s, k, tau, r, sigma, q, is_call, steps);
    let fine = price_american_lr(s, k, tau, r, sigma, q, is_call, 2 * steps);
    let price = 2.0 * fine.price - coarse.price;
    let european_fine = fine.price - fine.early_exercise_premium;
    AmericanResult {
        price,
        delta: fine.delta,
        gamma: fine.gamma,
        early_exercise_premium: (price - european_fine).max(0.0),
    }
}

/// Price an American option. Returns a tuple
/// (price, delta, gamma, early_exercise_premium).
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, q=0.0, is_call=false, steps=501))]
#[allow(clippy::too_many_arguments)]
#[pyo3(name = "price_american")]
pub fn price_american_py(
    py: Python<'_>,
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    q: f64,
    is_call: bool,
    steps: usize,
) -> PyResult<(f64, f64, f64, f64)> {
    crate::black_scholes::validate_inputs(s, k, tau, r, sigma, q)?;
    if !(3..=20_001).contains(&steps) {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "steps must be between 3 and 20001",
        ));
    }
    let res = py.allow_threads(|| price_american(s, k, tau, r, sigma, q, is_call, steps));
    Ok((res.price, res.delta, res.gamma, res.early_exercise_premium))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::black_scholes::{price_call_internal, price_put_internal};

    #[test]
    fn american_put_matches_converged_benchmark() {
        // S=36, K=40, r=6%, σ=20%, T=1. Continuous-exercise value ≈ 4.4867
        // (CRR with 4000 steps: 4.48671). Longstaff–Schwartz's 4.478 is for
        // 50 exercise dates a year, so it is not the right reference here.
        let res = price_american(36.0, 40.0, 1.0, 0.06, 0.2, 0.0, false, 501);
        assert!((res.price - 4.4867).abs() < 2e-4, "got {}", res.price);
        assert!(res.early_exercise_premium > 0.0);
        assert!(res.delta < 0.0 && res.delta > -1.0);
        assert!(res.gamma > 0.0);
    }

    #[test]
    fn american_call_without_dividends_equals_european() {
        let am = price_american_lr(100.0, 100.0, 1.0, 0.05, 0.2, 0.0, true, 501);
        let eu = price_call_internal(100.0, 100.0, 1.0, 0.05, 0.2);
        assert!((am.price - eu).abs() < 1e-3, "{} vs {}", am.price, eu);
        assert!(am.early_exercise_premium < 1e-6);
    }

    #[test]
    fn american_put_at_least_european_and_converges() {
        let eu = price_put_internal(100.0, 110.0, 0.5, 0.05, 0.25);
        let a = price_american(100.0, 110.0, 0.5, 0.05, 0.25, 0.0, false, 251);
        let b = price_american(100.0, 110.0, 0.5, 0.05, 0.25, 0.0, false, 1001);
        assert!(a.price >= eu);
        assert!((a.price - b.price).abs() < 3e-4, "{} vs {}", a.price, b.price);
    }

    #[test]
    fn dividend_creates_early_exercise_for_calls() {
        let am = price_american_lr(100.0, 90.0, 1.0, 0.02, 0.2, 0.08, true, 501);
        assert!(am.early_exercise_premium > 0.01);
    }
}
