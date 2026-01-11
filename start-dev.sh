#!/bin/bash

# Pricing Engine Development Startup Script (Unix/Linux/macOS)
# This script starts both the backend API and frontend development servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to cleanup background processes
cleanup() {
    print_status "Shutting down services..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_status "Backend server stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_status "Frontend server stopped"
    fi
    
    # Kill any remaining processes on our ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    print_success "Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "🚀 Starting Pricing Engine Development Environment"
echo "=================================================="

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists python3; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is required but not installed"
    exit 1
fi

if ! command_exists cargo; then
    print_error "Rust/Cargo is required but not installed"
    exit 1
fi

print_success "All prerequisites found"

# Check if ports are available
if ! check_port 8000; then
    print_error "Port 8000 is already in use. Please stop the service using this port."
    exit 1
fi

if ! check_port 3000; then
    print_error "Port 3000 is already in use. Please stop the service using this port."
    exit 1
fi

print_success "Ports 8000 and 3000 are available"

# Setup Python virtual environment
print_status "Setting up Python environment..."

if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate
print_success "Python virtual environment activated"

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Build Rust core
print_status "Building Rust pricing engine..."
maturin develop --release
print_success "Rust pricing engine built successfully"

# Setup frontend dependencies
print_status "Setting up frontend dependencies..."
cd frontend

if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

print_success "Frontend dependencies ready"
cd ..

# Start backend server
print_status "Starting backend API server on http://127.0.0.1:8000..."
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
if ! wait_for_service "http://127.0.0.1:8000/health" "Backend API"; then
    cleanup
    exit 1
fi

# Start frontend server
print_status "Starting frontend development server on http://localhost:3000..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
if ! wait_for_service "http://localhost:3000" "Frontend"; then
    cleanup
    exit 1
fi

# Display success message
echo ""
echo "🎉 Pricing Engine is now running!"
echo "=================================="
echo ""
echo "📊 Backend API:     http://127.0.0.1:8000"
echo "📋 API Docs:        http://127.0.0.1:8000/docs"
echo "🌐 Frontend:        http://localhost:3000"
echo "❤️  Health Check:    http://127.0.0.1:8000/health"
echo ""
echo "📈 Available Endpoints:"
echo "  • Black-Scholes:   POST /price/call/bs, /price/put/bs"
echo "  • Enhanced FFT:    POST /price/call/fft-optimized"
echo "  • Heston Model:    POST /price/call/heston"
echo "  • Greeks:          POST /greeks/call, /greeks/put"
echo "  • Market Data:     POST /market-data/spot"
echo ""
echo "🧪 Quick Test:"
echo 'curl -X POST "http://127.0.0.1:8000/price/call/bs" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"s": 100, "k": 105, "tau": 0.25, "r": 0.05, "sigma": 0.2}'"'"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running and wait for interrupt
wait