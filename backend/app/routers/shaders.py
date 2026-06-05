import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, optional_user, require_user
from app.config import Settings, get_settings
from app.db import get_session
from app.models import Profile, Shader
from app.schemas import CreateShader, ShaderOut
from app.serialize import shader_out

router = APIRouter(prefix="/api/shaders", tags=["shaders"])

MAX_RECIPE_BYTES = 256 * 1024


@router.post("", status_code=201, response_model=ShaderOut)
async def create_shader(
    body: CreateShader,
    user: CurrentUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ShaderOut:
    recipe = body.recipe
    if not isinstance(recipe.get("cards"), list):
        raise HTTPException(status_code=422, detail="recipe must contain a cards array")
    if len(json.dumps(recipe).encode()) > MAX_RECIPE_BYTES:
        raise HTTPException(status_code=413, detail="recipe too large")

    mode = recipe.get("mode") or "2d"
    if mode not in ("2d", "3d"):
        mode = "2d"
    tags = [t.strip().lower() for t in body.tags if t.strip()][:8]

    shader = Shader(
        author_id=user.id,
        title=body.title,
        description=body.description,
        recipe=recipe,
        mode=mode,
        tags=tags,
        remix_of=body.remix_of,
    )
    session.add(shader)
    await session.commit()
    await session.refresh(shader)
    author = await session.get(Profile, user.id)
    return shader_out(shader, author, settings, detail=True)


@router.get("/{shader_id}", response_model=ShaderOut)
async def get_shader(
    shader_id: uuid.UUID,
    user: CurrentUser | None = Depends(optional_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ShaderOut:
    shader = await session.get(Shader, shader_id)
    if shader is None or shader.deleted_at is not None:
        raise HTTPException(status_code=404, detail="shader not found")
    author = await session.get(Profile, shader.author_id)
    return shader_out(shader, author, settings, detail=True)


@router.delete("/{shader_id}", status_code=204)
async def delete_shader(
    shader_id: uuid.UUID,
    user: CurrentUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    shader = await session.get(Shader, shader_id)
    if shader is None or shader.deleted_at is not None:
        raise HTTPException(status_code=404, detail="shader not found")
    if shader.author_id != user.id:
        raise HTTPException(status_code=403, detail="not your shader")
    shader.deleted_at = datetime.now(timezone.utc)
    await session.commit()
