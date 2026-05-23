import pytest

from app import templates


def test_template_ids_are_three():
    assert templates.TEMPLATE_IDS == ("plasma", "voronoi-cells", "gradient-noise")


def test_defaults_loads_known_template():
    d = templates.defaults("plasma")
    assert "freq_x" in d
    assert d["freq_x"] == 10.0


def test_defaults_unknown_template_raises_key_error():
    with pytest.raises(KeyError):
        templates.defaults("nope")


def test_glsl_loads_known_template():
    src = templates.glsl("plasma")
    assert "void main" in src
    assert "#version" in src


def test_glsl_unknown_template_raises_key_error():
    with pytest.raises(KeyError):
        templates.glsl("nope")
