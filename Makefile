# =============================================================================
# Derivatives Pricing Engine — Makefile
# =============================================================================
# Usage:
#   make install       Install all dependencies (Python venv + Node)
#   make build         Build Rust core (dev mode)
#   make build-release Build Rust core (optimised release)
#   make dev           Start backend + frontend concurrently
#   make dev-api       Start FastAPI backend only
#   make dev-frontend  Start React frontend only
#   make test          Run all tests (Python + Rust + Frontend)
#   make test-py       Run Python tests only
#   make test-rust     Run Rust tests only
#   make test-fe       Run frontend tests only
#   make bench         Run Rust performance benchmarks
#   make lint          Lint all code (Python + Rust + TypeScript)
#   make format        Auto-format Python and Rust code
#   make clean         Remove build artefacts
#   make help          Show this help message
# =============================================================================

# ── Platform detection ────────────────────────────────────────────────────────
ifeq ($(OS),Windows_NT)
    VENV_ACTIVATE := venv/Scripts/activate
    PYTHON        := venv/Scripts/python
    PIP           := venv/Scripts/pip
else
    VENV_ACTIVATE := venv/bin/activate
    PYTHON        := venv/bin/python
    PIP           := venv/bin/pip
endif

SHELL := /bin/bash

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[1;33m
CYAN   := \033[0;36m
RESET  := \033[0m

.PHONY: all install install-py install-fe build build-release \
        dev dev-api dev-frontend \
        test test-py test-py-cov test-rust test-fe test-props \
        bench lint lint-py lint-rust lint-fe \
        format format-py format-rust \
        clean help

# ── Default target ────────────────────────────────────────────────────────────
all: build

# =============================================================================
# INSTALLATION
# =============================================================================

install: install-py install-fe
	@echo -e "$(GREEN)All dependencies installed.$(RESET)"

install-py: $(VENV_ACTIVATE)
	@echo -e "$(YELLOW)Installing Python dependencies...$(RESET)"
	@source $(VENV_ACTIVATE) && pip install --upgrade pip -q && pip install -r requirements.txt -q
	@echo -e "$(GREEN)Python dependencies installed.$(RESET)"

install-fe:
	@echo -e "$(YELLOW)Installing Node dependencies...$(RESET)"
	@cd frontend && npm install
	@echo -e "$(GREEN)Node dependencies installed.$(RESET)"

$(VENV_ACTIVATE):
	@echo -e "$(YELLOW)Creating virtual environment...$(RESET)"
	python -m venv venv
	@echo -e "$(GREEN)Virtual environment created.$(RESET)"

# =============================================================================
# BUILD
# =============================================================================

build: $(VENV_ACTIVATE)
	@echo -e "$(YELLOW)Building Rust pricing engine (dev)...$(RESET)"
	@source $(VENV_ACTIVATE) && maturin develop
	@echo -e "$(GREEN)Rust core built (dev mode).$(RESET)"

build-release: $(VENV_ACTIVATE)
	@echo -e "$(YELLOW)Building Rust pricing engine (release)...$(RESET)"
	@source $(VENV_ACTIVATE) && maturin develop --release
	@echo -e "$(GREEN)Rust core built (release mode).$(RESET)"

build-fe:
	@echo -e "$(YELLOW)Building frontend for production...$(RESET)"
	@cd frontend && npm run build
	@echo -e "$(GREEN)Frontend built → frontend/dist/$(RESET)"

# =============================================================================
# DEVELOPMENT SERVERS
# =============================================================================

dev: build
	@echo -e "$(CYAN)Starting all services (use ./start-local.sh for full control)...$(RESET)"
	@./start-local.sh

dev-api: build
	@echo -e "$(YELLOW)Starting FastAPI backend on :8000$(RESET)"
	@source $(VENV_ACTIVATE) && uvicorn app.main:app --reload --port 8000

dev-frontend:
	@echo -e "$(YELLOW)Starting React frontend on :3000$(RESET)"
	@cd frontend && npm run dev

# =============================================================================
# TESTING
# =============================================================================

test: test-py test-rust test-fe
	@echo -e "$(GREEN)All tests completed.$(RESET)"

test-py: $(VENV_ACTIVATE)
	@echo -e "$(YELLOW)Running Python tests...$(RESET)"
	@source $(VENV_ACTIVATE) && pytest app/tests/ -v

test-py-cov: $(VENV_ACTIVATE)
	@echo -e "$(YELLOW)Running Python tests with coverage...$(RESET)"
	@source $(VENV_ACTIVATE) && pytest app/tests/ -v \
		--cov=app --cov-report=term-missing --cov-report=html:htmlcov
	@echo -e "$(CYAN)Coverage report → htmlcov/index.html$(RESET)"

test-props: $(VENV_ACTIVATE)
	@echo -e "$(YELLOW)Running property-based tests...$(RESET)"
	@source $(VENV_ACTIVATE) && pytest \
		app/tests/test_mathematical_consistency_properties.py \
		app/tests/test_deriv_api_properties.py \
		-v

test-rust:
	@echo -e "$(YELLOW)Running Rust tests...$(RESET)"
	@cargo test --no-default-features
	@echo -e "$(GREEN)Rust tests passed.$(RESET)"

test-fe:
	@echo -e "$(YELLOW)Running frontend tests...$(RESET)"
	@cd frontend && npm test
	@echo -e "$(GREEN)Frontend tests passed.$(RESET)"

bench:
	@echo -e "$(YELLOW)Running performance benchmarks...$(RESET)"
	@cargo bench
	@echo -e "$(CYAN)Benchmark results in target/criterion/$(RESET)"

# =============================================================================
# LINTING & FORMATTING
# =============================================================================

lint: lint-py lint-rust lint-fe
	@echo -e "$(GREEN)All linting checks passed.$(RESET)"

lint-py: $(VENV_ACTIVATE)
	@echo -e "$(YELLOW)Linting Python...$(RESET)"
	@source $(VENV_ACTIVATE) && black app/ --check && isort app/ --check && flake8 app/

lint-rust:
	@echo -e "$(YELLOW)Linting Rust...$(RESET)"
	@cargo clippy -- -D warnings
	@cargo fmt --check

lint-fe:
	@echo -e "$(YELLOW)Linting TypeScript...$(RESET)"
	@cd frontend && npm run lint && npm run type-check

format: format-py format-rust
	@echo -e "$(GREEN)Code formatted.$(RESET)"

format-py: $(VENV_ACTIVATE)
	@source $(VENV_ACTIVATE) && black app/ && isort app/

format-rust:
	@cargo fmt

# =============================================================================
# HEALTH CHECK
# =============================================================================

health:
	@curl -sf http://localhost:8000/health | python -m json.tool || \
		echo "Backend not running — start with: make dev-api"

health-detailed:
	@curl -sf http://localhost:8000/health/detailed | python -m json.tool

# =============================================================================
# CLEANUP
# =============================================================================

clean:
	@echo -e "$(YELLOW)Cleaning build artefacts...$(RESET)"
	cargo clean
	rm -rf target/ htmlcov/ .coverage .pytest_cache/ __pycache__/
	find app/ -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find app/ -name "*.pyc" -delete 2>/dev/null || true
	@echo -e "$(GREEN)Clean complete.$(RESET)"

clean-fe:
	rm -rf frontend/dist/ frontend/.vite/

clean-all: clean clean-fe
	rm -rf venv/
	rm -rf frontend/node_modules/

# =============================================================================
# HELP
# =============================================================================

help:
	@echo ""
	@echo -e "$(CYAN)Derivatives Pricing Engine — Make Targets$(RESET)"
	@echo "=================================================="
	@echo ""
	@echo -e "  $(GREEN)Setup$(RESET)"
	@echo "    make install          Install all dependencies (Python venv + Node)"
	@echo "    make install-py       Python dependencies only"
	@echo "    make install-fe       Node dependencies only"
	@echo ""
	@echo -e "  $(GREEN)Build$(RESET)"
	@echo "    make build            Build Rust core (dev, fast)"
	@echo "    make build-release    Build Rust core (optimised)"
	@echo "    make build-fe         Build React frontend for production"
	@echo ""
	@echo -e "  $(GREEN)Run$(RESET)"
	@echo "    make dev              Start all services (uses start-local.sh)"
	@echo "    make dev-api          FastAPI backend only (port 8000)"
	@echo "    make dev-frontend     React frontend only (port 3000)"
	@echo ""
	@echo -e "  $(GREEN)Test$(RESET)"
	@echo "    make test             Run all tests"
	@echo "    make test-py          Python tests"
	@echo "    make test-py-cov      Python tests + HTML coverage report"
	@echo "    make test-props       Property-based tests only"
	@echo "    make test-rust        Rust tests"
	@echo "    make test-fe          Frontend tests"
	@echo "    make bench            Performance benchmarks"
	@echo ""
	@echo -e "  $(GREEN)Quality$(RESET)"
	@echo "    make lint             Lint all (Python + Rust + TypeScript)"
	@echo "    make format           Auto-format Python + Rust"
	@echo "    make health           Quick health check (backend must be running)"
	@echo ""
	@echo -e "  $(GREEN)Cleanup$(RESET)"
	@echo "    make clean            Remove build artefacts"
	@echo "    make clean-all        Remove venv and node_modules too"
	@echo ""
