// Gallery — live, API-backed browse grid (spec 03).
//
// Lists published shaders from @/api with mode + tag filters, a debounced
// search box, recent/liked/trending sort, and cursor-based infinite scroll.
// Tiles are static PNG thumbnails linking to /s/:id — no live WebGL in the
// grid (a grid of WebGL contexts was the old perf bug). Flat & minimal.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  isApiError,
  listGallery,
  type GalleryListItem,
  type GalleryMode,
  type GallerySort,
  type ListParams,
} from '@/api';

const errMsg = (err: unknown): string =>
  isApiError(err) ? err.message : err instanceof Error ? err.message : String(err);

import { SHADE, TYPE } from '../tokens';
import { useGalleryChrome } from './gallery/chrome';
import { Chip, Eyebrow } from './gallery/atoms';
import { GalleryGrid } from './gallery/GalleryGrid';

const TAGS = ['gradient', 'noise', 'fractal', 'glitch', 'pattern', 'generative'] as const;
const SORTS: Array<{ key: GallerySort; label: string }> = [
  { key: 'recent', label: 'Recent' },
  { key: 'liked', label: 'Most liked' },
  { key: 'trending', label: 'Trending' },
];

type FeedState = {
  items: GalleryListItem[];
  cursor: string | null;
  loading: boolean;
  error: string | null;
  reachedEnd: boolean;
};

const EMPTY: FeedState = { items: [], cursor: null, loading: true, error: null, reachedEnd: false };

// Local hook: owns the paged list and refetches page 1 whenever the query
// params change. `loadMore` appends the next cursor page.
function useGalleryFeed(params: Omit<ListParams, 'cursor'>) {
  const [state, setState] = useState<FeedState>(EMPTY);
  // Stable key so the page-1 effect only refires on a real filter change.
  const key = JSON.stringify(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchPage = useCallback(async (cursor: string | null, replace: boolean) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const page = await listGallery({ ...paramsRef.current, cursor });
      setState((s) => ({
        items: replace ? page.items : [...s.items, ...page.items],
        cursor: page.nextCursor,
        loading: false,
        error: null,
        reachedEnd: page.nextCursor === null,
      }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: errMsg(err) }));
    }
  }, []);

  useEffect(() => {
    setState(EMPTY);
    void fetchPage(null, true);
  }, [key, fetchPage]);

  const loadMore = useCallback(() => {
    setState((s) => {
      if (s.loading || s.reachedEnd) return s;
      void fetchPage(s.cursor, false);
      return s;
    });
  }, [fetchPage]);

  const retry = useCallback(() => void fetchPage(null, true), [fetchPage]);

  return { state, loadMore, retry };
}

// Debounce a changing value.
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function Gallery() {
  useGalleryChrome();

  const [mode, setMode] = useState<GalleryMode | 'all'>('all');
  const [tags, setTags] = useState<string[]>([]);
  const [rawQ, setRawQ] = useState('');
  const [sort, setSort] = useState<GallerySort>('recent');
  const q = useDebounced(rawQ.trim(), 300);

  const params = useMemo<Omit<ListParams, 'cursor'>>(
    () => ({
      mode: mode === 'all' ? undefined : mode,
      tags: tags.length ? tags : undefined,
      q: q || undefined,
      sort,
    }),
    [mode, tags, q, sort],
  );

  const { state, loadMore, retry } = useGalleryFeed(params);

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* hero */}
      <header style={{ marginBottom: 28 }}>
        <Link to="/" className="gal-back" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
          color: SHADE.textDim, textDecoration: 'none', fontFamily: TYPE.bodyMono, fontSize: 12, marginBottom: 16,
        }}>
          ← Home
        </Link>
        <Eyebrow>Gallery</Eyebrow>
        <h1 style={{ font: `700 40px ${TYPE.display}`, color: SHADE.text, margin: '8px 0 6px', letterSpacing: TYPE.trackTighter }}>
          Made with Shaddy
        </h1>
        <p style={{ fontFamily: TYPE.body, fontSize: 15, color: SHADE.textDim, maxWidth: 560, lineHeight: 1.5 }}>
          Browse shaders the community published. Open one to see it live, like it, or remix it into your own.
        </p>
        <input
          value={rawQ}
          onChange={(e) => setRawQ(e.target.value)}
          placeholder="Search shaders…"
          style={{
            marginTop: 18, width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 10,
            border: `1.5px solid ${SHADE.border}`, background: SHADE.surface1, color: SHADE.text,
            fontFamily: TYPE.body, fontSize: 14, boxSizing: 'border-box',
          }}
        />
      </header>

      {/* controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 22 }}>
        {(['all', '2d', '3d'] as const).map((m) => (
          <Chip key={m} active={mode === m} onClick={() => setMode(m)} label={m === 'all' ? 'All' : m.toUpperCase()} />
        ))}
        <span style={{ width: 1, height: 22, background: SHADE.border, margin: '0 4px' }} />
        {TAGS.map((t) => (
          <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)} label={t} />
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: SHADE.surface1, border: `1.5px solid ${SHADE.border}`, borderRadius: 999, padding: 3 }}>
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                style={{
                  padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: active ? SHADE.inkLine : 'transparent',
                  color: active ? SHADE.cream : SHADE.textDim,
                  fontFamily: TYPE.body, fontSize: 12, fontWeight: 600,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <GalleryGrid
        items={state.items}
        loading={state.loading}
        error={state.error}
        reachedEnd={state.reachedEnd}
        onLoadMore={loadMore}
        onRetry={retry}
        emptyLabel={q || tags.length || mode !== 'all' ? 'No shaders match those filters.' : 'No shaders published yet.'}
      />
    </div>
  );
}
