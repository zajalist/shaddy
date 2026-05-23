from pathlib import Path

import pytest

from optim.glsl_fill import fill


def test_fill_substitutes_a_float_param():
    template = "float x = /*PARAM:freq_x*/;"
    assert fill(template, {"freq_x": 10.0}) == "float x = 10.0;"


def test_fill_enforces_float_decimal_point():
    # GLSL needs `10.0` not `10` for float context.
    assert fill("float x = /*PARAM:n*/;", {"n": 10}) == "float x = 10.0;"


def test_fill_handles_non_integer_floats():
    assert fill("float x = /*PARAM:n*/;", {"n": 8.3}) == "float x = 8.3;"


def test_fill_substitutes_vec3_param():
    template = "vec3 c = /*PARAM:col*/;"
    assert fill(template, {"col": [0.9, 0.2, 0.4]}) == "vec3 c = vec3(0.9, 0.2, 0.4);"


def test_fill_vec3_enforces_decimal_point_per_component():
    template = "vec3 c = /*PARAM:col*/;"
    assert fill(template, {"col": [1, 0, 0]}) == "vec3 c = vec3(1.0, 0.0, 0.0);"


def test_fill_replaces_every_occurrence_of_the_same_token():
    template = "float a = /*PARAM:n*/; float b = /*PARAM:n*/;"
    assert fill(template, {"n": 5.0}) == "float a = 5.0; float b = 5.0;"


def test_fill_raises_on_unknown_token():
    with pytest.raises(KeyError):
        fill("float x = /*PARAM:missing*/;", {})


def test_fill_raises_on_unused_param():
    # Silent drops are bugs — caller passed a param the template doesn't use.
    with pytest.raises(ValueError):
        fill("float x = 1.0;", {"unused": 5.0})


def test_fill_full_plasma_template_has_no_tokens_after_fill():
    template = (
        Path(__file__).resolve().parent.parent / "templates" / "plasma.glsl"
    ).read_text(encoding="utf-8")
    params = {
        "freq_x": 10.0,
        "freq_y": 10.0,
        "phase": 0.0,
        "color_a": [0.5, 0.5, 0.5],
        "color_b": [0.5, 0.5, 0.5],
        "time_scale": 1.0,
    }
    out = fill(template, params)
    assert "/*PARAM:" not in out
