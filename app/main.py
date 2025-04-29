import pricing_engine

# Simple smoke test
def main():
    S, K, T, r, sigma = 100, 100, 1.0, 0.05, 0.2
    call = pricing_engine.price_call(S, K, T, r, sigma)
    put = pricing_engine.price_put(S, K, T, r, sigma)
    print(f"Call: {call:.4f}, Put: {put:.4f}")

if __name__ == '__main__':
    print('BS call:', pricing_engine.price_call(100,100,1,0.05,0.2))
    print('MC call:', pricing_engine.price_call_mc(100,100,1,0.05,0.2,100000))