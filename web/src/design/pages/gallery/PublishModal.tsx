// Publish-to-gallery modal (spec 03).
//
// Sign-in gated (useAuth). Captures a thumbnail from a hidden MiniRecipeCanvas
// via its onReady(snapshot) handle, posts title/description/tags + the
// media-stripped recipe through @/api.publish, and navigates to the new
// /s/:id. Reads-and-clears the remix source from sessionStorage. Flat & minimal.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { isApiError, publish, type GalleryMode } from '@/api';
import { useAuth } from '@/auth';
import { useCardsStore } from '@/cards';

import { SHADE, TYPE } from '../../tokens';
import { MiniRecipeCanvas } from './MiniRecipeCanvas';

const REMIX_KEY = 'shaddy.remix.from';
const MAX_TAGS = 6;

export function PublishModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { isAuthenticated, signIn } = useAuth();
  const recipe = useCardsStore((s) => s.recipe);
  const mode: GalleryMode = recipe.mode === '3d' ? '3d' : '2d';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [thumb, setThumb] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapRef = useRef<(() => Promise<string>) | null>(null);

  // Reset transient state when (re)opened.
  useEffect(() => {
    if (open) {
      setError(null);
      setThumb(null);
    }
  }, [open]);

  const capture = useCallback(async () => {
    try {
      const png = await snapRef.current?.();
      if (png) setThumb(png);
    } catch {
      /* leave thumb null; publish still works without it */
    }
  }, []);

  if (!open) return null;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < MAX_TAGS) setTags([...tags, t]);
    setTagInput('');
  };

  const submit = async () => {
    if (!title.trim()) {
      setError('Give it a title.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const remixedFromId = sessionStorage.getItem(REMIX_KEY) ?? undefined;
      const { id } = await publish({
        title: title.trim(),
        description: description.trim(),
        tags,
        mode,
        recipe: useCardsStore.getState().recipe,
        thumbnailDataUrl: thumb ?? undefined,
        remixedFromId,
      });
      sessionStorage.removeItem(REMIX_KEY);
      onClose();
      navigate(`/s/${id}`);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        setError('Please sign in to publish.');
        void signIn();
      } else {
        setError(err instanceof Error ? err.message : 'Publish failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)', maxHeight: '90vh', overflow: 'auto', borderRadius: 14,
          background: SHADE.surface1, border: `1.5px solid ${SHADE.border}`, boxShadow: `0 10px 0 ${SHADE.inkLine}`,
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ font: `700 20px ${TYPE.display}`, color: SHADE.text, margin: 0 }}>Publish to gallery</h2>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: SHADE.textDim, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {!isAuthenticated ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <p style={{ fontFamily: TYPE.body, color: SHADE.textDim, marginBottom: 16 }}>Sign in to publish your shader.</p>
            <button
              type="button"
              onClick={() => void signIn()}
              className="gal-cta"
              style={{ padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${SHADE.inkLine}`, background: SHADE.inkLine, color: SHADE.cream, cursor: 'pointer', fontFamily: TYPE.body, fontWeight: 700 }}
            >
              Sign in
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* hidden capture canvas + preview */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 120, height: 120, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${SHADE.border}`, background: '#000', flex: '0 0 auto' }}>
                {thumb ? (
                  <img src={thumb} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SHADE.textDim, fontFamily: TYPE.bodyMono, fontSize: 10 }}>
                    capturing…
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Title</label>
                <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Untitled shader" />
                <button type="button" onClick={capture} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: `1px solid ${SHADE.border}`, background: SHADE.surface1, color: SHADE.text, cursor: 'pointer', fontFamily: TYPE.bodyMono, fontSize: 11 }}>
                  Re-capture thumbnail
                </button>
                <span style={{ marginLeft: 10, fontFamily: TYPE.bodyMono, fontSize: 11, color: SHADE.textDim }}>mode: {mode}</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={description} maxLength={280} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What is it?" />
            </div>

            <div>
              <label style={labelStyle}>Tags ({tags.length}/{MAX_TAGS})</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {tags.map((t) => (
                  <button key={t} type="button" onClick={() => setTags(tags.filter((x) => x !== t))} style={{ padding: '3px 9px', borderRadius: 999, border: `1px solid ${SHADE.border}`, background: SHADE.surface3, color: SHADE.text, cursor: 'pointer', fontFamily: TYPE.bodyMono, fontSize: 11 }}>
                    {t} ×
                  </button>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                disabled={tags.length >= MAX_TAGS}
                style={inputStyle}
                placeholder="Add a tag, press Enter"
              />
            </div>

            {error && <div style={{ fontFamily: TYPE.bodyMono, fontSize: 12, color: '#c0392b' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${SHADE.border}`, background: 'transparent', color: SHADE.text, cursor: 'pointer', fontFamily: TYPE.body, fontWeight: 600 }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="gal-cta"
                style={{ padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${SHADE.goldDeep}`, background: SHADE.gold, color: '#1a1208', cursor: 'pointer', fontFamily: TYPE.body, fontWeight: 700, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Publishing…' : 'Publish'}
              </button>
            </div>

            {/* offscreen capture canvas */}
            <div style={{ position: 'absolute', width: 512, height: 512, left: -10000, top: 0, pointerEvents: 'none' }} aria-hidden>
              <MiniRecipeCanvas
                recipe={recipe}
                autoOrbit={false}
                onReady={(api) => {
                  snapRef.current = () => api.snapshotAt(512, 512);
                  void capture();
                }}
                style={{ width: 512, height: 512 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: TYPE.bodyMono,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: SHADE.textDim,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: `1.5px solid ${SHADE.border}`,
  background: SHADE.surface2,
  color: SHADE.text,
  fontFamily: TYPE.body,
  fontSize: 14,
  boxSizing: 'border-box',
};
