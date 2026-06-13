import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  getGalleryItem: vi.fn(),
  like: vi.fn(),
  unlike: vi.fn(),
  report: vi.fn(),
  isApiError: (e: unknown) => typeof e === 'object' && e !== null && 'status' in e,
};
vi.mock('@/api', () => ({
  getGalleryItem: (...a: unknown[]) => api.getGalleryItem(...a),
  like: (...a: unknown[]) => api.like(...a),
  unlike: (...a: unknown[]) => api.unlike(...a),
  report: (...a: unknown[]) => api.report(...a),
  isApiError: (e: unknown) => api.isApiError(e),
}));

const signIn = vi.fn();
vi.mock('@/auth', () => ({ useAuth: () => ({ signIn, user: null }) }));

const setRecipe = vi.fn();
vi.mock('@/cards', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    cloneRecipeWithFreshIds: (r: unknown) => r,
    useCardsStore: Object.assign(() => ({}), { getState: () => ({ setRecipe }) }),
  };
});

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const mod = (await orig()) as object;
  return { ...mod, useNavigate: () => navigate, useParams: () => ({ id: 's1' }) };
});

// Avoid spinning up a real WebGL renderer.
vi.mock('./gallery/MiniRecipeCanvas', () => ({ MiniRecipeCanvas: () => <div data-testid="mini" /> }));

import GalleryDetail from './GalleryDetail';

const detail = {
  id: 's1',
  title: 'Cool',
  description: 'desc',
  tags: ['noise'],
  mode: '2d' as const,
  thumbnailUrl: null,
  author: { id: 'a', handle: 'shaddy', displayName: 'Shaddy', avatarUrl: null },
  likeCount: 4,
  likedByMe: false,
  featured: false,
  createdAt: '2026-01-01T00:00:00Z',
  recipe: { cards: [] },
  remixedFromId: null as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.getGalleryItem.mockResolvedValue({ ...detail });
  api.like.mockResolvedValue({ likeCount: 5 });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <GalleryDetail />
    </MemoryRouter>,
  );

describe('GalleryDetail', () => {
  it('renders the live canvas and title', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Cool')).toBeTruthy());
    expect(screen.getByTestId('mini')).toBeTruthy();
  });

  it('likes optimistically and calls the API', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cool'));
    fireEvent.click(screen.getByRole('button', { name: /4/ }));
    await waitFor(() => expect(api.like).toHaveBeenCalledWith('s1'));
  });

  it('opens sign-in when like 401s', async () => {
    api.like.mockRejectedValueOnce({ status: 401, message: 'no' });
    renderPage();
    await waitFor(() => screen.getByText('Cool'));
    fireEvent.click(screen.getByRole('button', { name: /4/ }));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
  });

  it('remix sets the recipe, stamps lineage, and navigates', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cool'));
    fireEvent.click(screen.getByRole('button', { name: /open in composer/i }));
    expect(setRecipe).toHaveBeenCalled();
    expect(sessionStorage.getItem('shaddy.remix.from')).toBe('s1');
    expect(navigate).toHaveBeenCalledWith('/design');
  });

  it('shows the lineage line only when remixedFromId is set', async () => {
    api.getGalleryItem.mockResolvedValue({ ...detail, remixedFromId: 's0' });
    renderPage();
    await waitFor(() => expect(screen.getByText(/remixed from/i)).toBeTruthy());
  });
});
