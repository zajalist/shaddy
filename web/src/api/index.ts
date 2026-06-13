// @/api — the single seam to the FastAPI backend (spec 02/03).
//
// DO NOT import anything else from api/ — this is the public surface. The
// module is a near-leaf: it may import @/cards (Recipe type), @/auth (the
// token), and @/shared, and nothing else (enforced in eslint.config.js).
//
// The backend speaks snake_case under /api/shaders/* and /api/users/*; this
// module is the one place that maps those wire shapes to the camelCase types
// the UI consumes.

import type { Recipe } from '@/cards';

import { isApiError, request } from './client';
import { dataUrlToBlob, serialisable } from './serialize';

export type { ApiError } from './client';
export { isApiError };

export type GalleryMode = '2d' | '3d';
export type GallerySort = 'recent' | 'liked' | 'trending';

export type GalleryAuthor = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

export type GalleryListItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  mode: GalleryMode;
  thumbnailUrl: string | null;
  author: GalleryAuthor;
  likeCount: number;
  likedByMe: boolean;
  featured: boolean;
  createdAt: string;
};

export type GalleryDetail = GalleryListItem & {
  recipe: Recipe;
  /** The shader this was remixed from (id only; backend stores remix_of). */
  remixedFromId: string | null;
};

export type GalleryPage = {
  items: GalleryListItem[];
  nextCursor: string | null;
};

export type ListParams = {
  mode?: GalleryMode;
  tags?: string[];
  q?: string;
  sort?: GallerySort;
  cursor?: string | null;
  limit?: number;
};

export type PublishInput = {
  title: string;
  description: string;
  tags: string[];
  mode: GalleryMode;
  recipe: Recipe;
  thumbnailDataUrl?: string;
  remixedFromId?: string;
};

export type AuthorProfile = GalleryAuthor & {
  shaderCount: number;
  totalLikes: number;
};

// ─── Wire shapes (backend snake_case) ──────────────────────────────────────

type WireAuthor = { id: string; handle: string; display_name: string; avatar_url: string | null };
type WireShader = {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  tags: string[];
  thumb_url: string | null;
  like_count: number;
  liked_by_me: boolean;
  is_featured: boolean;
  created_at: string;
  author: WireAuthor;
  recipe?: Recipe | null;
  remix_of?: string | null;
};
type WirePage = { items: WireShader[]; next_cursor: string | null };
type WireProfile = WireAuthor & { created_at: string; shader_count: number; total_likes: number };
type WireLike = { like_count: number; liked: boolean };

const mapAuthor = (a: WireAuthor): GalleryAuthor => ({
  id: a.id,
  handle: a.handle,
  displayName: a.display_name,
  avatarUrl: a.avatar_url,
});

const mapItem = (s: WireShader): GalleryListItem => ({
  id: s.id,
  title: s.title,
  description: s.description ?? '',
  tags: s.tags ?? [],
  mode: s.mode === '3d' ? '3d' : '2d',
  thumbnailUrl: s.thumb_url,
  author: mapAuthor(s.author),
  likeCount: s.like_count,
  likedByMe: s.liked_by_me,
  featured: s.is_featured,
  createdAt: s.created_at,
});

const mapDetail = (s: WireShader): GalleryDetail => ({
  ...mapItem(s),
  recipe: (s.recipe ?? { cards: [] }) as Recipe,
  remixedFromId: s.remix_of ?? null,
});

// ─── Reads (public) ─────────────────────────────────────────────────────────

export async function listGallery(p: ListParams = {}): Promise<GalleryPage> {
  const page = await request<WirePage>('/api/shaders', {
    auth: false,
    query: {
      mode: p.mode,
      tags: p.tags?.length ? p.tags.join(',') : undefined,
      q: p.q,
      sort: p.sort ?? 'recent',
      cursor: p.cursor ?? undefined,
      limit: p.limit ?? 24,
    },
  });
  return { items: page.items.map(mapItem), nextCursor: page.next_cursor };
}

export async function getGalleryItem(id: string): Promise<GalleryDetail> {
  return mapDetail(await request<WireShader>(`/api/shaders/${id}`, { auth: false }));
}

export async function listByAuthor(
  handle: string,
  p: Omit<ListParams, 'q'> = {},
): Promise<GalleryPage> {
  const page = await request<WirePage>(`/api/users/${encodeURIComponent(handle)}/shaders`, {
    auth: false,
    query: { sort: p.sort ?? 'recent', cursor: p.cursor ?? undefined, limit: p.limit ?? 24 },
  });
  return { items: page.items.map(mapItem), nextCursor: page.next_cursor };
}

export async function getAuthor(handle: string): Promise<AuthorProfile> {
  const p = await request<WireProfile>(`/api/users/${encodeURIComponent(handle)}`, { auth: false });
  return { ...mapAuthor(p), shaderCount: p.shader_count, totalLikes: p.total_likes };
}

// ─── Writes (attach JWT) ─────────────────────────────────────────────────────

export async function publish(input: PublishInput): Promise<{ id: string }> {
  const created = await request<WireShader>('/api/shaders', {
    method: 'POST',
    json: {
      title: input.title,
      description: input.description || null,
      recipe: serialisable(input.recipe),
      tags: input.tags,
      remix_of: input.remixedFromId ?? null,
    },
  });
  if (input.thumbnailDataUrl) {
    try {
      const form = new FormData();
      form.append('file', dataUrlToBlob(input.thumbnailDataUrl), `${created.id}.png`);
      await request<unknown>(`/api/shaders/${created.id}/thumb`, { method: 'POST', body: form });
    } catch (err) {
      // A failed thumbnail shouldn't sink a successful publish.
      console.warn('[api] thumbnail upload failed (non-fatal):', err);
    }
  }
  return { id: created.id };
}

export async function like(id: string): Promise<{ likeCount: number }> {
  const r = await request<WireLike>(`/api/shaders/${id}/like`, { method: 'POST' });
  return { likeCount: r.like_count };
}

export async function unlike(id: string): Promise<{ likeCount: number }> {
  const r = await request<WireLike>(`/api/shaders/${id}/like`, { method: 'DELETE' });
  return { likeCount: r.like_count };
}

export async function report(id: string, reason: string): Promise<void> {
  await request<void>(`/api/shaders/${id}/report`, { method: 'POST', json: { reason } });
}

export async function softDelete(id: string): Promise<void> {
  await request<void>(`/api/shaders/${id}`, { method: 'DELETE' });
}
