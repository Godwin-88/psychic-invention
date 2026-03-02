#!/usr/bin/env bash
# Transact — Start All Services
# Launches databases (PostgreSQL + Redis), backend (FastAPI), and frontend (Vite)
# Use with: bash start-all.sh  (or ./start-all.sh on Linux/macOS)

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate venv if it exists
if [ -f "$ROOT_DIR/venv/bin/activate" ]; then
    source "$ROOT_DIR/venv/bin/activate"
elif [ -f "$ROOT_DIR/venv/Scripts/activate" ]; then
    source "$ROOT_DIR/venv/Scripts/activate"
fi

# 1. Start databases (PostgreSQL + Redis) via Docker
echo "Starting databases (PostgreSQL + Redis)..."
if command -v docker &>/dev/null; then
    if (cd "$ROOT_DIR" && docker compose -f docker-compose.dev.yml up -d 2>/dev/null); then
        echo "  PostgreSQL: localhost:5432 (user: transact, db: transact)"
        echo "  Redis:      localhost:6379"
        sleep 3
    else
        echo "  Docker Compose failed. Ensure Docker is running. Continuing without databases."
    fi
else
    echo "  Docker not found. Skipping databases. Install Docker for local PostgreSQL/Redis."
fi

# 2. Set DB env vars for backend (when app uses them)
export DATABASE_URL="${DATABASE_URL:-postgresql://transact:transact_dev@localhost:5432/transact}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

# 3. Start backend
echo "Starting backend (FastAPI) on http://localhost:8000 ..."
(cd "$ROOT_DIR" && uvicorn app.main:app --reload) &
BACKEND_PID=$!

# 4. Start frontend
echo "Starting frontend (Vite) on http://localhost:3000 ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Services started. Press Ctrl+C to stop app (databases keep running)."
echo "  Databases: PostgreSQL (5432), Redis (6379)"
echo "  Backend:   http://localhost:8000  (API docs: http://localhost:8000/docs)"
echo "  Frontend:  http://localhost:3000/transact"
echo ""
echo "To stop databases: docker compose -f docker-compose.dev.yml down"
echo ""

# Trap Ctrl+C to kill app processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
