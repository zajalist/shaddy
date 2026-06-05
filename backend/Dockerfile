FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies explicitly so the image layer caches independently of source.
# Kept in sync with pyproject.toml [project].dependencies + [dev].
RUN pip install \
    "fastapi>=0.115" \
    "uvicorn[standard]>=0.30" \
    "sqlalchemy[asyncio]>=2.0" \
    "asyncpg>=0.29" \
    "pydantic-settings>=2.4" \
    "python-jose[cryptography]>=3.3" \
    "python-multipart>=0.0.9" \
    "alembic>=1.13" \
    "greenlet>=3.0" \
    "pytest>=8" \
    "pytest-asyncio>=0.24" \
    "httpx>=0.27"

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
