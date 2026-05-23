import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Shaddy backend", version="0.1.0")

_default_origins = ["http://localhost:5173"]
_prod_origin = os.environ.get("SHADDY_FRONTEND_ORIGIN")
if _prod_origin:
    _default_origins.append(_prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    # LAN dev (vite --host) + cloudflared quick tunnel.
    allow_origin_regex=r"^(http://[^/]+:5173|https://[^/]+\.trycloudflare\.com)$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
