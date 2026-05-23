import torch

from templates import plasma


def _tensor(v):
    return torch.tensor(v, dtype=torch.float32)


def _defaults():
    return {
        "freq_x": _tensor(10.0),
        "freq_y": _tensor(10.0),
        "phase": _tensor(0.0),
        "color_a": _tensor([0.5, 0.5, 0.5]),
        "color_b": _tensor([0.5, 0.5, 0.5]),
        "time_scale": _tensor(1.0),
    }


def test_render_shape_and_range():
    out = plasma.render(_defaults(), h=16, w=16, t=0.0)
    assert out.shape == (16, 16, 3)
    assert out.min() >= 0.0 - 1e-5
    assert out.max() <= 1.0 + 1e-5


def test_render_constant_when_color_a_equals_color_b():
    # When a == b, mix(a, b, anything) == a regardless of v.
    out = plasma.render(_defaults(), h=4, w=4, t=0.0)
    assert torch.allclose(out, torch.full((4, 4, 3), 0.5), atol=1e-5)


def test_render_distinguishes_color_a_from_color_b():
    """With freq=0 and t=0, sin(0)+sin(0)=0 → mix factor 0.5 → average of a,b."""
    params = {
        "freq_x": _tensor(0.0),
        "freq_y": _tensor(0.0),
        "phase": _tensor(0.0),
        "color_a": _tensor([1.0, 0.0, 0.0]),
        "color_b": _tensor([0.0, 0.0, 1.0]),
        "time_scale": _tensor(1.0),
    }
    out = plasma.render(params, h=2, w=2, t=0.0)
    expected = torch.tensor([0.5, 0.0, 0.5]).expand(2, 2, 3)
    assert torch.allclose(out, expected, atol=1e-5)


def test_params_are_differentiable():
    params = {
        "freq_x": torch.tensor(10.0, requires_grad=True),
        "freq_y": torch.tensor(10.0, requires_grad=True),
        "phase": torch.tensor(0.0, requires_grad=True),
        "color_a": torch.tensor([0.5, 0.6, 0.7], requires_grad=True),
        "color_b": torch.tensor([0.3, 0.4, 0.5], requires_grad=True),
        "time_scale": torch.tensor(1.0, requires_grad=True),
    }
    out = plasma.render(params, h=8, w=8, t=0.5)
    out.sum().backward()
    for name, p in params.items():
        assert p.grad is not None, f"{name} got no gradient"
        # And that gradient should be non-trivial for most params (color/freq).
