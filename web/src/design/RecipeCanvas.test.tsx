import { createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CANVAS_SETTINGS, DEFAULT_CAMERA, useCardsStore } from '@/cards';

const rendererSpies = {
  mount: vi.fn(),
  compile: vi.fn(() => ({ ok: true })),
  compileMulti: vi.fn(() => ({ ok: true })),
  setUniform: vi.fn(),
  resize: vi.fn(),
  snapshot: vi.fn(async () => 'data:image/png;base64,stub'),
  snapshotAt: vi.fn(async () => 'data:image/png;base64,stub'),
  setClearColor: vi.fn(),
  setFpsCap: vi.fn(),
  setRenderScale: vi.fn(),
  onCompile: vi.fn(() => () => undefined),
  getFps: vi.fn(() => 37),
  dispose: vi.fn(),
};

vi.mock('@/renderer', async () => {
  const actual = await vi.importActual<typeof import('@/renderer')>('@/renderer');
  return {
    ...actual,
    createRenderer: () => rendererSpies,
  };
});

import { RecipeCanvas, type RecipeCanvasHandle } from './RecipeCanvas';

beforeEach(() => {
  vi.clearAllMocks();
  useCardsStore.setState({
    recipe: { canvasAspect: 'square', cards: [] },
    camera: DEFAULT_CAMERA,
    canvas: {
      ...DEFAULT_CANVAS_SETTINGS,
      background: [0.25, 0.5, 0.75],
      backgroundAlpha: 0.4,
      transparentExport: false,
      fpsCap: 30,
      renderScale: 0.5,
    },
    activePassId: 'image',
  });
});

describe('RecipeCanvas handle', () => {
  it('pushes canvas settings into the renderer and snapshots at an exact size', async () => {
    const ref = createRef<RecipeCanvasHandle>();
    render(<RecipeCanvas ref={ref} />);

    await waitFor(() => {
      expect(rendererSpies.setClearColor).toHaveBeenCalledWith({
        r: 0.25,
        g: 0.5,
        b: 0.75,
        a: 0.4,
      });
      expect(rendererSpies.setFpsCap).toHaveBeenCalledWith(30);
      expect(rendererSpies.setRenderScale).toHaveBeenCalledWith(0.5);
    });

    await expect(ref.current?.snapshotPng(320, 180, { alpha: true })).resolves.toBe('data:image/png;base64,stub');
    expect(rendererSpies.snapshotAt).toHaveBeenCalledWith(320, 180, { alpha: true });
  });
});
