#!/bin/bash

# Quick Start Script - Minimal setup for testing
# This script provides the fastest way to get the pricing engine running

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Quick Start - Pricing Engine${NC}"
echo "================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install minimal dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q fastapi uvicorn maturin numpy

# Build Rust core
echo "Building Rust engine..."
maturin develop -q

# Start server
echo -e "${GREEN}✅ Starting API server...${NC}"
echo ""
echo "🌐 API: http://127.0.0.1:8000"
echo "📋 Docs: http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --host 127.0.0.1 --port 8000