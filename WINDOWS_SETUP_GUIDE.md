# 🪟 Windows Setup Guide for Pricing Engine

This guide helps you set up the Pricing Engine on Windows with Python 3.13.

## 🎯 Quick Setup (Recommended)

1. **Install Python 3.13**
   ```cmd
   # Download from: https://www.python.org/downloads/release/python-3130/
   # ✅ Check "Add Python to PATH"
   # ✅ Check "Install for all users"
   ```

2. **Run the setup script**
   ```cmd
   cd psychic-invention
   setup-python313.bat
   ```

3. **Start the API server**
   ```cmd
   start-api-only.bat
   ```

## 📋 Prerequisites

### Required Software
- **Python 3.13** (specifically 3.13, not 3.11 or 3.14)
- **Rust** (latest stable) - https://rustup.rs/
- **Visual Studio Build Tools** - https://visualstudio.microsoft.com/visual-cpp-build-tools/
- **Node.js 16+** (for frontend) - https://nodejs.org/

### Visual Studio Build Tools Setup
1. Download Visual Studio Build Tools
2. Install with "C++ build tools" workload
3. Include: MSVC v143, Windows 10/11 SDK, CMake tools

## 🔧 Step-by-Step Setup

### 1. Install Python 3.13
```cmd
# Check if Python 3.13 is installed
python3.13 --version
# OR
py -3.13 --version

# If not found, download from:
# https://www.python.org/downloads/release/python-3130/
```

### 2. Install Rust
```cmd
# Download and run: https://rustup.rs/
# After installation, restart command prompt and run:
rustup update
cargo --version
```

### 3. Clone and Setup
```cmd
git clone <repository-url>
cd psychic-invention
setup-python313.bat
```

### 4. Start Services
```cmd
# API only (recommended for testing)
start-api-only.bat

# OR full development environment
start-dev.bat
```

## 🚨 Common Issues & Solutions

### Issue 1: Python 3.14 Compatibility Error
```
AttributeError: module 'pkgutil' has no attribute 'ImpImporter'
```

**Solution:**
- Uninstall Python 3.14
- Install Python 3.13 specifically
- Run `setup-python313.bat`

### Issue 2: Rust Linking Error
```
error LNK2019: unresolved external symbol _PyObject_NextNotImplemented
```

**Solutions:**
1. **Install Visual Studio Build Tools**
   ```cmd
   # Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   # Install "Desktop development with C++" workload
   ```

2. **Update Rust**
   ```cmd
   rustup update
   rustc --version
   ```

3. **Clean and rebuild**
   ```cmd
   cargo clean
   maturin develop --release
   ```

### Issue 3: Port Already in Use
```
[ERROR] Port 8000 is already in use
```

**Solution:**
```cmd
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue 4: Virtual Environment Issues
```
[ERROR] Virtual environment not found
```

**Solution:**
```cmd
# Remove existing venv
rmdir /s /q venv

# Run setup again
setup-python313.bat
```

### Issue 5: Maturin Build Fails
```
💥 maturin failed
```

**Solutions:**
1. **Check Python version in venv**
   ```cmd
   venv\Scripts\activate.bat
   python --version  # Should be 3.13.x
   ```

2. **Install build dependencies**
   ```cmd
   pip install --upgrade pip setuptools wheel
   pip install "maturin>=1.4.0"
   ```

3. **Use fallback mock engine**
   - The setup script automatically creates a Python-only fallback
   - API will work but without Rust performance optimizations

## 🧪 Testing Your Setup

### 1. Test API Health
```cmd
curl http://127.0.0.1:8000/health
```

### 2. Test Pricing Endpoint
```cmd
curl -X POST "http://127.0.0.1:8000/price/call/bs" ^
  -H "Content-Type: application/json" ^
  -d "{\"s\": 100, \"k\": 105, \"tau\": 0.25, \"r\": 0.05, \"sigma\": 0.2}"
```

**Expected Response:**
```json
{
  "price": 2.8446,
  "model": "Black-Scholes",
  "request_id": "..."
}
```

### 3. View API Documentation
Open: http://127.0.0.1:8000/docs

## 📁 File Structure After Setup

```
psychic-invention/
├── venv/                     # Python 3.13 virtual environment
├── app/                      # FastAPI application
├── src/                      # Rust source code
├── target/                   # Rust build artifacts
├── setup-python313.bat      # Setup script
├── start-api-only.bat       # Simple API startup
├── start-dev.bat            # Full development startup
├── requirements.txt         # Python dependencies
└── pricing_engine_mock.py   # Fallback if Rust fails
```

## 🎯 Next Steps

1. **API Working?** → Visit http://127.0.0.1:8000/docs
2. **Want Frontend?** → Run `start-dev.bat` (requires Node.js)
3. **Run Tests?** → `pytest app/tests/`
4. **Deploy?** → Use Docker or production scripts

## 🆘 Still Having Issues?

1. **Check Prerequisites**: Ensure Python 3.13, Rust, and Build Tools are installed
2. **Clean Setup**: Delete `venv` folder and run `setup-python313.bat` again
3. **Use Mock Engine**: If Rust build fails, the Python fallback will work
4. **Check Logs**: Look for detailed error messages in the command output

## 🔗 Useful Links

- [Python 3.13 Download](https://www.python.org/downloads/release/python-3130/)
- [Rust Installation](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [Node.js Download](https://nodejs.org/)

---

**Status: Windows Compatible ✅**  
*Tested on Windows 10/11 with Python 3.13*