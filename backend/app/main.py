from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import app.models  # noqa: F401 — register tables on Base.metadata
from app.config import get_settings
from app.db import Base, engine
from app.routers import shaders, users

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Create any missing tables on boot so the box needs no manual migration step.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Shaddy API", version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

app.include_router(shaders.router)
app.include_router(users.router)


@app.get("/healthz")
async def healthz() -> dict:
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "db": db_ok, "version": settings.app_version}
