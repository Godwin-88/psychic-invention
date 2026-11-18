# syntax=docker/dockerfile:1.7
#
# Production image for the pricing API.
#   Stage 1 builds the Rust extension into an abi3 wheel (Python >= 3.10).
#   Stage 2 is a slim runtime with no compiler toolchain, running as non-root.
#
# Build:  docker build -t pricing-engine .
# Run:    docker run -p 8000:8000 -e APP_ENV=production \
#           -e WRITE_API_KEYS=... -e ADMIN_API_KEYS=... pricing-engine
# Hugging Face Spaces / Render: set PORT (e.g. 7860); the server binds to it.

ARG PYTHON_VERSION=3.12

# ── Stage 1: build the wheel ─────────────────────────────────────────────────
# The full python image already ships curl and a C toolchain, so the builder
# needs no apt step.
FROM python:${PYTHON_VERSION} AS builder

ARG TARGETARCH
ENV RUSTUP_HOME=/opt/rustup CARGO_HOME=/opt/cargo PATH=/opt/cargo/bin:$PATH
# Official rustup-init binary from static.rust-lang.org (no piped shell script).
RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) triple=x86_64-unknown-linux-gnu ;; \
      arm64) triple=aarch64-unknown-linux-gnu ;; \
      *) echo "unsupported arch ${TARGETARCH}"; exit 1 ;; \
    esac; \
    curl --proto '=https' --tlsv1.2 -fsSLo /tmp/rustup-init \
      "https://static.rust-lang.org/rustup/dist/${triple}/rustup-init"; \
    chmod +x /tmp/rustup-init; \
    /tmp/rustup-init -y --no-modify-path --profile minimal --default-toolchain stable; \
    rm /tmp/rustup-init; \
    rustc --version

RUN pip install --no-cache-dir "maturin>=1.5,<2"

WORKDIR /build
COPY Cargo.toml Cargo.lock pyproject.toml README.md ./
COPY src ./src
COPY benches ./benches
RUN maturin build --release --strip --out /wheels

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_ENV=production \
    PORT=8000 \
    WEB_CONCURRENCY=2

RUN groupadd --system app && useradd --system --gid app --home /app app

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/*.whl && rm -rf /wheels

COPY app ./app
COPY pricing_engine_mock.py ./

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/health', timeout=4)"

# NOTE: the in-memory blotter is per worker. With WEB_CONCURRENCY > 1 set
# DATABASE_URL so all workers share the Postgres blotter.
CMD ["sh", "-c", "exec gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY} -b 0.0.0.0:${PORT} --timeout 120 --graceful-timeout 30 --access-logfile -"]
