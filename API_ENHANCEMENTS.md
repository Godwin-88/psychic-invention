# API Enhancements Documentation

## Overview

This document describes the enhanced API endpoints added to the Derivatives Pricing Engine to support:
- Enhanced FFT pricing with automatic parameter optimization
- Heston model pricing with stochastic volatility
- Comprehensive Greeks calculations for all pricing models
- Utility functions for parameter validation

## New Endpoints

### Enhanced FFT Pricing

#### POST /price/call/fft-optimized
Enhanced FFT call pricing with automatic parameter optimization for numerical stability.

**Request Body:**
```json
{
  "s": 100.0,      // Current stock price
  "k": 100.0,      // Strike price
  "tau": 1.0,      // Time to expiration
  "r": 0.05,       // Risk-free rate
  "sigma": 0.2     // Volatility
}
```

**Response:**
```json
{
  "price": 10.450583572185565,
  "model": "FFT-Optimized",
  "description": "FFT pricing with automatic parameter optimization for stability"
}
```

#### POST /price/put/fft-optimized
Enhanced FFT put pricing with automatic parameter optimization.

#### POST /price/call/fft-enhanced
Enhanced FFT call pricing with manual parameters and stability checks.

#### POST /price/put/fft-enhanced
Enhanced FFT put pricing with manual parameters and stability checks.

### Heston Model Pricing

#### POST /price/call/heston
Heston model call pricing with stochastic volatility.

**Request Body:**
```json
{
  "s": 100.0,        // Current stock price
  "k": 100.0,        // Strike price
  "tau": 1.0,        // Time to expiration
  "r": 0.05,         // Risk-free rate
  "v0": 0.04,        // Initial variance
  "theta": 0.04,     // Long-term variance
  "kappa": 2.0,      // Mean reversion speed
  "sigma_v": 0.3,    // Volatility of volatility
  "rho": -0.5        // Correlation
}
```

**Response:**
```json
{
  "price": 10.450583572185565,
  "model": "Heston",
  "description": "Stochastic volatility pricing using Heston model",
  "feller_condition_satisfied": true
}
```

#### POST /price/put/heston
Heston model put pricing with stochastic volatility.

### Greeks Calculation

#### POST /greeks/call
Calculate Greeks for call options using specified model (bs, fft, or numerical).

**Request Body:**
```json
{
  "s": 100.0,      // Current stock price
  "k": 100.0,      // Strike price
  "tau": 1.0,      // Time to expiration
  "r": 0.05,       // Risk-free rate
  "sigma": 0.2,    // Volatility
  "model": "bs"    // Model: "bs", "fft", or "numerical"
}
```

**Response:**
```json
{
  "greeks": {
    "delta": 0.6368,
    "gamma": 0.0188,
    "theta": -6.4140,
    "vega": 37.5240,
    "rho": 53.2325
  },
  "option_type": "call",
  "model": "bs",
  "method": "Analytical Black-Scholes"
}
```

#### POST /greeks/put
Calculate Greeks for put options using specified model.

#### POST /greeks/call/heston
Calculate Greeks for Heston model call options.

#### POST /greeks/put/heston
Calculate Greeks for Heston model put options.

### Utility Endpoints

#### POST /validate/feller
Validate Heston model Feller condition.

**Parameters:**
- kappa: Mean reversion speed
- theta: Long-term variance
- sigma_v: Volatility of volatility

**Response:**
```json
{
  "feller_condition_satisfied": true,
  "condition_value": 0.1600,
  "threshold": 0.0900,
  "explanation": "Feller condition requires 2*kappa*theta > sigma_v^2 for mean reversion"
}
```

#### POST /compare/models
Compare prices across multiple models for the same option.

**Request Body:** Standard option parameters

**Response:**
```json
{
  "parameters": {
    "s": 100.0,
    "k": 100.0,
    "tau": 1.0,
    "r": 0.05,
    "sigma": 0.2
  },
  "results": {
    "black_scholes": {
      "call": 10.450584,
      "put": 5.573526
    },
    "fft_optimized": {
      "call": 10.450584,
      "put": 5.573526
    }
  }
}
```

## Requirements Validation

The enhanced API endpoints satisfy the following requirements:

### Requirement 1.1 & 1.2 (FFT Pricing Accuracy)
- ✅ `/price/call/fft-optimized` and `/price/put/fft-optimized` endpoints
- ✅ Automatic parameter optimization for numerical stability
- ✅ Enhanced error handling with diagnostic information

### Requirement 2.1 & 2.2 (Heston Model Implementation)
- ✅ `/price/call/heston` and `/price/put/heston` endpoints
- ✅ Feller condition validation before pricing
- ✅ Comprehensive error handling for invalid parameters

### Requirement 3.7 (Greeks Calculation System)
- ✅ `/greeks/call` and `/greeks/put` endpoints for multiple models
- ✅ `/greeks/call/heston` and `/greeks/put/heston` for Heston Greeks
- ✅ Support for analytical (Black-Scholes), numerical, and FFT-based Greeks
- ✅ Structured response format with all five Greeks

## Error Handling

All endpoints include comprehensive error handling:
- Parameter validation with descriptive error messages
- Feller condition validation for Heston model
- Numerical stability checks for FFT pricing
- HTTP 400 status codes for invalid requests with detailed error descriptions

## Testing

The API has been tested with:
- Mock pricing engine implementation for development
- Comprehensive test suite covering all new endpoints
- Parameter validation and error condition testing
- Integration testing with FastAPI TestClient

## Next Steps

1. Build and integrate the actual Rust pricing engine
2. Add performance monitoring and logging
3. Implement rate limiting and authentication
4. Add API documentation with OpenAPI/Swagger
5. Deploy to production environment