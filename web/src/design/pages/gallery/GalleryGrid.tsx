// Reusable shader grid — static PNG thumbnails, tiles link to /s/:id, and an
// IntersectionObserver sentinel drives cursor-based infinite scroll. Shared by
// /gallery and /u/:handle. Flat & minimal (no glow).

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import type { GalleryListItem } from '@/api';

import { SHADE, TYPE } from '../../tokens';
import { ModeBadge } from './atoms';

export type GalleryGridProps = {
  items: GalleryListItem[];
  loading: boolean;
  error: string | null;
  reachedEnd: boolean;
  onLoadMore: () => void;
  onRetry?: () => void;
  /** When set, each tile shows a Delete affordance (owner viewing own profile). */
  onDelete?: (id: string) => void;
  emptyLabel?: string;
};

const Thumb = ({ item }: { item: GalleryListItem }) => (
  <div style={{ position: 'relative', aspectRatio: '1 / 1', background: SHADE.surface3, overflow: 'hidden' }}>
    {item.thumbnailUrl ? (
      <img
        className="gal-thumb"
        src={item.thumbnailUrl}
        alt={item.title}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ) : (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: SHADE.textDim, fontFamily: TYPE.bodyMono, fontSize: 11,
        }}
      >
        no preview
      </div>
    )}
    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6 }}>
      <ModeBadge mode={item.mode} />
      {item.featured && (
        <span
          style={{
            padding: '3px 7px', borderRadius: 4, background: SHADE.gold, color: '#1a1208',
            fontFamily: TYPE.bodyMono, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}
        >
          Featured
        </span>
      )}
    </div>
  </div>
);

const Tile = ({ item, onDelete }: { item: GalleryListItem; onDelete?: (id: string) => void }) => (
  <article
    className="gal-tile"
    style={{
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      border: `1.5px solid ${SHADE.border}`,
      background: SHADE.surface1,
      boxShadow: `0 3px 0 ${SHADE.inkLine}`,
    }}
  >
    <Link to={`/s/${item.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Thumb item={item} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontFamily: TYPE.body, fontWeight: 700, fontSize: 14, color: SHADE.text, letterSpacing: '-0.01em' }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: TYPE.bodyMono, fontSize: 11, color: SHADE.textDim }}>
            @{item.author.handle}
          </span>
          <span style={{ fontFamily: TYPE.bodyMono, fontSize: 11, color: SHADE.textDim }}>
            ♥ {item.likeCount}
          </span>
        </div>
      </div>
    </Link>
    {onDelete && (
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        style={{
          position: 'absolute', top: 8, right: 8, padding: '4px 9px', borderRadius: 6,
          border: `1px solid ${SHADE.border}`, background: 'rgba(0,0,0,0.55)', color: SHADE.cream,
          fontFamily: TYPE.bodyMono, fontSize: 10, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Delete
      </button>
    )}
  </article>
);

const SkeletonTile = () => (
  <div
    style={{
      borderRadius: 12, border: `1.5px solid ${SHADE.border}`, overflow: 'hidden',
      background: SHADE.surface1,
    }}
  >
    <div style={{ aspectRatio: '1 / 1', background: SHADE.surface3 }} />
    <div style={{ padding: 14 }}>
      <div style={{ height: 12, width: '70%', background: SHADE.surface3, borderRadius: 4 }} />
    </div>
  </div>
);

export const GalleryGrid = ({
  items,
  loading,
  error,
  reachedEnd,
  onLoadMore,
  onRetry,
  onDelete,
  emptyLabel = 'Nothing here yet.',
}: GalleryGridProps) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || reachedEnd || loading) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reachedEnd, loading, onLoadMore]);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 18,
  } as const;

  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: SHADE.textDim, fontFamily: TYPE.body }}>
        <div style={{ marginBottom: 12 }}>Couldn’t load shaders: {error}</div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="gal-cta"
            style={{
              padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${SHADE.inkLine}`,
              background: SHADE.surface1, color: SHADE.text, cursor: 'pointer', fontFamily: TYPE.body, fontWeight: 600,
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div style={{ padding: '56px 0', textAlign: 'center', color: SHADE.textDim, fontFamily: TYPE.body, fontSize: 15 }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <>
      <div style={gridStyle}>
        {items.map((item) => (
          <Tile key={item.id} item={item} onDelete={onDelete} />
        ))}
        {loading && items.length === 0 &&
          Array.from({ length: 8 }).map((_, i) => <SkeletonTile key={`sk-${i}`} />)}
      </div>
      {loading && items.length > 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: SHADE.textDim, fontFamily: TYPE.bodyMono, fontSize: 12 }}>
          loading…
        </div>
      )}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </>
  );
};
