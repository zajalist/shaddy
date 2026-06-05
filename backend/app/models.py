import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    handle: Mapped[str] = mapped_column(sa.Text, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(sa.Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False
    )


class Shader(Base):
    __tablename__ = "shaders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(sa.Text, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    recipe: Mapped[dict] = mapped_column(JSONB, nullable=False)
    mode: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default=sa.text("'2d'"))
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(sa.Text), nullable=False, server_default=sa.text("'{}'")
    )
    thumb_path: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    like_count: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, server_default=sa.text("0")
    )
    remix_of: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("shaders.id", ondelete="SET NULL"), nullable=True
    )
    is_featured: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.text("false")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False
    )

    __table_args__ = (
        sa.CheckConstraint("mode in ('2d','3d')", name="shaders_mode_check"),
        sa.Index("shaders_author_created_idx", "author_id", sa.text("created_at DESC")),
        sa.Index(
            "shaders_created_idx",
            sa.text("created_at DESC"),
            postgresql_where=sa.text("deleted_at IS NULL"),
        ),
        sa.Index(
            "shaders_likes_idx",
            sa.text("like_count DESC"),
            sa.text("created_at DESC"),
            postgresql_where=sa.text("deleted_at IS NULL"),
        ),
        sa.Index("shaders_mode_idx", "mode", postgresql_where=sa.text("deleted_at IS NULL")),
        sa.Index("shaders_tags_gin", "tags", postgresql_using="gin"),
        sa.Index(
            "shaders_search_gin",
            sa.text("to_tsvector('simple', title || ' ' || coalesce(description,''))"),
            postgresql_using="gin",
        ),
    )


class Like(Base):
    __tablename__ = "likes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    shader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("shaders.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False
    )

    __table_args__ = (sa.Index("likes_shader_idx", "shader_id"),)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    shader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("shaders.id", ondelete="CASCADE"), nullable=False
    )
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str] = mapped_column(sa.Text, nullable=False)
    detail: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False
    )

    __table_args__ = (
        sa.CheckConstraint(
            "reason in ('spam','nsfw','stolen','broken','other')", name="reports_reason_check"
        ),
        sa.Index("reports_shader_idx", "shader_id"),
        sa.UniqueConstraint("shader_id", "reporter_id", name="reports_unique_reporter"),
    )
