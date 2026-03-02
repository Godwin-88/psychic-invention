#!/usr/bin/env bash
# =============================================================================
# start-local.sh — Start all Derivatives Pricing Engine services locally
#
# Services started (in order):
#   1. Redis           → localhost:6379  (Docker — shared market-data cache)
#   2. FastAPI backend → http://localhost:8000  (uvicorn, hot-reload)
#   3. React frontend  → http://localhost:3000  (Vite dev server)
#
# Prerequisites:
#   - Docker + Docker Compose  (for Redis)
#   - Python 3.8+              (python3 or python on PATH)
#   - Rust toolchain / maturin (for Rust pricing engine)
#   - Node.js 16+ and npm      (for React frontend)
#
# Usage:
#   chmod +x start-local.sh
#   ./start-local.sh [flags]
#
# Flags:
#   --skip-build    Skip maturin build (use existing .so/.pyd)
#   --mock          Skip Rust build; use Python mock pricing engine
#   --release       Build Rust in optimised release mode
#   --no-redis      Do not start Redis (in-memory cache only)
#   --no-frontend   Do not start the React frontend
# =============================================================================

set -euo pipefail

# ── Argument parsing ──────────────────────────────────────────────────────────
SKIP_BUILD=false
USE_MOCK=false
RELEASE_BUILD=false
NO_REDIS=false
NO_FRONTEND=false

for arg in "$@"; do
    case $arg in
        --skip-build)   SKIP_BUILD=true ;;
        --mock)         USE_MOCK=true ;;
        --release)      RELEASE_BUILD=true ;;
        --no-redis)     NO_REDIS=true ;;
        --no-frontend)  NO_FRONTEND=true ;;
        --help|-h)
            echo "Usage: $0 [--skip-build] [--mock] [--release] [--no-redis] [--no-frontend]"
            echo "  --skip-build    Skip maturin build (use cached .so/.pyd)"
            echo "  --mock          Use Python mock pricing engine (no Rust needed)"
            echo "  --release       Build Rust in optimised release mode"
            echo "  --no-redis      Skip Redis; use in-memory-only cache"
            echo "  --no-frontend   Skip React frontend startup"
            exit 0
            ;;
    esac
done

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error_msg(){ echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${BOLD}━━━ $* ━━━${RESET}"; }

# ── Process tracking ──────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""
REDIS_VIA_COMPOSE=false
REDIS_VIA_DOCKER_RUN=false

# ── Cleanup on Ctrl-C / EXIT ──────────────────────────────────────────────────
cleanup() {
    echo ""
    warn "Shutting down services..."

    # Backend
    if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        success "Backend stopped (PID $BACKEND_PID)"
    fi

    # Frontend
    if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        success "Frontend stopped (PID $FRONTEND_PID)"
    fi

    # Kill any lingering port holders
    for PORT in 8000 3000; do
        local PID
        PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
        if [[ -n "$PID" ]]; then
            kill "$PID" 2>/dev/null || true
        fi
    done

    # Redis cleanup
    if $REDIS_VIA_COMPOSE; then
        info "Stopping Redis container via docker compose..."
        docker compose stop redis 2>/dev/null || true
        success "Redis stopped."
    elif $REDIS_VIA_DOCKER_RUN; then
        info "Stopping Redis container..."
        docker stop pricing-engine-redis 2>/dev/null || true
        success "Redis stopped."
    fi

    echo -e "${GREEN}All services stopped. Goodbye!${RESET}"
    exit 0
}
trap cleanup INT TERM EXIT

# ── Repo root ─────────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"
info "Working directory: $REPO_ROOT"

# Load .env if present
if [[ -f ".env" ]]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' .env | grep -v '^$' | xargs -d '\n') 2>/dev/null || true
    info ".env loaded."
fi

# ── Platform detection ────────────────────────────────────────────────────────
step "Platform Detection"

OS_TYPE="$(uname -s 2>/dev/null || echo Windows)"
case "$OS_TYPE" in
    MINGW*|MSYS*|CYGWIN*|Windows*)
        PLATFORM="windows"
        VENV_ACTIVATE="venv/Scripts/activate"
        ;;
    Linux*)
        PLATFORM="linux"
        VENV_ACTIVATE="venv/bin/activate"
        ;;
    Darwin*)
        PLATFORM="macos"
        VENV_ACTIVATE="venv/bin/activate"
        ;;
    *)
        PLATFORM="unknown"
        VENV_ACTIVATE="venv/bin/activate"
        warn "Unknown platform '$OS_TYPE' — assuming Unix paths."
        ;;
