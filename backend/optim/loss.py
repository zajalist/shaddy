import lpips
import torch
import torch.nn.functional as F


class PerceptualLoss:
    """LPIPS (VGG) + 0.1 * MSE. LPIPS captures style; MSE anchors color.

    The MSE blend prevents pure-LPIPS from drifting into a colour-correct-but-fuzzy
    local minimum (spec §7).
    """

    def __init__(self, device: str):
        self.device = device
        self.lpips = lpips.LPIPS(net="vgg", verbose=False).to(device).eval()
        for p in self.lpips.parameters():
            p.requires_grad_(False)

    def __call__(self, rendered: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        # LPIPS expects NCHW in [-1, 1].
        r = rendered.permute(2, 0, 1).unsqueeze(0) * 2.0 - 1.0
        t = target.permute(2, 0, 1).unsqueeze(0) * 2.0 - 1.0
        lpips_loss = self.lpips(r, t).mean()
        mse = F.mse_loss(rendered, target)
        return lpips_loss + 0.1 * mse
