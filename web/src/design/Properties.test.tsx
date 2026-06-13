import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CANVAS_SETTINGS, useCardsStore } from '@/cards';

import { PropertiesPanel } from './Properties';

beforeEach(() => {
  useCardsStore.setState({
    recipe: { canvasAspect: 'square', cards: [] },
    canvas: DEFAULT_CANVAS_SETTINGS,
    activePassId: 'image',
  });
});

describe('PropertiesPanel global canvas controls', () => {
  it('removes the dead tempo chrome and updates canvas settings', () => {
    render(<PropertiesPanel selectedCard={null} selectedIndex={0} fps={47.8} />);

    // Canvas settings live under the Canvas tab in the revamped two-tab right bar.
    fireEvent.click(screen.getByRole('button', { name: 'canvas' }));

    expect(screen.queryByText(/tempo/i)).toBeNull();
    expect(screen.queryByText(/bpm/i)).toBeNull();
    expect(screen.queryByText(/tap/i)).toBeNull();
    expect(screen.queryByText(/v0\.4\.2/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '1920×1080' }));
    fireEvent.click(screen.getByRole('button', { name: '8K' }));
    fireEvent.click(screen.getByRole('button', { name: /export with transparency/i }));

    expect(useCardsStore.getState().recipe.canvasAspect).toBe('landscape');
    expect(useCardsStore.getState().canvas.exportLongEdge).toBe(4320);
    expect(useCardsStore.getState().canvas.transparentExport).toBe(true);
    expect(screen.getByText(/7680\s*×\s*4320/)).not.toBeNull();
    expect(screen.getByText(/WEBGL2 · 48 FPS/)).not.toBeNull();
  });
});
