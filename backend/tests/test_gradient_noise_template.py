import torch

from templates import gradient_noise as gn


def _tensor(v):
    return torch.tensor(v, dtype=torch.float32)


def _defaults():
    return {
        "scale": _tensor(4.0),
        "speed": _tensor(0.2),
        "color_a": _tensor([0.0, 0.0, 0.0]),
        "color_b": _tensor([1.0, 1.0, 1.0]),
    }


def test_render_shape_and_range():
    out = gn.render(_defaults(), h=16, w=16, t=0.0)
    assert out.shape == (16, 16, 3)
    assert out.min() >= 0.0 - 1e-5
    assert out.max() <= 1.0 + 1e-5


def test_render_distinguishes_colors():
    params = {
        "scale": _tensor(4.0),
        "speed": _tensor(0.0),
        "color_a": _tensor([1.0, 0.0, 0.0]),
        "color_b": _tensor([0.0, 0.0, 1.0]),
    }
    out = gn.render(params, h=16, w=16, t=0.0)
    # Green should be zero everywhere.
    assert out[..., 1].max() < 1e-4
    # Should not be uniform — value noise produces variation.
    assert out[..., 0].std() > 0.01


def test_params_are_differentiable():
    params = {
        "scale": torch.tensor(4.0, requires_grad=True),
        "speed": torch.tensor(0.2, requires_grad=True),
        "color_a": torch.tensor([0.2, 0.3, 0.4], requires_grad=True),
        "color_b": torch.tensor([0.7, 0.6, 0.5], requires_grad=True),
    }
    out = gn.render(params, h=8, w=8, t=0.5)
    out.sum().backward()
    for name, p in params.items():
        assert p.grad is not None, f"{name} got no gradient"