esac
info "Platform: $PLATFORM"

# ── Python detection ──────────────────────────────────────────────────────────
PYTHON_BIN=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        PYTHON_BIN="$cmd"
        PYTHON_VERSION=$("$cmd" --version 2>&1 | awk '{print $2}')
        info "Python: $cmd ($PYTHON_VERSION)"
        break
    fi
done

if [[ -z "$PYTHON_BIN" ]]; then
    error_msg "Python not found. Install Python 3.8+ and add it to PATH."
    exit 1
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 1 — Redis (Docker)
# ═════════════════════════════════════════════════════════════════════════════
step "Redis Cache (Docker)"

REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
export REDIS_URL

if $NO_REDIS; then
    warn "--no-redis flag set. Running with in-memory cache only."
    warn "Live market data will not be shared across uvicorn workers."
else
    DOCKER_OK=false
    COMPOSE_OK=false

    command -v docker &>/dev/null && DOCKER_OK=true
    (docker compose version &>/dev/null 2>&1 || docker-compose version &>/dev/null 2>&1) && COMPOSE_OK=true

    if ! $DOCKER_OK; then
        warn "Docker not found — Redis will be skipped (in-memory cache only)."
        warn "Install Docker: https://docs.docker.com/get-docker/"
    else
        # ── Verify Docker daemon is actually reachable before proceeding ──────
        DOCKER_RUNNING=false
        if docker info &>/dev/null 2>&1; then
            DOCKER_RUNNING=true
        else
            warn "Docker daemon is not reachable."
            warn "On Windows: make sure Docker Desktop is running (check the system tray)."
            warn "Continuing without Redis — using in-memory cache only."
        fi

        if $DOCKER_RUNNING; then
            # ── Try docker compose first ──────────────────────────────────────
            if $COMPOSE_OK && [[ -f "docker-compose.yml" ]]; then
                info "Starting Redis via docker compose..."
                COMPOSE_ERR=0
                if docker compose version &>/dev/null 2>&1; then
                    docker compose up -d redis 2>&1 || COMPOSE_ERR=$?
                else
                    docker-compose up -d redis 2>&1 || COMPOSE_ERR=$?
                fi

                if [[ $COMPOSE_ERR -eq 0 ]]; then
                    REDIS_VIA_COMPOSE=true
                    success "Redis container started via docker compose."
                else
                    warn "docker compose up failed (exit $COMPOSE_ERR) — trying docker run fallback."
                fi
            fi

            # ── Fall back to docker run if compose failed or is unavailable ───
            if ! $REDIS_VIA_COMPOSE; then
                info "Attempting docker run for Redis..."
                docker stop pricing-engine-redis 2>/dev/null || true
                docker rm   pricing-engine-redis 2>/dev/null || true

                RUN_ERR=0
                docker run -d \
                    --name pricing-engine-redis \
                    -p 6379:6379 \
                    redis:7.2-alpine \
                    redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --save "" --appendonly no \
                    2>&1 || RUN_ERR=$?

                if [[ $RUN_ERR -eq 0 ]]; then
                    REDIS_VIA_DOCKER_RUN=true
                    success "Redis container started via docker run."
                else
                    warn "docker run also failed (exit $RUN_ERR)."
                    warn "Continuing without Redis — in-memory cache only."
                fi
            fi

            # ── Wait for Redis to be healthy (only if a container was started) ─
            if $REDIS_VIA_COMPOSE || $REDIS_VIA_DOCKER_RUN; then
                REDIS_READY=false
                info "Waiting for Redis to be ready..."
                for i in $(seq 1 20); do
                    if docker exec pricing-engine-redis redis-cli ping 2>/dev/null | grep -q PONG; then
                        REDIS_READY=true
                        success "Redis is ready! (${i}s)"
                        break
                    fi
                    printf "${DIM}.${RESET}"
                    sleep 1
                done
                echo ""

                if ! $REDIS_READY; then
                    warn "Redis did not respond in 20s. Continuing with in-memory fallback."
                else
                    info "REDIS_URL=$REDIS_URL"
                fi
            fi
        fi
    fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 2 — Python virtual environment
