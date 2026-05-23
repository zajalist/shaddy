import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import health, optimize
from app.jobs import JobRegistry

app = FastAPI(title="Shaddy backend", version="0.1.0")

# Shared serial slot. Lives on app.state so tests can reset it via the fixture.
app.state.registry = JobRegistry()
# Also expose at module level for the test fixture's convenience.
registry: JobRegistry = app.state.registry

_default_origins = ["http://localhost:5173"]
_prod_origin = os.environ.get("SHADDY_FRONTEND_ORIGIN")
if _prod_origin:
    _default_origins.append(_prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    allow_origin_regex=r"^(http://[^/]+:5173|https://[^/]+\.trycloudflare\.com)$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(optimize.router)
