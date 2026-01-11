# 🚀 Pricing Engine Startup Guide

This guide provides multiple ways to start the Pricing Engine depending on your needs and environment.

## 📋 Prerequisites

Before running any startup script, ensure you have:

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Rust** (latest stable) with Cargo
- **Git** (for cloning)

### Quick Installation Check
```bash
python --version    # Should be 3.8+
node --version      # Should be 16+
npm --version       # Should be 8+
cargo --version     # Should be 1.70+
```

## 🎯 Startup Options

### 1. Development Mode (Recommended for Development)

**Unix/Linux/macOS:**
```bash
./start-dev.sh
```

**Windows (PowerShell):**
```powershell
.\start-dev.ps1
```

**Windows (Command Prompt):**
```cmd
start-dev.bat
```

**Features:**
- ✅ Hot reload for both backend and frontend
- ✅ Development optimizations
- ✅ Detailed logging
- ✅ Automatic dependency installation
- ✅ Health checks and port validation

### 2. Production Mode

**Unix/Linux/macOS:**
```bash
./start-production.sh
```

**Features:**
- ✅ Optimized builds
- ✅ Gunicorn with multiple workers
- ✅ Production-ready configuration
- ✅ Performance monitoring
- ✅ Configurable via environment variables

### 3. Quick Start (Minimal Setup)

**Unix/Linux/macOS:**
```bash
./quick-start.sh
```

**Features:**
- ✅ Fastest startup time
- ✅ Minimal dependencies
- ✅ API-only (no frontend)
- ✅ Perfect for testing

### 4. Docker Compose (Containerized)

```bash
docker-compose up -d
```

**Features:**
- ✅ Fully containerized
- ✅ Redis cache included
- ✅ Nginx reverse proxy
- ✅ Production-ready
- ✅ Easy scaling

## 🌐 Access Points

Once started, the services will be available at:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React-based pricing workspace |
| **Backend API** | http://127.0.0.1:8000 | FastAPI REST endpoints |
| **API Documentation** | http://127.0.0.1:8000/docs | Interactive Swagger UI |
| **Health Check** | http://127.0.0.1:8000/health | System health status |
| **Detailed Health** | http://127.0.0.1:8000/health/detailed | Comprehensive diagnostics |

## 🧪 Testing the Installation

### Quick API Test
```bash
curl -X POST "http://127.0.0.1:8000/price/call/bs" \
  -H "Content-Type: application/json" \
  -d '{"s": 100, "k": 105, "tau": 0.25, "r": 0.05, "sigma": 0.2}'
```

**Expected Response:**
```json
{
  "price": 2.8446,
  "model": "Black-Scholes",
  "request_id": "..."
}
```

### Run All Tests
```bash
./run-tests.sh
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# API Configuration
DERIV_API_KEY=your_api_key_here
DERIV_APP_ID=your_app_id_here

# Cache Configuration
CACHE_TTL_L1=30
CACHE_TTL_L2=300

# Performance Settings
MAX_CONCURRENT_REQUESTS=1000
RATE_LIMIT_PER_SECOND=10

# Logging
LOG_LEVEL=info
RUST_LOG=info
```

### Production Configuration

For production deployment, set these environment variables:

```bash
export BACKEND_HOST=0.0.0.0
export BACKEND_PORT=8000
export FRONTEND_PORT=3000
export WORKERS=4
export LOG_LEVEL=info
```

## 🔧 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

**2. Python Virtual Environment Issues**
```bash
# Remove and recreate
rm -rf venv
python3 -m venv venv
source venv/bin/activate
```

**3. Rust Build Failures**
```bash
# Update Rust
rustup update
# Clean and rebuild
cargo clean
maturin develop --release
```

**4. Frontend Build Issues**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Performance Issues

**Backend Slow Response:**
- Increase worker count: `WORKERS=8`
- Check system resources: `htop` or Task Manager
- Review logs for errors

**Frontend Loading Issues:**
- Clear browser cache
- Check browser console for errors
- Verify API connectivity

## 📊 Monitoring

### Health Checks

The system provides comprehensive health monitoring:

```bash
# Basic health
curl http://127.0.0.1:8000/health

# Detailed diagnostics
curl http://127.0.0.1:8000/health/detailed

# Error statistics
curl http://127.0.0.1:8000/health/errors
```

### Performance Metrics

Monitor performance in real-time:

```bash
# API performance
curl http://127.0.0.1:8000/health/detailed | jq '.performance'

# Cache statistics
curl http://127.0.0.1:8000/market-data/cache/stats
```

## 🛑 Stopping Services

### Development Mode
- Press `Ctrl+C` in the terminal running the startup script
- Services will be automatically cleaned up

### Production Mode
- Press `Ctrl+C` or send SIGTERM
- Graceful shutdown with cleanup

### Docker Compose
```bash
docker-compose down
```

### Manual Cleanup
```bash
# Kill processes on specific ports
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

## 📚 Next Steps

1. **Explore the API**: Visit http://127.0.0.1:8000/docs
2. **Use the Frontend**: Open http://localhost:3000
3. **Run Tests**: Execute `./run-tests.sh`
4. **Read Documentation**: Check the README.md for detailed features
5. **Deploy to Production**: Use the production startup script or Docker

## 🆘 Support

If you encounter issues:

1. Check the logs in the terminal output
2. Verify all prerequisites are installed
3. Ensure ports 3000 and 8000 are available
4. Review the troubleshooting section above
5. Check the comprehensive test suite with `./run-tests.sh`

---

**Status: Production Ready ✅**  
*All startup scripts tested and validated for production use.*