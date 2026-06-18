import re
import time
import uuid
from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import get_session
from app.models import Profile


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str | None
    claims: dict


# kid -> (fetched_at_monotonic, jwks) keyed by issuer URL
_JWKS_CACHE: dict[str, tuple[float, dict]] = {}
_JWKS_TTL = 600.0
# Minimum gap between forced refetches. Without this, a token bearing an
# unknown `kid` would trigger a fresh (blocking) JWKS fetch on every request —
# an attacker-controlled amplification against the auth path and Supabase.
_JWKS_FORCE_COOLDOWN = 60.0
_JWKS_LAST_FORCE: dict[str, float] = {}


def _fetch_jwks(settings: Settings) -> dict:
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=5.0)
    resp.raise_for_status()
    return resp.json()


def _get_jwks(settings: Settings, *, force: bool = False) -> dict:
    now = time.monotonic()
    cached = _JWKS_CACHE.get(settings.supabase_url)
    if cached and not force and now - cached[0] < _JWKS_TTL:
        return cached[1]
    if force and cached is not None:
        # Rate-limit forced refetches so a stream of bogus `kid`s can't make
        # us hammer the JWKS endpoint (or block the event loop) per request.
        last = _JWKS_LAST_FORCE.get(settings.supabase_url, 0.0)
        if now - last < _JWKS_FORCE_COOLDOWN:
            return cached[1]
        _JWKS_LAST_FORCE[settings.supabase_url] = now
    jwks = _fetch_jwks(settings)
    _JWKS_CACHE[settings.supabase_url] = (now, jwks)
    return jwks


def _signing_key(token: str, settings: Settings) -> dict:
    kid = jwt.get_unverified_header(token).get("kid")
    for force in (False, True):  # refetch once on a kid miss (key rotation)
        for key in _get_jwks(settings, force=force).get("keys", []):
            if key.get("kid") == kid:
                return key
    raise ValueError(f"no JWK for kid {kid!r}")


def decode_token(token: str, settings: Settings) -> dict:
    issuer = f"{settings.supabase_url}/auth/v1"
    if settings.supabase_jwt_alg == "HS256":
        key: object = settings.supabase_jwt_secret
        algorithms = ["HS256"]
    else:
        key = _signing_key(token, settings)
        # Supabase asymmetric signing keys may be RS256 or ES256 (newer
        # projects default to ES256 / EC P-256 in their JWKS). Accept both.
        algorithms = ["RS256", "ES256"]
    return jwt.decode(
        token,
        key,
        algorithms=algorithms,
        audience="authenticated",
        issuer=issuer,
    )


_NON_HANDLE = re.compile(r"[^a-z0-9_-]+")


def _slug(value: str) -> str:
    s = _NON_HANDLE.sub("-", value.strip().lower()).strip("-_")
    return (s or "user")[:32]


async def _ensure_profile(session: AsyncSession, user_id: uuid.UUID, claims: dict) -> None:
    if await session.get(Profile, user_id) is not None:
        return
    meta = claims.get("user_metadata") or {}
    email = claims.get("email") or ""
    display = (
        meta.get("full_name")
        or meta.get("name")
        or meta.get("user_name")
        or (email.split("@")[0] if email else "User")
    )
    base = _slug(meta.get("user_name") or display)
    handle, n = base, 2
    while (
        await session.execute(select(Profile).where(Profile.handle == handle))
    ).scalar_one_or_none() is not None:
        handle = f"{base}-{n}"[:32]
        n += 1
    session.add(
        Profile(
            id=user_id,
            handle=handle,
            display_name=display or handle,
            avatar_url=meta.get("avatar_url") or meta.get("picture"),
        )
    )
    await session.flush()


async def require_user(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization[len("Bearer ") :]
    try:
        claims = decode_token(token, settings)
    except Exception:
        raise HTTPException(status_code=401, detail="invalid token")
    sub = claims.get("sub")
    try:
        uid = uuid.UUID(str(sub))
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="token sub is not a uuid")
    await _ensure_profile(session, uid, claims)
    return CurrentUser(id=uid, email=claims.get("email"), claims=claims)


async def optional_user(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CurrentUser | None:
    if not authorization:
        return None
    try:
        return await require_user(
            authorization=authorization, session=session, settings=settings
        )
    except HTTPException:
        return None
