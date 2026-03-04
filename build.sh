#!/bin/bash
set -e  # Exit on error

echo "==> Starting build..."

# Install Rust
echo "==> Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Source cargo environment
echo "==> Setting up Cargo environment..."
export PATH="$HOME/.cargo/bin:$PATH"
export CARGO_HOME="$HOME/.cargo"

# Verify Rust installation
echo "==> Verifying Rust installation..."
rustc --version
cargo --version

# Upgrade pip
echo "==> Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "==> Installing Python dependencies..."
pip install -r requirements.txt

# Build Rust extension with maturin
echo "==> Building Rust extension with maturin..."
maturin develop --release

echo "==> Build complete!"
