import re

_TOKEN_RE = re.compile(r"/\*PARAM:([a-zA-Z_][a-zA-Z0-9_]*)\*/")


def _format_float(x: float) -> str:
    """GLSL needs a decimal point for floats. '10' -> '10.0', '8.3' -> '8.3'."""
    s = repr(float(x))
    if "." not in s and "e" not in s and "E" not in s:
        s += ".0"
    return s


def _format_value(v):
    if isinstance(v, bool):
        # Bool is a subclass of int — reject explicitly.
        raise TypeError(f"unsupported param type for value {v!r}")
    if isinstance(v, (int, float)):
        return _format_float(v)
    if isinstance(v, (list, tuple)):
        if len(v) == 3:
            return "vec3(" + ", ".join(_format_float(c) for c in v) + ")"
        if len(v) == 4:
            return "vec4(" + ", ".join(_format_float(c) for c in v) + ")"
        if len(v) == 2:
            return "vec2(" + ", ".join(_format_float(c) for c in v) + ")"
    raise TypeError(f"unsupported param type for value {v!r}")


def fill(template: str, params: dict) -> str:
    """Replace every /*PARAM:name*/ token with the corresponding literal.

    Raises KeyError if the template references a name not in `params`.
    Raises ValueError if `params` contains a name not used by the template
    (silent drops mask bugs).
    """
    used: set[str] = set()

    def _sub(match: re.Match) -> str:
        name = match.group(1)
        if name not in params:
            raise KeyError(f"template references missing param: {name}")
        used.add(name)
        return _format_value(params[name])

    out = _TOKEN_RE.sub(_sub, template)

    unused = set(params) - used
    if unused:
        raise ValueError(f"params declared but not used by template: {sorted(unused)}")

    return out
