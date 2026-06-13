import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAccessToken = vi.fn();
vi.mock('@/auth', () => ({ getAccessToken: () => getAccessToken() }));

import {
  getGalleryItem,
  isApiError,
  like,
  listGallery,
  publish,
  report,
} from './index';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockResolvedValue('jwt-123');
  vi.stubGlobal('fetch', fetchMock);
});

describe('reads', () => {
  it('listGallery sends no Authorization and maps the page', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: 's1',
            title: 'A',
            description: null,
            mode: '3d',
            tags: ['noise'],
            thumb_url: 'http://t/s1.png',
            like_count: 5,
            liked_by_me: true,
            is_featured: true,
            created_at: '2026-01-01T00:00:00Z',
            author: { id: 'u1', handle: 'shaddy', display_name: 'Shaddy', avatar_url: null },
          },
        ],
        next_cursor: 'CUR',
      }),
    );
    const page = await listGallery({ mode: '3d', tags: ['noise'], sort: 'liked' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/shaders');
    expect(url).toContain('mode=3d');
    expect(url).toContain('tags=noise');
    expect(url).toContain('sort=liked');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(page.nextCursor).toBe('CUR');
    expect(page.items[0]).toMatchObject({
      id: 's1',
      description: '',
      mode: '3d',
      thumbnailUrl: 'http://t/s1.png',
      likeCount: 5,
      likedByMe: true,
      featured: true,
      author: { displayName: 'Shaddy', avatarUrl: null },
    });
  });

  it('getGalleryItem maps recipe + remix_of', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 's2',
        title: 'B',
        description: 'd',
        mode: '2d',
        tags: [],
        thumb_url: null,
        like_count: 0,
        liked_by_me: false,
        is_featured: false,
        created_at: '2026-01-01T00:00:00Z',
        author: { id: 'u1', handle: 'h', display_name: 'H', avatar_url: null },
        recipe: { cards: [] },
        remix_of: 's1',
      }),
    );
    const d = await getGalleryItem('s2');
    expect(d.recipe).toEqual({ cards: [] });
    expect(d.remixedFromId).toBe('s1');
  });
});

describe('writes', () => {
  it('like attaches the Bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ like_count: 3, liked: true }));
    const r = await like('s1');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
    expect(init.method).toBe('POST');
    expect(r.likeCount).toBe(3);
  });

  it('throws ApiError{401} when there is no token', async () => {
    getAccessToken.mockResolvedValueOnce(null);
    await expect(like('s1')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a non-2xx body to ApiError with the server message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Recipe too large' }, 413));
    try {
      await report('s1', 'spam');
      throw new Error('should have thrown');
    } catch (e) {
      expect(isApiError(e)).toBe(true);
      expect(e).toMatchObject({ status: 413, message: 'Recipe too large' });
    }
  });

  it('publish creates then uploads the thumbnail', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'new1', title: 'T', author: {} }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const res = await publish({
      title: 'T',
      description: '',
      tags: [],
      mode: '2d',
      recipe: { cards: [] } as never,
      thumbnailDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    });
    expect(res.id).toBe('new1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [thumbUrl, thumbInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(thumbUrl).toContain('/api/shaders/new1/thumb');
    expect(thumbInit.body).toBeInstanceOf(FormData);
  });
});
