# Transact — Start All Services
# Launches databases (PostgreSQL + Redis), backend (FastAPI), and frontend (Vite)

$RootDir = $PSScriptRoot

# 1. Start databases (PostgreSQL + Redis) via Docker
Write-Host "Starting databases (PostgreSQL + Redis)..." -ForegroundColor Cyan
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        Push-Location $RootDir
        docker compose -f docker-compose.dev.yml up -d
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-Host "  PostgreSQL: localhost:5432 (user: transact, db: transact)" -ForegroundColor Gray
            Write-Host "  Redis:      localhost:6379" -ForegroundColor Gray
            Start-Sleep -Seconds 3
        } else {
            Write-Host "  Docker Compose failed. Ensure Docker Desktop is running. Continuing without databases." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Could not start databases. Ensure Docker Desktop is running. Continuing without databases." -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
} else {
    Write-Host "  Docker not found. Skipping databases. Install Docker Desktop for local PostgreSQL/Redis." -ForegroundColor Yellow
}

# 2. Backend: Python FastAPI on http://localhost:8000
Write-Host "Starting backend (FastAPI) on http://localhost:8000 ..." -ForegroundColor Cyan
$PythonExe = Join-Path $RootDir "venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "  ERROR: venv not found. Run: python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Red
} else {
    $BackendCmd = "Set-Location -LiteralPath '$RootDir'; `$env:DATABASE_URL='postgresql://transact:transact_dev@localhost:5432/transact'; `$env:REDIS_URL='redis://localhost:6379'; & '$PythonExe' -m uvicorn app.main:app --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd
}

# 3. Frontend: Vite dev server on http://localhost:3000
Write-Host "Starting frontend (Vite) on http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$RootDir\frontend'; npm run dev"
)

Write-Host ""
Write-Host "Services started. Close the new windows to stop backend/frontend." -ForegroundColor Green
Write-Host "  Databases: PostgreSQL (5432), Redis (6379)" -ForegroundColor Gray
Write-Host "  Backend:   http://localhost:8000  (API docs: http://localhost:8000/docs)" -ForegroundColor Gray
Write-Host "  Frontend:  http://localhost:3000/transact" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop databases: docker compose -f docker-compose.dev.yml down" -ForegroundColor DarkGray
Write-Host ""
