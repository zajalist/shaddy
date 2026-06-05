from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import shaders

settings = get_settings()

app = FastAPI(title="Shaddy API", version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

app.include_router(shaders.router)


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "version": settings.app_version}
