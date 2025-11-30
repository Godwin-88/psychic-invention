from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pricing_engine

app = FastAPI(title="Derivatives Pricing Engine", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OptionRequest(BaseModel):
    s: float  # Current stock price
    k: float  # Strike price
    tau: float  # Time to expiration
    r: float  # Risk-free rate
    sigma: float  # Volatility

class FFTRequest(BaseModel):
    s: float
    k_min: float
    delta_v: float
    delta_k: float
    n: int
    tau: float
    r: float
    sigma: float
    alpha: float

@app.get("/")
def root():
    return {"message": "Derivatives Pricing Engine API"}

@app.post("/price/call/bs")
def price_call_bs(request: OptionRequest):
    try:
        price = pricing_engine.price_call(request.s, request.k, request.tau, request.r, request.sigma)
        return {"price": price, "model": "Black-Scholes"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/price/put/bs")
def price_put_bs(request: OptionRequest):
    try:
        price = pricing_engine.price_put(request.s, request.k, request.tau, request.r, request.sigma)
        return {"price": price, "model": "Black-Scholes"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/price/call/fft")
def price_call_fft(request: FFTRequest):
    try:
        prices = pricing_engine.price_call_fft(
            request.s, request.k_min, request.delta_v, request.delta_k, 
            request.n, request.tau, request.r, request.sigma, request.alpha
        )
        return {"prices": prices, "model": "FFT"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/price/put/fft")
def price_put_fft(request: FFTRequest):
    try:
        prices = pricing_engine.price_put_fft(
            request.s, request.k_min, request.delta_v, request.delta_k,
            request.n, request.tau, request.r, request.sigma, request.alpha
        )
        return {"prices": prices, "model": "FFT"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy"}
