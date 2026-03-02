# Phase 1 install script - run in a NEW terminal with venv activated
# Usage: .\venv\Scripts\Activate.ps1; .\install-phase1.ps1

Write-Host "Installing Phase 1 dependencies..." -ForegroundColor Cyan

# Install core packages first (skip pip self-upgrade to avoid file locks)
python -m pip install setuptools wheel --quiet
python -m pip install fastapi "uvicorn[standard]" pydantic --quiet
python -m pip install "numpy>=1.26.0" scipy pandas --quiet
python -m pip install httpx requests cvxpy --quiet

Write-Host "Verifying installation..." -ForegroundColor Cyan
python -c "
from app.portfolio_engine import compute_portfolio_moments
from app.risk.var_engine import compute_var_all_methods
import numpy as np
r = np.random.randn(20, 4) * 0.01
w = np.array([0.25, 0.25, 0.25, 0.25])
m = compute_portfolio_moments(r, w)
print('  Portfolio engine OK')
var = compute_var_all_methods(r, w, alpha=0.05, include_monte_carlo=False)
print('  Risk engine OK')
print('Phase 1 backend ready!' )
"
