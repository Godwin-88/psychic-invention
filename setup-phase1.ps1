# Phase 1 Setup - Run from project root
# If venv is broken from failed pip upgrade, delete venv and run this script.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Recreate venv if needed
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "Creating venv..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate and install (use python from venv directly to avoid activation issues)
$py = ".\venv\Scripts\python.exe"
$pip = ".\venv\Scripts\pip.exe"

Write-Host "Installing setuptools, wheel..." -ForegroundColor Cyan
& $py -m pip install --quiet setuptools wheel 2>$null
if ($LASTEXITCODE -ne 0) { & $pip install setuptools wheel }

Write-Host "Installing core packages..." -ForegroundColor Cyan
& $pip install fastapi "uvicorn[standard]" pydantic 2>$null
& $pip install numpy scipy pandas 2>$null
& $pip install httpx requests cvxpy 2>$null

Write-Host "Verifying Phase 1 backend..." -ForegroundColor Cyan
& $py -c @"
import sys
sys.path.insert(0, '.')
from app.portfolio_engine import compute_portfolio_moments
from app.risk.var_engine import compute_var_all_methods
import numpy as np
r = np.random.randn(20, 4) * 0.01
w = np.array([0.25, 0.25, 0.25, 0.25])
m = compute_portfolio_moments(r, w)
print('  Portfolio engine OK')
var = compute_var_all_methods(r, w, alpha=0.05, include_monte_carlo=False)
print('  Risk engine OK')
print('Phase 1 backend ready!')
"@

Write-Host "`nTo start the server:" -ForegroundColor Green
Write-Host "  .\venv\Scripts\Activate.ps1" 
Write-Host "  uvicorn app.main:app --reload" 
Write-Host "`nThen open http://localhost:8000/docs and http://localhost:3000/transact" -ForegroundColor Green
