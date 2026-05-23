"""PyTorch mirror of gradient-noise.glsl. Differentiable through scale, speed,
color_a, color_b. The hash function is not differentiable w.r.t. its inputs,
but we don't optimize hash inputs — only the params we expose."""

import torch


def _hash(p: torch.Tensor) -> torch.Tensor:
    """fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453). p: [..., 2] -> [...]."""
    x = p[..., 0] * 127.1 + p[..., 1] * 311.7
    return (torch.sin(x) * 43758.5453).frac()


def _noise(p: torch.Tensor) -> torch.Tensor:
    """Value noise with smooth interpolation. p: [..., 2] -> [...]."""
    i = p.floor()
    f = p - i
    f_smooth = f * f * (3.0 - 2.0 * f)

    a = _hash(i)
    b = _hash(i + torch.tensor([1.0, 0.0], device=p.device))
    c = _hash(i + torch.tensor([0.0, 1.0], device=p.device))
    d = _hash(i + torch.tensor([1.0, 1.0], device=p.device))

    fx = f_smooth[..., 0]
    fy = f_smooth[..., 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def _uv_grid(h: int, w: int, device: torch.device) -> torch.Tensor:
    ys = (torch.arange(h, device=device, dtype=torch.float32) + 0.5) / h
    xs = (torch.arange(w, device=device, dtype=torch.float32) + 0.5) / w
    gy, gx = torch.meshgrid(ys, xs, indexing="ij")
    return torch.stack([gx, gy], dim=-1)


def render(params: dict[str, torch.Tensor], h: int, w: int, t: float = 0.0) -> torch.Tensor:
    device = next(iter(params.values())).device
    uv = _uv_grid(h, w, device) * params["scale"]                     # [H, W, 2]
    # GLSL: noise(uv + u_time * speed). u_time is a scalar; "speed * t" is broadcast.
    offset = t * params["speed"]
    uv_t = uv + offset
    v = _noise(uv_t).clamp(0.0, 1.0)                                  # [H, W]

    mix_factor = v.unsqueeze(-1)
    c = params["color_a"] * (1.0 - mix_factor) + params["color_b"] * mix_factor
    return c.clamp(0.0, 1.0)
