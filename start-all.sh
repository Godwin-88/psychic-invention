#!/usr/bin/env bash
# Transact — Start All Services
# Launches knowledge-base stack (Neo4j + Redis + PostgreSQL) via docker-compose.kb.yml,
# then backend (FastAPI) and frontend (Vite).
# Use with: bash start-all.sh  (or ./start-all.sh on Linux/macOS)

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate venv if it exists
if [ -f "$ROOT_DIR/venv/bin/activate" ]; then
    source "$ROOT_DIR/venv/bin/activate"
elif [ -f "$ROOT_DIR/venv/Scripts/activate" ]; then
    source "$ROOT_DIR/venv/Scripts/activate"
fi

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ROOT_DIR/.env"
    set +a
fi

# 1. Start all containers via docker-compose.kb.yml (Neo4j + Redis + PostgreSQL)
echo "Starting stack (Neo4j + Redis + PostgreSQL) via docker-compose.kb.yml..."
if command -v docker &>/dev/null; then
    if (cd "$ROOT_DIR" && docker compose -f docker-compose.kb.yml up -d 2>/dev/null); then
        echo "  Neo4j:     localhost:7474 (Browser), localhost:7687 (Bolt) — auth: neo4j / pricing-engine-kb"
        echo "  Redis:     localhost:6379"
        echo "  PostgreSQL: localhost:5432 (user: pricing_engine, db: blotter)"
        sleep 3
    else
        echo "  Docker Compose failed. Ensure Docker is running. Continuing without containers."
    fi
else
    echo "  Docker not found. Skipping containers. Install Docker for Neo4j/Redis/PostgreSQL."
fi

# 2. Set env vars for backend (match docker-compose.kb.yml)
export DATABASE_URL="${DATABASE_URL:-postgresql://pricing_engine:pricing_engine_kb@localhost:5432/blotter}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
export NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
export NEO4J_USER="${NEO4J_USER:-neo4j}"
export NEO4J_PASSWORD="${NEO4J_PASSWORD:-pricing-engine-kb}"

# 3. Start backend
echo "Starting backend (FastAPI) on http://localhost:8000 ..."
(cd "$ROOT_DIR" && uvicorn app.main:app --reload) &
BACKEND_PID=$!

# 4. Start frontend
echo "Starting frontend (Vite) on http://localhost:3000 ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Services started. Press Ctrl+C to stop app (containers keep running)."
echo "  Containers: Neo4j (7474, 7687), Redis (6379), PostgreSQL (5432)"
echo "  Backend:   http://localhost:8000  (API docs: http://localhost:8000/docs)"
echo "  Frontend:  http://localhost:3000/transact"
echo "  Agent KB:  Load with: python scripts/load_knowledge_base.py  (after Neo4j is up)"
echo ""
echo "To stop containers: docker compose -f docker-compose.kb.yml down"
echo ""

# Trap Ctrl+C to kill app processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
