# Pricing Engine Development Startup Script (PowerShell)
# This script starts both the backend API and frontend development servers

param(
    [switch]$SkipChecks,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-Port {
    param([int]$Port)
    try {
        $listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
        return -not ($listener | Where-Object { $_.Port -eq $Port })
    }
    catch {
        return $true
    }
}

function Wait-ForService {
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$MaxAttempts = 30
    )
    
    Write-Status "Waiting for $ServiceName to be ready..."
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "$ServiceName is ready!"
                return $true
            }
        }
        catch {
            Write-Host "." -NoNewline
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Error "$ServiceName failed to start within $($MaxAttempts * 2) seconds"
    return $false
}

# Cleanup function
function Stop-Services {
    Write-Status "Shutting down services..."
    
    # Stop background jobs
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    
    # Kill processes on our ports
    try {
        $processes = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        $processes | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    }
    catch { }
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        $processes | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    }
    catch { }
    
    Write-Success "Cleanup complete"
}

# Set up Ctrl+C handler
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-Services }

Write-Status "🚀 Starting Pricing Engine Development Environment"
Write-Host "==================================================" -ForegroundColor $Blue
Write-Host ""

# Check prerequisites
if (-not $SkipChecks) {
    Write-Status "Checking prerequisites..."

    if (-not (Test-Command "python")) {
        Write-Error "Python is required but not installed"
        exit 1
    }

    if (-not (Test-Command "node")) {
        Write-Error "Node.js is required but not installed"
        exit 1
    }

    if (-not (Test-Command "npm")) {
        Write-Error "npm is required but not installed"
        exit 1
    }

    if (-not (Test-Command "cargo")) {
        Write-Error "Rust/Cargo is required but not installed"
        exit 1
    }

    Write-Success "All prerequisites found"

    # Check if ports are available
    if (-not (Test-Port $BackendPort)) {
        Write-Error "Port $BackendPort is already in use. Please stop the service using this port."
        exit 1
    }

    if (-not (Test-Port $FrontendPort)) {
        Write-Error "Port $FrontendPort is already in use. Please stop the service using this port."
        exit 1
    }

    Write-Success "Ports $BackendPort and $FrontendPort are available"
}

# Setup Python virtual environment
Write-Status "Setting up Python environment..."

if (-not (Test-Path "venv")) {
    Write-Status "Creating Python virtual environment..."
    python -m venv venv
}

# Activate virtual environment
& "venv\Scripts\Activate.ps1"
Write-Success "Python virtual environment activated"

# Install Python dependencies
Write-Status "Installing Python dependencies..."
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

# Build Rust core
Write-Status "Building Rust pricing engine..."
maturin develop --release
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build Rust pricing engine"
    exit 1
}
Write-Success "Rust pricing engine built successfully"

# Setup frontend dependencies
Write-Status "Setting up frontend dependencies..."
Push-Location frontend

if (-not (Test-Path "node_modules")) {
    Write-Status "Installing frontend dependencies..."
    npm install --silent
}

Write-Success "Frontend dependencies ready"
Pop-Location

# Start backend server
Write-Status "Starting backend API server on http://127.0.0.1:$BackendPort..."

$backendJob = Start-Job -ScriptBlock {
    param($Port)
    & "venv\Scripts\Activate.ps1"
    uvicorn app.main:app --reload --host 127.0.0.1 --port $Port
} -ArgumentList $BackendPort

# Wait for backend to be ready
if (-not (Wait-ForService "http://127.0.0.1:$BackendPort/health" "Backend API")) {
    Stop-Services
    exit 1
}

# Start frontend server
Write-Status "Starting frontend development server on http://localhost:$FrontendPort..."

$frontendJob = Start-Job -ScriptBlock {
    param($Port)
    Set-Location frontend
    npm run dev -- --host 0.0.0.0 --port $Port
} -ArgumentList $FrontendPort

# Wait for frontend to be ready
if (-not (Wait-ForService "http://localhost:$FrontendPort" "Frontend")) {
    Write-Warning "Frontend may still be starting..."
}

# Display success message
Write-Host ""
Write-Host "🎉 Pricing Engine is now running!" -ForegroundColor $Green
Write-Host "==================================" -ForegroundColor $Blue
Write-Host ""
Write-Host "📊 Backend API:     http://127.0.0.1:$BackendPort" -ForegroundColor $Blue
Write-Host "📋 API Docs:        http://127.0.0.1:$BackendPort/docs" -ForegroundColor $Blue
Write-Host "🌐 Frontend:        http://localhost:$FrontendPort" -ForegroundColor $Blue
Write-Host "❤️  Health Check:    http://127.0.0.1:$BackendPort/health" -ForegroundColor $Blue
Write-Host ""
Write-Host "📈 Available Endpoints:" -ForegroundColor $Yellow
Write-Host "  • Black-Scholes:   POST /price/call/bs, /price/put/bs"
Write-Host "  • Enhanced FFT:    POST /price/call/fft-optimized"
Write-Host "  • Heston Model:    POST /price/call/heston"
Write-Host "  • Greeks:          POST /greeks/call, /greeks/put"
Write-Host "  • Market Data:     POST /market-data/spot"
Write-Host ""
Write-Host "🧪 Quick Test:" -ForegroundColor $Yellow
Write-Host 'Invoke-RestMethod -Uri "http://127.0.0.1:' + $BackendPort + '/price/call/bs" -Method Post -ContentType "application/json" -Body ''{"s": 100, "k": 105, "tau": 0.25, "r": 0.05, "sigma": 0.2}'''
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor $Yellow
Write-Host ""

# Keep script running and wait for jobs
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        if ((Get-Job -Id $backendJob.Id).State -eq "Failed") {
            Write-Error "Backend server failed"
            break
        }
        
        if ((Get-Job -Id $frontendJob.Id).State -eq "Failed") {
            Write-Error "Frontend server failed"
            break
        }
    }
}
finally {
    Stop-Services
}