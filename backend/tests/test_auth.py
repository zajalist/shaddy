import time
import uuid

import pytest
from jose import jwt

ISS_URL = "https://proj.supabase.co"
ISS = f"{ISS_URL}/auth/v1"


def _settings_hs(secret="testsecret"):
    from app.config import Settings

    return Settings(
        supabase_url=ISS_URL, supabase_jwt_alg="HS256", supabase_jwt_secret=secret
    )


def _mint_hs(
    secret="testsecret",
    *,
    sub=None,
    aud="authenticated",
    iss=ISS,
    exp_delta=3600,
    email="u@e.com",
):
    sub = sub or str(uuid.uuid4())
    now = int(time.time())
    claims = {
        "sub": sub,
        "aud": aud,
        "iss": iss,
        "exp": now + exp_delta,
        "iat": now,
        "email": email,
    }
    return jwt.encode(claims, secret, algorithm="HS256"), sub


def test_decode_hs256_valid():
    from app.auth import decode_token

    token, sub = _mint_hs()
    claims = decode_token(token, _settings_hs())
    assert claims["sub"] == sub
    assert claims["email"] == "u@e.com"


def test_decode_hs256_expired_rejected():
    from app.auth import decode_token

    token, _ = _mint_hs(exp_delta=-10)
    with pytest.raises(Exception):
        decode_token(token, _settings_hs())


def test_decode_hs256_bad_signature_rejected():
    from app.auth import decode_token

    token, _ = _mint_hs(secret="othersecret")
    with pytest.raises(Exception):
        decode_token(token, _settings_hs(secret="testsecret"))


def test_decode_hs256_wrong_audience_rejected():
    from app.auth import decode_token

    token, _ = _mint_hs(aud="anon")
    with pytest.raises(Exception):
        decode_token(token, _settings_hs())


async def test_require_user_missing_header_401(db_session):
    from fastapi import HTTPException

    from app.auth import require_user

    with pytest.raises(HTTPException) as ei:
        await require_user(authorization=None, session=db_session, settings=_settings_hs())
    assert ei.value.status_code == 401


async def test_require_user_bad_token_401(db_session):
    from fastapi import HTTPException

    from app.auth import require_user

    with pytest.raises(HTTPException) as ei:
        await require_user(
            authorization="Bearer not.a.jwt", session=db_session, settings=_settings_hs()
        )
    assert ei.value.status_code == 401


async def test_require_user_valid_creates_profile_idempotently(db_session):
    from sqlalchemy import select

    from app.auth import require_user
    from app.models import Profile

    token, sub = _mint_hs()
    user = await require_user(
        authorization=f"Bearer {token}", session=db_session, settings=_settings_hs()
    )
    assert str(user.id) == sub

    prof = (
        await db_session.execute(select(Profile).where(Profile.id == user.id))
    ).scalar_one()
    assert prof.handle  # a handle was derived

    # second call must not create a duplicate
    await require_user(
        authorization=f"Bearer {token}", session=db_session, settings=_settings_hs()
    )
    all_profiles = (await db_session.execute(select(Profile))).scalars().all()
    assert len(all_profiles) == 1


def test_decode_rs256_with_jwks(monkeypatch):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from jose import jwk as jose_jwk

    import app.auth as auth_mod
    from app.config import Settings

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    pub_pem = (
        key.public_key()
        .public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    jwk_dict = jose_jwk.construct(pub_pem, "RS256").to_dict()
    for k in ("n", "e"):
        if isinstance(jwk_dict.get(k), bytes):
            jwk_dict[k] = jwk_dict[k].decode()
    jwk_dict.update({"kid": "test-kid", "alg": "RS256", "use": "sig"})

    monkeypatch.setattr(auth_mod, "_fetch_jwks", lambda settings: {"keys": [jwk_dict]})

    settings = Settings(supabase_url=ISS_URL, supabase_jwt_alg="RS256")
    sub = str(uuid.uuid4())
    now = int(time.time())
    token = jwt.encode(
        {"sub": sub, "aud": "authenticated", "iss": ISS, "exp": now + 3600, "iat": now},
        priv_pem,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )
    claims = auth_mod.decode_token(token, settings)
    assert claims["sub"] == sub
