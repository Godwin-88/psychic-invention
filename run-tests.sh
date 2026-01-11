#!/bin/bash

# Comprehensive Test Runner for Pricing Engine
# Runs all tests: Rust, Python, Frontend, and Integration tests

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Test results tracking
RUST_TESTS_PASSED=0
PYTHON_TESTS_PASSED=0
FRONTEND_TESTS_PASSED=0
INTEGRATION_TESTS_PASSED=0

print_status "🧪 Running Comprehensive Test Suite"
echo "====================================="
echo ""

# Activate Python virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    print_status "Python virtual environment activated"
fi

# 1. Rust Tests
print_status "Running Rust tests..."
echo "----------------------"

if cargo test --release; then
    print_success "✅ Rust unit tests passed"
    RUST_TESTS_PASSED=1
else
    print_error "❌ Rust unit tests failed"
fi

# Run Rust property tests
print_status "Running Rust property tests..."
if cargo test --release --test greeks_property_tests; then
    print_success "✅ Rust property tests passed"
else
    print_error "❌ Rust property tests failed"
fi

# Run Rust benchmarks (optional)
if command -v cargo >/dev/null 2>&1; then
    print_status "Running Rust benchmarks..."
    if cargo bench --no-run; then
        print_success "✅ Rust benchmarks compiled successfully"
    else
        print_warning "⚠️  Rust benchmarks compilation failed"
    fi
fi

echo ""

# 2. Python Tests
print_status "Running Python tests..."
echo "-----------------------"

# Build Rust extension first
print_status "Building Rust extension for Python tests..."
if maturin develop --release; then
    print_success "✅ Rust extension built successfully"
else
    print_error "❌ Failed to build Rust extension"
    exit 1
fi

# Run Python unit tests
if pytest app/tests/ -v --tb=short; then
    print_success "✅ Python unit tests passed"
    PYTHON_TESTS_PASSED=1
else
    print_error "❌ Python unit tests failed"
fi

# Run Python property-based tests
print_status "Running Python property-based tests..."
if pytest app/tests/test_*_properties.py -v --tb=short; then
    print_success "✅ Python property tests passed"
else
    print_error "❌ Python property tests failed"
fi

# Run mathematical consistency tests
print_status "Running mathematical consistency tests..."
if pytest app/tests/test_mathematical_consistency_properties.py -v --tb=short; then
    print_success "✅ Mathematical consistency tests passed"
else
    print_error "❌ Mathematical consistency tests failed"
fi

echo ""

# 3. Frontend Tests
print_status "Running Frontend tests..."
echo "-------------------------"

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Run frontend tests
if npm test; then
    print_success "✅ Frontend tests passed"
    FRONTEND_TESTS_PASSED=1
else
    print_error "❌ Frontend tests failed"
fi

# Run frontend linting
print_status "Running frontend linting..."
if npm run lint; then
    print_success "✅ Frontend linting passed"
else
    print_warning "⚠️  Frontend linting issues found"
fi

# Run TypeScript type checking
print_status "Running TypeScript type checking..."
if npm run type-check; then
    print_success "✅ TypeScript type checking passed"
else
    print_error "❌ TypeScript type checking failed"
fi

cd ..
echo ""

# 4. Integration Tests
print_status "Running Integration tests..."
echo "----------------------------"

# Start backend server for integration tests
print_status "Starting backend server for integration tests..."
uvicorn app.main:app --host 127.0.0.1 --port 8001 &
BACKEND_PID=$!

# Wait for server to start
sleep 5

# Test if server is responding
if curl -s http://127.0.0.1:8001/health >/dev/null 2>&1; then
    print_success "✅ Backend server started for integration tests"
    
    # Run integration tests
    if pytest app/tests/test_complete_system_integration.py -v --tb=short; then
        print_success "✅ Integration tests passed"
        INTEGRATION_TESTS_PASSED=1
    else
        print_error "❌ Integration tests failed"
    fi
    
    # Run API performance tests
    print_status "Running API performance tests..."
    if pytest app/tests/test_api_performance.py -v --tb=short; then
        print_success "✅ API performance tests passed"
    else
        print_warning "⚠️  API performance tests failed"
    fi
    
else
    print_error "❌ Failed to start backend server for integration tests"
fi

# Cleanup backend server
if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
    print_status "Backend server stopped"
fi

echo ""

# 5. Test Summary
print_status "Test Summary"
echo "============"
echo ""

TOTAL_PASSED=0

if [ $RUST_TESTS_PASSED -eq 1 ]; then
    echo -e "✅ Rust Tests:        ${GREEN}PASSED${NC}"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "❌ Rust Tests:        ${RED}FAILED${NC}"
fi

if [ $PYTHON_TESTS_PASSED -eq 1 ]; then
    echo -e "✅ Python Tests:      ${GREEN}PASSED${NC}"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "❌ Python Tests:      ${RED}FAILED${NC}"
fi

if [ $FRONTEND_TESTS_PASSED -eq 1 ]; then
    echo -e "✅ Frontend Tests:    ${GREEN}PASSED${NC}"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "❌ Frontend Tests:    ${RED}FAILED${NC}"
fi

if [ $INTEGRATION_TESTS_PASSED -eq 1 ]; then
    echo -e "✅ Integration Tests: ${GREEN}PASSED${NC}"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "❌ Integration Tests: ${RED}FAILED${NC}"
fi

echo ""
echo "Results: $TOTAL_PASSED/4 test suites passed"

if [ $TOTAL_PASSED -eq 4 ]; then
    print_success "🎉 All tests passed! System is ready for production."
    exit 0
else
    print_error "❌ Some tests failed. Please review the output above."
    exit 1
fi