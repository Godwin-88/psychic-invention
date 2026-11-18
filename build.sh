#!/usr/bin/env bash
# Render (native Python environment) build: compile the Rust extension into a
# wheel and install it with the runtime dependencies.
set -euo pipefail

echo "==> Installing Rust toolchain"
if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi
export PATH="$HOME/.cargo/bin:$PATH"
rustc --version

echo "==> Installing Python dependencies"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt "maturin>=1.5,<2"

echo "==> Building and installing the pricing_engine wheel"
rm -rf dist/wheels
maturin build --release --strip --out dist/wheels
python -m pip install --force-reinstall dist/wheels/*.whl

python -c "import pricing_engine; print('pricing_engine OK:', pricing_engine.price_call(100, 100, 1.0, 0.05, 0.2))"
echo "==> Build complete"
