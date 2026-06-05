import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CreateShader(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    recipe: dict
    tags: list[str] = Field(default_factory=list)
    remix_of: uuid.UUID | None = None


class AuthorOut(BaseModel):
    id: uuid.UUID
    handle: str
    display_name: str
    avatar_url: str | None = None


class ShaderOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    mode: str
    tags: list[str]
    thumb_url: str | None = None
    like_count: int
    liked_by_me: bool = False
    is_featured: bool
    created_at: datetime
    author: AuthorOut
    # detail-only extras
    recipe: dict | None = None
    remix_of: uuid.UUID | None = None


class CreateReport(BaseModel):
    reason: str
    detail: str | None = Field(default=None, max_length=1000)
