"""PyTorch mirror of voronoi-cells.glsl. Math closely follows the GLSL with
one substitution: hard min over 9 neighbor distances becomes a soft-min for
differentiability (gradient must flow through `cells`, `color_a`, `color_b`).

GLSL ref:
    vec2 uv = gl_FragCoord.xy / u_resolution * cells;
    vec2 i = floor(uv); vec2 f = fract(uv);
    float d = 1.0;
    for ny in -1..1: for nx in -1..1:
        vec2 g = vec2(nx, ny);
        vec2 p = g + hash21(i + g);
        d = min(d, length(g + p - f));
    vec3 c = mix(color_a, color_b, d);
"""

import torch

_SOFT_MIN_SHARPNESS = 20.0


def _hash21(i: torch.Tensor) -> torch.Tensor:
    """Mirror of GLSL: fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453).
    `i` has shape [..., 2]; returns [...]."""
    x = i[..., 0] * 127.1 + i[..., 1] * 311.7
    return (torch.sin(x) * 43758.5453).frac()


def _uv_grid(h: int, w: int, device: torch.device) -> torch.Tensor:
    """Pixel-center UV in [0, 1] for both axes. Returns [H, W, 2]."""
    ys = (torch.arange(h, device=device, dtype=torch.float32) + 0.5) / h
    xs = (torch.arange(w, device=device, dtype=torch.float32) + 0.5) / w
    gy, gx = torch.meshgrid(ys, xs, indexing="ij")
    return torch.stack([gx, gy], dim=-1)


def render(params: dict[str, torch.Tensor], h: int, w: int, t: float = 0.0) -> torch.Tensor:
    device = next(iter(params.values())).device
    uv = _uv_grid(h, w, device) * params["cells"]  # [H, W, 2]
    i = uv.floor()                                  # [H, W, 2]
    f = uv - i                                      # [H, W, 2]

    dists = []
    for dy in (-1.0, 0.0, 1.0):
        for dx in (-1.0, 0.0, 1.0):
            g = torch.tensor([dx, dy], device=device, dtype=torch.float32)
            # neighbor cell point: g + hash(i+g)
            neighbor_i = i + g                       # [H, W, 2]
            hash_val = _hash21(neighbor_i)           # [H, W]
            # p = g + hash * vec2(1.0). The original GLSL uses scalar hash for both axes.
            p_offset = g.unsqueeze(0).unsqueeze(0) + hash_val.unsqueeze(-1)  # [H, W, 2]
            diff = p_offset - f                      # [H, W, 2]
            dists.append(diff.norm(dim=-1))          # [H, W]

    stacked = torch.stack(dists, dim=-1)             # [H, W, 9]
    # Soft-min: -log(sum exp(-k*d)) / k
    soft_min_d = -torch.logsumexp(-_SOFT_MIN_SHARPNESS * stacked, dim=-1) / _SOFT_MIN_SHARPNESS
    soft_min_d = soft_min_d.clamp(0.0, 1.0)

    mix_factor = soft_min_d.unsqueeze(-1)            # [H, W, 1]
    c = params["color_a"] * (1.0 - mix_factor) + params["color_b"] * mix_factor
    return c.clamp(0.0, 1.0)
