from app.config import Settings
from app.models import Profile, Shader
from app.schemas import AuthorOut, ShaderOut


def thumb_url(settings: Settings, thumb_path: str | None) -> str | None:
    if not thumb_path:
        return None
    base = settings.public_base_url.rstrip("/")
    return f"{base}/thumbs/{thumb_path}"


def author_out(profile: Profile) -> AuthorOut:
    return AuthorOut(
        id=profile.id,
        handle=profile.handle,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
    )


def shader_out(
    shader: Shader,
    author: Profile,
    settings: Settings,
    *,
    detail: bool = False,
    liked_by_me: bool = False,
) -> ShaderOut:
    out = ShaderOut(
        id=shader.id,
        title=shader.title,
        description=shader.description,
        mode=shader.mode,
        tags=list(shader.tags),
        thumb_url=thumb_url(settings, shader.thumb_path),
        like_count=shader.like_count,
        liked_by_me=liked_by_me,
        is_featured=shader.is_featured,
        created_at=shader.created_at,
        author=author_out(author),
    )
    if detail:
        out.recipe = shader.recipe
        out.remix_of = shader.remix_of
    return out
