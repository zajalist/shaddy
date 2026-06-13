import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const publish = vi.fn();
vi.mock('@/api', () => ({
  publish: (...a: unknown[]) => publish(...a),
  isApiError: (e: unknown) => typeof e === 'object' && e !== null && 'status' in e,
}));

const auth = { isAuthenticated: false, signIn: vi.fn() };
vi.mock('@/auth', () => ({ useAuth: () => auth }));

const recipe = { mode: '2d', cards: [] };
vi.mock('@/cards', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useCardsStore: Object.assign((sel: (s: unknown) => unknown) => sel({ recipe }), {
      getState: () => ({ recipe }),
    }),
  };
});

// Fire onReady with a fake snapshot so the capture path runs without WebGL.
vi.mock('./MiniRecipeCanvas', () => ({
  MiniRecipeCanvas: ({ onReady }: { onReady?: (api: { snapshotAt: () => Promise<string> }) => void }) => {
    onReady?.({ snapshotAt: () => Promise.resolve('data:image/png;base64,AAAA') });
    return <div data-testid="capture" />;
  },
}));

import { PublishModal } from './PublishModal';

const renderModal = () =>
  render(
    <MemoryRouter>
      <PublishModal open onClose={() => {}} />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = false;
  publish.mockResolvedValue({ id: 'new1' });
});

describe('PublishModal', () => {
  it('shows the sign-in gate when signed out', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(auth.signIn).toHaveBeenCalled();
  });

  it('blocks publish without a title', async () => {
    auth.isAuthenticated = true;
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));
    await waitFor(() => expect(screen.getByText(/give it a title/i)).toBeTruthy());
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes with the store recipe + captured thumbnail', async () => {
    auth.isAuthenticated = true;
    renderModal();
    // wait for the async snapshot capture to land as the preview image
    await screen.findByAltText('preview');
    fireEvent.change(screen.getByPlaceholderText(/untitled shader/i), { target: { value: 'My Shader' } });
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));
    await waitFor(() => expect(publish).toHaveBeenCalled());
    const arg = publish.mock.calls[0]![0];
    expect(arg.title).toBe('My Shader');
    expect(arg.recipe).toBe(recipe);
    expect(arg.thumbnailDataUrl).toContain('data:image/png');
  });
});
