import json
from functools import lru_cache
from pathlib import Path

TEMPLATE_IDS: tuple[str, ...] = ("plasma", "voronoi-cells", "gradient-noise")

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
_TEMPLATES_DIR = _ROOT / "templates"


@lru_cache(maxsize=1)
def _all_defaults() -> dict[str, dict[str, float | list[float]]]:
    with (_TEMPLATES_DIR / "defaults.json").open() as f:
        return json.load(f)


def defaults(template_id: str) -> dict[str, float | list[float]]:
    if template_id not in TEMPLATE_IDS:
        raise KeyError(template_id)
    return _all_defaults()[template_id]


@lru_cache(maxsize=8)
def glsl(template_id: str) -> str:
    if template_id not in TEMPLATE_IDS:
        raise KeyError(template_id)
    return (_TEMPLATES_DIR / f"{template_id}.glsl").read_text(encoding="utf-8")
