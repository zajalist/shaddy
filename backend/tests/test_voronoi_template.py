import torch

from templates import voronoi


def _tensor(v):
    return torch.tensor(v, dtype=torch.float32)


def _defaults():
    return {
        "cells": _tensor(8.0),
        "color_a": _tensor([0.1, 0.1, 0.2]),
        "color_b": _tensor([0.9, 0.9, 1.0]),
    }


def test_render_shape_and_range():
    out = voronoi.render(_defaults(), h=16, w=16)
    assert out.shape == (16, 16, 3)
    assert out.min() >= 0.0 - 1e-5
    assert out.max() <= 1.0 + 1e-5


def test_render_uses_color_a_and_color_b():
    # With color_a=red, color_b=blue, every pixel must be one of those or a mix.
    params = {
        "cells": _tensor(8.0),
        "color_a": _tensor([1.0, 0.0, 0.0]),
        "color_b": _tensor([0.0, 0.0, 1.0]),
    }
    out = voronoi.render(params, h=16, w=16)
    # Green channel should be zero everywhere since neither color has green.
    assert out[..., 1].max() < 1e-4


def test_params_are_differentiable():
    params = {
        "cells": torch.tensor(8.0, requires_grad=True),
        "color_a": torch.tensor([0.1, 0.2, 0.3], requires_grad=True),
        "color_b": torch.tensor([0.9, 0.8, 0.7], requires_grad=True),
    }
    out = voronoi.render(params, h=8, w=8)
    out.sum().backward()
    for name, p in params.items():
        assert p.grad is not None, f"{name} got no gradient"
        # Color params will always get gradient. `cells` flows through floor/frac
        # which may zero some grads, but soft-min over 9 distances does flow.
        # We only assert non-None; magnitudes are checked in convergence tests.
