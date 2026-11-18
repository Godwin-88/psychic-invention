use pyo3::prelude::*;
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use rand_distr::StandardNormal;
use rayon::prelude::*;

/// Paths simulated per parallel chunk. Each chunk gets its own RNG stream,
/// derived deterministically from the seed, so results are reproducible
/// regardless of thread scheduling.
const CHUNK: usize = 16_384;

/// Result of a Monte Carlo valuation.
#[derive(Debug, Clone, Copy)]
pub struct McResult {
    pub price: f64,
    pub std_error: f64,
    pub paths: usize,
}

/// European option under GBM with antithetic variates.
///
/// Each draw z produces the pair (z, −z); the pair average is one i.i.d.
/// sample, so the standard error is computed over pairs (not over raw paths,
/// which would understate it).
#[allow(clippy::too_many_arguments)]
pub fn price_european_mc(
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    q: f64,
    sims: usize,
    is_call: bool,
    seed: u64,
) -> McResult {
    let pairs = sims.div_ceil(2).max(1);
    let drift = (r - q - 0.5 * sigma * sigma) * tau;
    let vol = sigma * tau.sqrt();
    let payoff = |st: f64| if is_call { (st - k).max(0.0) } else { (k - st).max(0.0) };

    let n_chunks = pairs.div_ceil(CHUNK);
    let (sum, sum_sq) = (0..n_chunks)
        .into_par_iter()
        .map(|c| {
            // SplitMix-style stream separation per chunk.
            let mut rng = StdRng::seed_from_u64(seed ^ (c as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
            let n = CHUNK.min(pairs - c * CHUNK);
            let mut acc = 0.0;
            let mut acc_sq = 0.0;
            for _ in 0..n {
                let z: f64 = rng.sample(StandardNormal);
                let up = payoff(s * (drift + vol * z).exp());
                let dn = payoff(s * (drift - vol * z).exp());
                let x = 0.5 * (up + dn);
                acc += x;
                acc_sq += x * x;
            }
            (acc, acc_sq)
        })
        .reduce(|| (0.0, 0.0), |a, b| (a.0 + b.0, a.1 + b.1));

    let n = pairs as f64;
    let mean = sum / n;
    let var = if pairs > 1 { (sum_sq - n * mean * mean).max(0.0) / (n - 1.0) } else { 0.0 };
    let df = (-r * tau).exp();
    McResult {
        price: df * mean,
        std_error: df * (var / n).sqrt(),
        paths: 2 * pairs,
    }
}

fn validate(s: f64, k: f64, tau: f64, r: f64, sigma: f64, q: f64, sims: usize) -> PyResult<()> {
    crate::black_scholes::validate_inputs(s, k, tau, r, sigma, q)?;
    if sims == 0 || sims > 50_000_000 {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "sims must be between 1 and 50,000,000",
        ));
    }
    Ok(())
}

fn resolve_seed(seed: Option<u64>) -> u64 {
    seed.unwrap_or_else(|| rand::rng().random())
}

/// Monte Carlo price of a European call (antithetic GBM). Pass `seed` for
/// reproducible results.
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, sims, seed=None, q=0.0))]
#[allow(clippy::too_many_arguments)]
pub fn price_call_mc(
    py: Python<'_>,
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    sims: usize,
    seed: Option<u64>,
    q: f64,
) -> PyResult<f64> {
    validate(s, k, tau, r, sigma, q, sims)?;
    let seed = resolve_seed(seed);
    Ok(py.allow_threads(|| price_european_mc(s, k, tau, r, sigma, q, sims, true, seed)).price)
}

/// Monte Carlo price of a European put, simulated directly (not via parity,
/// so its error is independent of the call's).
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, sims, seed=None, q=0.0))]
#[allow(clippy::too_many_arguments)]
pub fn price_put_mc(
    py: Python<'_>,
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    sims: usize,
    seed: Option<u64>,
    q: f64,
) -> PyResult<f64> {
    validate(s, k, tau, r, sigma, q, sims)?;
    let seed = resolve_seed(seed);
    Ok(py.allow_threads(|| price_european_mc(s, k, tau, r, sigma, q, sims, false, seed)).price)
}

/// Monte Carlo price with its standard error: returns (price, std_error, paths).
/// A 95% confidence interval is price ± 1.96·std_error.
#[pyfunction]
#[pyo3(signature = (s, k, tau, r, sigma, sims, is_call=true, seed=None, q=0.0))]
#[allow(clippy::too_many_arguments)]
pub fn price_mc_with_error(
    py: Python<'_>,
    s: f64,
    k: f64,
    tau: f64,
    r: f64,
    sigma: f64,
    sims: usize,
    is_call: bool,
    seed: Option<u64>,
    q: f64,
) -> PyResult<(f64, f64, usize)> {
    validate(s, k, tau, r, sigma, q, sims)?;
    let seed = resolve_seed(seed);
    let res = py.allow_threads(|| price_european_mc(s, k, tau, r, sigma, q, sims, is_call, seed));
    Ok((res.price, res.std_error, res.paths))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::black_scholes::{price_call_internal, price_put_internal};

    #[test]
    fn mc_is_reproducible_with_seed() {
        let a = price_european_mc(100.0, 100.0, 1.0, 0.05, 0.2, 0.0, 100_000, true, 7);
        let b = price_european_mc(100.0, 100.0, 1.0, 0.05, 0.2, 0.0, 100_000, true, 7);
        assert_eq!(a.price, b.price);
    }

    #[test]
    fn mc_matches_black_scholes_within_four_standard_errors() {
        for &(k, is_call) in &[(80.0, true), (100.0, true), (120.0, false), (100.0, false)] {
            let res = price_european_mc(100.0, k, 1.0, 0.05, 0.2, 0.0, 400_000, is_call, 42);
            let bs = if is_call {
                price_call_internal(100.0, k, 1.0, 0.05, 0.2)
            } else {
                price_put_internal(100.0, k, 1.0, 0.05, 0.2)
            };
            assert!(res.std_error > 0.0);
            assert!((res.price - bs).abs() < 4.0 * res.std_error, "K={k}: {} vs {bs} (se {})", res.price, res.std_error);
        }
    }

    #[test]
    fn mc_with_dividend_matches_merton() {
        let q = 0.03;
        let res = price_european_mc(100.0, 100.0, 1.0, 0.05, 0.2, q, 400_000, true, 3);
        let bs = price_call_internal(100.0 * (-q as f64).exp(), 100.0, 1.0, 0.05, 0.2);
        assert!((res.price - bs).abs() < 4.0 * res.std_error);
    }
}
