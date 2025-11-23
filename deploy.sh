#!/bin/bash

# Deployment script for Derivatives Pricing Engine
set -e

echo "🚀 Starting deployment of Derivatives Pricing Engine..."

# Activate virtual environment
source venv/bin/activate

# Build Rust components
echo "🔧 Building Rust components..."
maturin develop

# Run tests
echo "🧪 Running test suite..."
python -m pytest -v

# Start the API server
echo "🌐 Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

echo "✅ Deployment completed successfully!"
echo "📡 API available at: http://localhost:8000"
echo "📚 API docs at: http://localhost:8000/docs"
