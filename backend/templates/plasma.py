"""PyTorch mirror of plasma.glsl. Math MUST stay identical to the GLSL.

GLSL ref:
    vec2 uv = gl_FragCoord.xy / u_resolution;          // [0, 1] per axis, pixel-center
    float t = u_time * time_scale;
    float v = sin(uv.x * freq_x + t)
            + sin(uv.y * freq_y + t + phase);
    vec3 c = mix(color_a, color_b, 0.5 + 0.5 * sin(v));
    fragColor = vec4(c, 1.0);
"""

import torch


def _uv_grid(h: int, w: int, device: torch.device) -> torch.Tensor:
    """Pixel-center UV coords in [0, 1]. Returns [H, W, 2]."""
    ys = (torch.arange(h, device=device, dtype=torch.float32) + 0.5) / h
    xs = (torch.arange(w, device=device, dtype=torch.float32) + 0.5) / w
    grid_y, grid_x = torch.meshgrid(ys, xs, indexing="ij")
    return torch.stack([grid_x, grid_y], dim=-1)


def render(params: dict[str, torch.Tensor], h: int, w: int, t: float = 0.0) -> torch.Tensor:
    """Render plasma at resolution (h, w) at time t. Returns [H, W, 3] in [0, 1]."""
    device = next(iter(params.values())).device
    uv = _uv_grid(h, w, device)  # [H, W, 2]

    t_eff = t * params["time_scale"]
    v = torch.sin(uv[..., 0] * params["freq_x"] + t_eff) + torch.sin(
        uv[..., 1] * params["freq_y"] + t_eff + params["phase"]
    )  # [H, W]

    mix_factor = 0.5 + 0.5 * torch.sin(v)  # [H, W], in [0, 1]
    mix_factor = mix_factor.unsqueeze(-1)  # [H, W, 1] for broadcasting against [3] colors

    c = params["color_a"] * (1.0 - mix_factor) + params["color_b"] * mix_factor
    return c.clamp(0.0, 1.0)