# ═════════════════════════════════════════════════════════════════════════════
step "Python Virtual Environment"

if [[ ! -f "$VENV_ACTIVATE" ]]; then
    info "Creating virtual environment..."
    "$PYTHON_BIN" -m venv venv
    success "Virtual environment created."
else
    info "Virtual environment exists."
fi

# shellcheck disable=SC1090
source "$VENV_ACTIVATE"
success "Virtual environment activated."

# ═════════════════════════════════════════════════════════════════════════════
# STEP 3 — Python dependencies
# ═════════════════════════════════════════════════════════════════════════════
step "Python Dependencies"

info "Installing / verifying Python dependencies..."
# Use 'python -m pip' so Windows can replace the pip binary while it's in use
python -m pip install --upgrade pip -q 2>&1 || true
python -m pip install -r requirements.txt -q
success "Python dependencies ready."

# ═════════════════════════════════════════════════════════════════════════════
# STEP 4 — Rust pricing engine
# ═════════════════════════════════════════════════════════════════════════════
step "Rust Pricing Engine"

if $USE_MOCK; then
    warn "--mock: skipping Rust build — server will use pricing_engine_mock.py."
elif $SKIP_BUILD; then
    info "--skip-build: using cached Rust extension."
else
    if ! command -v cargo &>/dev/null; then
        warn "cargo not found — Rust toolchain not installed."
        warn "Server will fall back to the Python mock pricing engine."
        warn "Install Rust: https://rustup.rs"
    else
        if ! command -v maturin &>/dev/null; then
            warn "maturin not found — installing..."
            pip install maturin==1.4.0 -q
        fi

        info "Building Rust core with maturin..."
        if $RELEASE_BUILD; then
            info "Release mode (optimised — may take a minute)..."
            maturin develop --release
        else
            maturin develop
        fi
        success "Rust pricing engine built."

        if python -c "import pricing_engine" 2>/dev/null; then
            success "pricing_engine module verified (Rust)."
        else
            warn "pricing_engine import failed — falling back to mock."
        fi
    fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 5 — Port availability checks
# ═════════════════════════════════════════════════════════════════════════════
step "Port Availability"

check_port() {
    local PORT=$1 SERVICE=$2
    if command -v lsof &>/dev/null; then
        local PID
        PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
        if [[ -n "$PID" ]]; then
            warn "Port $PORT already in use (PID $PID). $SERVICE may conflict."
        else
            success "Port $PORT is free ($SERVICE)."
        fi
    fi
}

check_port 6379 "Redis"
check_port 8000 "FastAPI backend"
check_port 3000 "React frontend"

# ═════════════════════════════════════════════════════════════════════════════
# STEP 6 — FastAPI backend
# ═════════════════════════════════════════════════════════════════════════════
step "Starting FastAPI Backend (port 8000)"

BACKEND_LOG="$REPO_ROOT/backend.log"
info "Log → $BACKEND_LOG"

