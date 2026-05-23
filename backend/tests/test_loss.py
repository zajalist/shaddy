import pytest
import torch

from optim.loss import PerceptualLoss


@pytest.fixture(scope="module")
def loss_fn():
    """LPIPS init is slow (~2s and downloads weights on first run)."""
    return PerceptualLoss(device="cpu")


def test_loss_of_identical_images_is_near_zero(loss_fn):
    img = torch.rand(64, 64, 3)
    l = loss_fn(img, img)
    assert l.item() < 0.01


def test_loss_of_different_images_is_positive(loss_fn):
    a = torch.zeros(64, 64, 3)
    b = torch.ones(64, 64, 3)
    l = loss_fn(a, b)
    assert l.item() > 0.1


def test_loss_is_differentiable_wrt_rendered(loss_fn):
    rendered = torch.rand(64, 64, 3, requires_grad=True)
    target = torch.rand(64, 64, 3)
    l = loss_fn(rendered, target)
    l.backward()
    assert rendered.grad is not None
    assert rendered.grad.abs().sum() > 0
