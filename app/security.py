"""
API-key authentication and CORS configuration.

Scopes
------
write   endpoints that change state (book trades)
admin   operational / sensitive endpoints (cache flush, knowledge-graph
        enrichment, reading marketplace registrations, which hold PII).
        Admin keys also carry the write scope.

Configuration (environment)
---------------------------
WRITE_API_KEYS   comma-separated keys with the write scope
ADMIN_API_KEYS   comma-separated keys with the admin scope
CORS_ORIGINS     comma-separated allowed origins
                 (default http://localhost:3000,http://127.0.0.1:3000)

Clients send the key as ``X-API-Key: <key>`` or ``Authorization: Bearer <key>``.

Behaviour when no keys are configured
-------------------------------------
- development (APP_ENV unset or not production): protected endpoints are
  open, so local use is unchanged.
- production (APP_ENV=production): protected endpoints FAIL CLOSED with 503
  until keys are configured.

Read-only analytics endpoints (pricing, risk, optimisation) are not gated.
"""

from __future__ import annotations

import hmac
import os
from typing import Callable, List, Optional, Set

from fastapi import Header, HTTPException, Request

_DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


def _split(value: Optional[str]) -> List[str]:
    return [v.strip() for v in (value or "").split(",") if v.strip()]


def is_production() -> bool:
    return os.getenv("APP_ENV", "development").lower() in ("production", "prod")


def cors_origins() -> List[str]:
    origins = _split(os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS))
    if "*" in origins:
        # A wildcard with allow_credentials=True would be rejected by browsers
        # and is unsafe for a trading API; require explicit origins.
        raise RuntimeError("CORS_ORIGINS must list explicit origins, not '*'")
    return origins


def _keys_for(scope: str) -> Set[str]:
    admin = set(_split(os.getenv("ADMIN_API_KEYS")))
    if scope == "admin":
        return admin
    return admin | set(_split(os.getenv("WRITE_API_KEYS")))


def _extract_key(x_api_key: Optional[str], authorization: Optional[str]) -> Optional[str]:
    if x_api_key:
        return x_api_key.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def require_scope(scope: str) -> Callable:
    """FastAPI dependency enforcing an API-key scope ("write" or "admin")."""
    if scope not in ("write", "admin"):
        raise ValueError("scope must be 'write' or 'admin'")

    async def dependency(
        request: Request,
        x_api_key: Optional[str] = Header(default=None),
        authorization: Optional[str] = Header(default=None),
    ) -> None:
        valid = _keys_for(scope)
        if not valid:
            if is_production():
                raise HTTPException(
                    status_code=503,
                    detail=f"No API keys configured for scope '{scope}'; "
                    "set WRITE_API_KEYS / ADMIN_API_KEYS.",
                )
            return  # development: open
        key = _extract_key(x_api_key, authorization)
        if not key:
            raise HTTPException(
                status_code=401,
                detail="API key required (X-API-Key header or Bearer token)",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Constant-time comparison against every configured key.
        if not any(hmac.compare_digest(key, k) for k in valid):
            raise HTTPException(status_code=403, detail=f"API key lacks the '{scope}' scope")
        request.state.api_scope = scope

    return dependency


require_write = require_scope("write")
require_admin = require_scope("admin")
