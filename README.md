derivative-pricing-engine/
├── pricing_engine/            # Rust crate (core pricing models)
│   ├── Cargo.toml              # Rust project config (with PyO3)
│   ├── src/
│   │   ├── lib.rs              # Main Rust library entry point
│   │   ├── black_scholes.rs    # Black-Scholes pricing module
│   │   ├── monte_carlo.rs      # Monte Carlo simulation module
│   │   └── utils.rs            # Math utilities, random generators
│   └── tests/
│       └── integration_test.rs # Rust integration tests
├── app/                        # Python orchestrator (API / CLI)
│   ├── main.py                 # Entry point (FastAPI app / CLI)
│   ├── pricing_interface.py    # Python interface to Rust lib
│   ├── models.py               # Pydantic models for API inputs
│   ├── config.py               # Configuration settings
│   └── tests/
│       ├── test_pricing.py      # Python test for pricing functions
│       └── test_api.py          # API endpoint tests
├── pyproject.toml              # Maturin build config for PyO3
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker build file
├── .dockerignore               # Docker ignore patterns
├── README.md                   # Project overview & instructions
└── Makefile                    # (optional) Make common tasks easy

