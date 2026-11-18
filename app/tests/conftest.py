"""Shared pytest configuration.

Live-server load tests (test_api_performance.py) need a running API on
localhost:8000 and aiohttp; they run only with RUN_INTEGRATION=1.
"""

import os

collect_ignore = []
if os.getenv("RUN_INTEGRATION") != "1":
    collect_ignore.append("test_api_performance.py")
