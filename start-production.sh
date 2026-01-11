#!/bin/bash

# Pricing Engine Production Startup Script (Unix/Linux/macOS)
# This script starts the production-ready servers with optimized settings

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_HOST=${BACKEND_HOST:-"0.0.0.0"}
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
WORKERS=${WORKERS:-4}
LOG_LEVEL=${LOG_LEVEL:-"info"}

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

# Function to cleanup background processes
cleanup() {
    print_status "Shutting down production services..."
    
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
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    
    print_success "Production services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "🚀 Starting Pricing Engine Production Environment"
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

# Setup Python virtual environment
print_status "Setting up Python production environment..."

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

# Build Rust core with optimizations
print_status "Building optimized Rust pricing engine..."
maturin develop --release
print_success "Optimized Rust pricing engine built successfully"

# Build frontend for production
print_status "Building frontend for production..."
cd frontend

if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

print_status "Building production frontend..."
npm run build
print_success "Frontend built for production"
cd ..

# Set production environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export RUST_LOG=${LOG_LEVEL}
export FASTAPI_ENV="production"

# Start backend server with Gunicorn for production
print_status "Starting production backend server..."
print_status "Host: $BACKEND_HOST, Port: $BACKEND_PORT, Workers: $WORKERS"

gunicorn app.main:app \
    --bind $BACKEND_HOST:$BACKEND_PORT \
    --workers $WORKERS \
    --worker-class uvicorn.workers.UvicornWorker \
    --access-logfile - \
    --error-logfile - \
    --log-level $LOG_LEVEL \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --preload &

BACKEND_PID=$!

# Wait for backend to be ready
print_status "Waiting for backend to be ready..."
sleep 10

# Test backend health
if curl -s "http://$BACKEND_HOST:$BACKEND_PORT/health" >/dev/null 2>&1; then
    print_success "Backend API is ready and healthy"
else
    print_error "Backend API failed to start properly"
    cleanup
    exit 1
fi

# Start frontend server (production build served by Node.js)
print_status "Starting production frontend server..."
cd frontend

# Create a simple production server
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router (return `index.html` for non-API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend server running on http://0.0.0.0:${port}`);
});
EOF

# Install express if not present
if ! npm list express >/dev/null 2>&1; then
    npm install express
fi

# Start the frontend server
PORT=$FRONTEND_PORT node server.js &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
print_status "Waiting for frontend to be ready..."
sleep 5

# Test frontend
if curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
    print_success "Frontend is ready"
else
    print_warning "Frontend may still be starting..."
fi

# Display success message
echo ""
echo "🎉 Pricing Engine Production Environment is running!"
echo "===================================================="
echo ""
echo "📊 Backend API:     http://$BACKEND_HOST:$BACKEND_PORT"
echo "📋 API Docs:        http://$BACKEND_HOST:$BACKEND_PORT/docs"
echo "🌐 Frontend:        http://localhost:$FRONTEND_PORT"
echo "❤️  Health Check:    http://$BACKEND_HOST:$BACKEND_PORT/health"
echo "📈 Metrics:         http://$BACKEND_HOST:$BACKEND_PORT/health/detailed"
echo ""
echo "⚙️  Configuration:"
echo "  • Workers:         $WORKERS"
echo "  • Log Level:       $LOG_LEVEL"
echo "  • Backend Host:    $BACKEND_HOST"
echo "  • Backend Port:    $BACKEND_PORT"
echo "  • Frontend Port:   $FRONTEND_PORT"
echo ""
echo "🔧 Environment Variables (optional):"
echo "  • BACKEND_HOST=0.0.0.0"
echo "  • BACKEND_PORT=8000"
echo "  • FRONTEND_PORT=3000"
echo "  • WORKERS=4"
echo "  • LOG_LEVEL=info"
echo "  • DERIV_API_KEY=your_api_key"
echo "  • DERIV_APP_ID=your_app_id"
echo ""
echo "🧪 Performance Test:"
echo 'curl -X POST "http://'$BACKEND_HOST':'$BACKEND_PORT'/price/call/fft-optimized" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"s": 100, "k": 105, "tau": 0.25, "r": 0.05, "sigma": 0.2}'"'"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running and wait for interrupt
wait