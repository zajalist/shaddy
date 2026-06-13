import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listGallery = vi.fn();
vi.mock('@/api', () => ({
  listGallery: (...a: unknown[]) => listGallery(...a),
  isApiError: (e: unknown) => typeof e === 'object' && e !== null && 'status' in e,
}));

import Gallery from './Gallery';

function item(id: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    title: `Shader ${id}`,
    description: '',
    tags: [],
    mode: '2d',
    thumbnailUrl: `http://t/${id}.png`,
    author: { id: 'u', handle: 'shaddy', displayName: 'Shaddy', avatarUrl: null },
    likeCount: 0,
    likedByMe: false,
    featured: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no IntersectionObserver
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  listGallery.mockResolvedValue({ items: [item('a'), item('b')], nextCursor: null });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>,
  );

describe('Gallery', () => {
  it('renders PNG-thumbnail tiles from the API (not canvases)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Shader a')).toBeTruthy());
    const img = screen.getByAltText('Shader a') as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toContain('/a.png');
  });

  it('refetches with the right params when mode + sort change', async () => {
    renderPage();
    await waitFor(() => expect(listGallery).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '3D' }));
    fireEvent.click(screen.getByRole('button', { name: 'Most liked' }));
    await waitFor(() => {
      const last = listGallery.mock.calls.at(-1)![0];
      expect(last.mode).toBe('3d');
      expect(last.sort).toBe('liked');
    });
  });

  it('shows the empty state when the API returns nothing', async () => {
    listGallery.mockResolvedValue({ items: [], nextCursor: null });
    renderPage();
    await waitFor(() => expect(screen.getByText(/no shaders published yet/i)).toBeTruthy());
  });

  it('shows a retry row on error', async () => {
    listGallery.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/couldn.t load shaders/i)).toBeTruthy());
  });
});
