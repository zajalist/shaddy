// Author profile /u/:handle (spec 03).
//
// Header from getAuthor; the author's shaders via listByAuthor in the reused
// GalleryGrid. The signed-in owner gets a soft-delete affordance per tile.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getAuthor,
  isApiError,
  listByAuthor,
  softDelete,
  type AuthorProfile as Author,
  type GalleryListItem,
} from '@/api';
import { useAuth } from '@/auth';

import { SHADE, TYPE } from '../tokens';
import { useGalleryChrome } from './gallery/chrome';
import { BackGlyph } from './gallery/atoms';
import { GalleryGrid } from './gallery/GalleryGrid';

export default function AuthorProfile() {
  useGalleryChrome();
  const { handle = '' } = useParams();
  const { user } = useAuth();

  const [author, setAuthor] = useState<Author | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [items, setItems] = useState<GalleryListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const cursorRef = useRef<string | null>(null);
  cursorRef.current = cursor;

  useEffect(() => {
    let cancelled = false;
    setAuthor(null);
    setNotFound(false);
    getAuthor(handle)
      .then((a) => !cancelled && setAuthor(a))
      .catch((err) => {
        if (cancelled) return;
        if (isApiError(err) && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const fetchPage = useCallback(
    async (cur: string | null, replace: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const page = await listByAuthor(handle, { cursor: cur });
        setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
        setReachedEnd(page.nextCursor === null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [handle],
  );

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setReachedEnd(false);
    void fetchPage(null, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || reachedEnd) return;
    void fetchPage(cursorRef.current, false);
  }, [loading, reachedEnd, fetchPage]);

  const isOwner = !!author && !!user && author.id === user.sub;

  const onDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this shader? This cannot be undone.')) return;
      try {
        await softDelete(id);
        setItems((prev) => prev.filter((it) => it.id !== id));
      } catch {
        setError('Could not delete that shader.');
      }
    },
    [],
  );

  if (notFound) {
    return (
      <Shell>
        <div style={{ padding: '64px 0', textAlign: 'center', color: SHADE.textDim, fontFamily: TYPE.body }}>
          <div style={{ font: `700 22px ${TYPE.display}`, color: SHADE.text, marginBottom: 8 }}>No such profile.</div>
          <Link to="/gallery" style={{ color: SHADE.gold, fontFamily: TYPE.bodyMono, fontSize: 13 }}>
            ← Back to the gallery
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        {author?.avatarUrl ? (
          <img src={author.avatarUrl} alt="" width={56} height={56} style={{ borderRadius: '50%' }} />
        ) : (
          <span style={{ width: 56, height: 56, borderRadius: '50%', background: SHADE.inkLine, color: SHADE.cream, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
            {(author?.displayName?.[0] ?? handle[0] ?? '?').toUpperCase()}
          </span>
        )}
        <div>
          <h1 style={{ font: `700 28px ${TYPE.display}`, color: SHADE.text, margin: 0, letterSpacing: TYPE.trackTighter }}>
            {author?.displayName ?? `@${handle}`}
          </h1>
          <div style={{ fontFamily: TYPE.bodyMono, fontSize: 12, color: SHADE.textDim, marginTop: 4 }}>
            @{handle}
            {author && ` · ${author.shaderCount} shader${author.shaderCount === 1 ? '' : 's'} · ${author.totalLikes} ♥`}
          </div>
        </div>
      </header>

      <GalleryGrid
        items={items}
        loading={loading}
        error={error}
        reachedEnd={reachedEnd}
        onLoadMore={loadMore}
        onRetry={() => void fetchPage(null, true)}
        onDelete={isOwner ? onDelete : undefined}
        emptyLabel="No published shaders yet."
      />
    </Shell>
  );
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px 80px' }}>
    <Link
      to="/gallery"
      className="gal-back"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, color: SHADE.textDim, textDecoration: 'none', fontFamily: TYPE.bodyMono, fontSize: 12, marginBottom: 18 }}
    >
      <BackGlyph /> Gallery
    </Link>
    {children}
  </div>
);
