import pricing_engine

# Simple smoke test
def main():
    S, K, T, r, sigma = 100, 100, 1.0, 0.05, 0.2
    call = pricing_engine.price_call(S, K, T, r, sigma)
    put = pricing_engine.price_put(S, K, T, r, sigma)
    print(f"Call: {call:.4f}, Put: {put:.4f}")

if __name__ == '__main__':
    #print('BS call:', pricing_engine.price_call(100,100,1,0.05,0.2))
    #print('MC call:', pricing_engine.price_call_mc(100,100,1,0.05,0.2,100000))
    #fft_prices = pricing_engine.price_call_fft(100, -5.0, 0.1, 256, 1.0, 0.05, 0.2, 1.5)
    #print(f"FFT prices sample: {fft_prices[:5]}")
    cf = pricing_engine.cf_heston(1.0, 100, 0.04, 0.05, 2.0, 0.04, 0.5, -0.7, 1.0)
    print(f"phi(1): {cf}")