REDIS_URL="$REDIS_URL" uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --reload-dir app \
    --log-level info \
    > "$BACKEND_LOG" 2>&1 &

BACKEND_PID=$!
info "Backend PID: $BACKEND_PID"

BACKEND_READY=false
info "Waiting for backend health check..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/health &>/dev/null; then
        BACKEND_READY=true
        success "Backend ready! (${i}s)"
        break
    fi
    printf "${DIM}.${RESET}"
    sleep 1
done
echo ""

if ! $BACKEND_READY; then
    warn "Backend did not respond in 30s — check $BACKEND_LOG."
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 7 — Frontend
# ═════════════════════════════════════════════════════════════════════════════
if $NO_FRONTEND; then
    warn "--no-frontend: skipping React frontend."
else
    step "Frontend Node Modules"
    if [[ ! -d "frontend/node_modules" ]]; then
        info "Running npm install..."
        (cd frontend && npm install)
        success "Node modules installed."
    else
        info "node_modules already present."
    fi

    step "Starting React Frontend (port 3000)"

    FRONTEND_LOG="$REPO_ROOT/frontend.log"
    info "Log → $FRONTEND_LOG"

    (cd "$REPO_ROOT/frontend" && npm run dev) \
        > "$FRONTEND_LOG" 2>&1 &

    FRONTEND_PID=$!
    info "Frontend PID: $FRONTEND_PID"

    sleep 3
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        success "Frontend process is running."
    else
        warn "Frontend process exited — check $FRONTEND_LOG."
    fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║         All Services Running!                             ║${RESET}"
echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Redis cache${RESET}    ${CYAN}localhost:6379${RESET}                       (Docker)"
echo -e "  ${BOLD}Backend API${RESET}    ${CYAN}http://localhost:8000${RESET}"
echo -e "  ${BOLD}Swagger UI${RESET}     ${CYAN}http://localhost:8000/docs${RESET}"
echo -e "  ${BOLD}ReDoc${RESET}          ${CYAN}http://localhost:8000/redoc${RESET}"
echo -e "  ${BOLD}Health${RESET}         ${CYAN}http://localhost:8000/health${RESET}"
if ! $NO_FRONTEND; then
    echo -e "  ${BOLD}Frontend${RESET}       ${CYAN}http://localhost:3000${RESET}"
fi
echo ""
echo -e "  ${DIM}Backend log:   tail -f backend.log${RESET}"
echo -e "  ${DIM}Frontend log:  tail -f frontend.log${RESET}"
echo -e "  ${DIM}Redis UI:      docker compose --profile debug up redis-commander${RESET}"
echo ""
echo -e "${BOLD}New live-data endpoints (Redis-cached):${RESET}"
echo -e "  ${DIM}GET  /market-data/live/quote/{symbol}         yfinance real-time quote${RESET}"
echo -e "  ${DIM}GET  /market-data/live/history/{symbol}       OHLCV history (1yr / 1d)${RESET}"
echo -e "  ${DIM}GET  /market-data/live/options/{symbol}       full options chain${RESET}"
echo -e "  ${DIM}GET  /market-data/live/iv/{symbol}            ATM implied vol${RESET}"
echo -e "  ${DIM}GET  /market-data/live/batch?symbols=A,B,C    concurrent batch quotes${RESET}"
echo -e "  ${DIM}GET  /market-data/live/cache/stats            Redis hit/miss stats${RESET}"
echo -e "  ${DIM}DELETE /market-data/live/cache                flush Redis cache${RESET}"
echo ""
echo -e "${BOLD}Quick smoke-test:${RESET}"
echo -e "  ${DIM}curl -s http://localhost:8000/market-data/live/quote/AAPL | python -m json.tool${RESET}"
echo -e "  ${DIM}curl -s http://localhost:8000/market-data/live/cache/stats | python -m json.tool${RESET}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${RESET} to stop all services."
echo ""

# ── Keep alive ────────────────────────────────────────────────────────────────
wait
