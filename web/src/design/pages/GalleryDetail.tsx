// Shader detail page /s/:id (spec 03).
//
// Live MiniRecipeCanvas, like/unlike (optimistic, sign-in-gated), "Open in
// composer" remix that stamps lineage, report, remix-lineage line, author
// chip, copy-link. Flat & minimal.

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getGalleryItem,
  isApiError,
  like as apiLike,
  report as apiReport,
  unlike as apiUnlike,
  type GalleryDetail as Detail,
} from '@/api';
import { useAuth } from '@/auth';
import { cloneRecipeWithFreshIds, useCardsStore } from '@/cards';

import { SHADE, TYPE } from '../tokens';
import { useGalleryChrome } from './gallery/chrome';
import { BackGlyph, HeartGlyph, ModeBadge } from './gallery/atoms';
import { MiniRecipeCanvas } from './gallery/MiniRecipeCanvas';

const REMIX_KEY = 'shaddy.remix.from';

type Load = { kind: 'loading' } | { kind: 'error'; status: number } | { kind: 'ok'; detail: Detail };

export default function GalleryDetail() {
  useGalleryChrome();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: 'loading' });
    getGalleryItem(id)
      .then((detail) => {
        if (cancelled) return;
        setLoad({ kind: 'ok', detail });
        setLiked(detail.likedByMe);
        setLikeCount(detail.likeCount);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoad({ kind: 'error', status: isApiError(err) ? err.status : 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleLike = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    // optimistic
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const r = next ? await apiLike(id) : await apiUnlike(id);
      setLikeCount(r.likeCount);
    } catch (err) {
      // revert
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      if (isApiError(err) && err.status === 401) void signIn();
    } finally {
      setBusy(false);
    }
  }, [busy, liked, id, signIn]);

  const remix = useCallback(() => {
    if (load.kind !== 'ok') return;
    const fresh = cloneRecipeWithFreshIds(load.detail.recipe);
    useCardsStore.getState().setRecipe(fresh);
    try {
      sessionStorage.setItem(REMIX_KEY, load.detail.id);
    } catch {
      /* ignore */
    }
    navigate('/design');
  }, [load, navigate]);

  const doReport = useCallback(async () => {
    const reason = window.prompt('Why are you reporting this shader? (spam / nsfw / stolen / broken / other)');
    if (!reason) return;
    try {
      await apiReport(id, reason.trim().toLowerCase());
      setToast('Thanks — we’ll take a look.');
    } catch (err) {
      if (isApiError(err) && err.status === 401) void signIn();
      else setToast('Could not send report.');
    }
  }, [id, signIn]);

  const copyLink = () => {
    void navigator.clipboard?.writeText(`${window.location.origin}/s/${id}`);
    setToast('Link copied.');
  };

  if (load.kind === 'loading') {
    return (
      <Shell>
        <div style={{ aspectRatio: '16 / 10', borderRadius: 14, background: SHADE.surface3 }} />
      </Shell>
    );
  }

  if (load.kind === 'error') {
    return (
      <Shell>
        <div style={{ padding: '64px 0', textAlign: 'center', color: SHADE.textDim, fontFamily: TYPE.body }}>
          <div style={{ font: `700 22px ${TYPE.display}`, color: SHADE.text, marginBottom: 8 }}>
            {load.status === 404 ? 'This shader was removed or never existed.' : 'Could not load this shader.'}
          </div>
          <Link to="/gallery" style={{ color: SHADE.gold, fontFamily: TYPE.bodyMono, fontSize: 13 }}>
            ← Back to the gallery
          </Link>
        </div>
      </Shell>
    );
  }

  const d = load.detail;
  return (
    <Shell>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}>
        <div
          style={{
            position: 'relative', aspectRatio: '16 / 10', borderRadius: 14, overflow: 'hidden',
            border: `1.5px solid ${SHADE.borderHi}`, background: '#000', boxShadow: `0 6px 0 ${SHADE.inkLine}`,
          }}
        >
          <MiniRecipeCanvas recipe={d.recipe} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <ModeBadge mode={d.mode} />
          </div>
        </div>

        <div>
          <h1 style={{ font: `700 30px ${TYPE.display}`, color: SHADE.text, margin: '0 0 6px', letterSpacing: TYPE.trackTighter }}>
            {d.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <Link
              to={`/u/${d.author.handle}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: SHADE.text, textDecoration: 'none', fontFamily: TYPE.body, fontWeight: 600, fontSize: 13 }}
            >
              {d.author.avatarUrl ? (
                <img src={d.author.avatarUrl} alt="" width={24} height={24} style={{ borderRadius: '50%' }} />
              ) : (
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: SHADE.inkLine, color: SHADE.cream, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {(d.author.displayName[0] ?? '?').toUpperCase()}
                </span>
              )}
              @{d.author.handle}
            </Link>
            <span style={{ fontFamily: TYPE.bodyMono, fontSize: 12, color: SHADE.textDim }}>
              {new Date(d.createdAt).toLocaleDateString()}
            </span>
          </div>

          {d.description && (
            <p style={{ fontFamily: TYPE.body, fontSize: 15, color: SHADE.textDim, lineHeight: 1.55, marginBottom: 14 }}>
              {d.description}
            </p>
          )}

          {d.remixedFromId && (
            <div style={{ fontFamily: TYPE.bodyMono, fontSize: 12, color: SHADE.textDim, marginBottom: 14 }}>
              Remixed from{' '}
              <Link to={`/s/${d.remixedFromId}`} style={{ color: SHADE.gold }}>
                another shader
              </Link>
            </div>
          )}

          {d.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {d.tags.map((t) => (
                <span key={t} style={{ padding: '3px 9px', borderRadius: 999, border: `1px solid ${SHADE.border}`, fontFamily: TYPE.bodyMono, fontSize: 11, color: SHADE.textDim }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={toggleLike}
              className="gal-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10,
                border: `1.5px solid ${SHADE.inkLine}`, cursor: 'pointer', fontFamily: TYPE.body, fontWeight: 700, fontSize: 13,
                background: liked ? SHADE.gold : SHADE.surface1, color: liked ? '#1a1208' : SHADE.text,
              }}
            >
              <HeartGlyph filled={liked} /> {likeCount}
            </button>
            <button
              type="button"
              onClick={remix}
              className="gal-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10,
                border: `1.5px solid ${SHADE.inkLine}`, background: SHADE.inkLine, color: SHADE.cream,
                cursor: 'pointer', fontFamily: TYPE.body, fontWeight: 700, fontSize: 13,
              }}
            >
              Open in composer
            </button>
            <button
              type="button"
              onClick={copyLink}
              style={{ padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${SHADE.border}`, background: SHADE.surface1, color: SHADE.text, cursor: 'pointer', fontFamily: TYPE.body, fontWeight: 600, fontSize: 13 }}
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={doReport}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'transparent', color: SHADE.textDim, cursor: 'pointer', fontFamily: TYPE.body, fontSize: 13 }}
            >
              Report
            </button>
          </div>

          {toast && (
            <div style={{ marginTop: 14, fontFamily: TYPE.bodyMono, fontSize: 12, color: SHADE.textDim }}>{toast}</div>
          )}
        </div>
      </div>
    </Shell>
  );
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 80px' }}>
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
