import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, func, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, optional_user, require_user
from app.config import Settings, get_settings
from app.db import get_session
from app.models import Like, Profile, Report, Shader
from app.queries import shader_page
from app.schemas import CreateReport, CreateShader, LikeResult, ShaderOut, ShaderPage
from app.serialize import shader_out, thumb_url
from app.thumbnails import store_thumbnail

router = APIRouter(prefix="/api/shaders", tags=["shaders"])

MAX_RECIPE_BYTES = 256 * 1024
REPORT_REASONS = {"spam", "nsfw", "stolen", "broken", "other"}


async def _load_active(session: AsyncSession, shader_id: uuid.UUID) -> Shader:
    shader = await session.get(Shader, shader_id)
    if shader is None or shader.deleted_at is not None:
        raise HTTPException(status_code=404, detail="shader not found")
    return shader


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


@router.get("", response_model=ShaderPage)
async def list_shaders(
    q: str | None = None,
    tags: str | None = None,
    mode: str | None = None,
    sort: str = "recent",
    cursor: str | None = None,
    limit: int = 24,
    user: CurrentUser | None = Depends(optional_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ShaderPage:
    return await shader_page(
        session,
        settings,
        user=user,
        q=q,
        tags=tags,
        mode=mode,
        sort=sort,
        cursor=cursor,
        limit=limit,
    )


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


@router.post("/{shader_id}/like", response_model=LikeResult)
async def like_shader(
    shader_id: uuid.UUID,
    user: CurrentUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
) -> LikeResult:
    shader = await _load_active(session, shader_id)
    result = await session.execute(
        pg_insert(Like).values(user_id=user.id, shader_id=shader_id).on_conflict_do_nothing()
    )
    if result.rowcount:
        await session.execute(
            update(Shader).where(Shader.id == shader_id).values(like_count=Shader.like_count + 1)
        )
    await session.commit()
    await session.refresh(shader)
    return LikeResult(like_count=shader.like_count, liked=True)


@router.delete("/{shader_id}/like", response_model=LikeResult)
async def unlike_shader(
    shader_id: uuid.UUID,
    user: CurrentUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
) -> LikeResult:
    shader = await _load_active(session, shader_id)
    result = await session.execute(
        delete(Like).where(Like.user_id == user.id, Like.shader_id == shader_id)
    )
    if result.rowcount:
        await session.execute(
            update(Shader)
            .where(Shader.id == shader_id)
            .values(like_count=func.greatest(Shader.like_count - 1, 0))
        )
    await session.commit()
    await session.refresh(shader)
    return LikeResult(like_count=shader.like_count, liked=False)


@router.post("/{shader_id}/thumb")
async def upload_thumbnail(
    shader_id: uuid.UUID,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict:
    shader = await _load_active(session, shader_id)
    if shader.author_id != user.id:
        raise HTTPException(status_code=403, detail="not your shader")
    rel_path = await store_thumbnail(file, settings.thumbs_dir)
    shader.thumb_path = rel_path
    await session.commit()
    return {"thumb_url": thumb_url(settings, rel_path)}


@router.post("/{shader_id}/report", status_code=202)
async def report_shader(
    shader_id: uuid.UUID,
    body: CreateReport,
    user: CurrentUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if body.reason not in REPORT_REASONS:
        raise HTTPException(status_code=422, detail="invalid reason")
    await _load_active(session, shader_id)
    await session.execute(
        pg_insert(Report)
        .values(
            shader_id=shader_id,
            reporter_id=user.id,
            reason=body.reason,
            detail=body.detail,
        )
        .on_conflict_do_nothing(index_elements=["shader_id", "reporter_id"])
    )
    await session.commit()
    return {"ok": True}
