// Gallery — curated browseable grid of recipes built with Shaddy.
//
// Each tile runs a live MiniRecipeCanvas thumbnail and exposes a single
// CTA — "Open in composer" — which loads the recipe into the cards store
// and navigates to /design. Filter chips along the top let the user
// narrow by mode (2d/3d) or by curatorial taxonomy (featured / recent).
//
// The page is standalone — owns its own font loader, keyframes, and body
// background, same pattern as Landing and Library. Routed from
// integration/main.tsx by another agent.

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  cloneRecipeWithFreshIds,
  useCardsStore,
  type ShaderTemplate,
} from '@/cards';

import { SHADE, TYPE } from '../tokens';

import { MiniRecipeCanvas } from './gallery/MiniRecipeCanvas';
import { CURATED_RECIPES, type CuratedRecipe } from './gallery/recipes';

// ─── chrome (fonts + keyframes + body bg) ──────────────────────────────

const FONT_LINK_ID = 'shade-design-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
const KEYFRAMES_ID = 'shade-gallery-keyframes';

const useGalleryChrome = () => {
  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(KEYFRAMES_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAMES_ID;
      style.textContent = `
        @keyframes galFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gal-tile {
          transition:
            transform 180ms cubic-bezier(0.2, 1.2, 0.4, 1),
            box-shadow 180ms cubic-bezier(0.2, 1.2, 0.4, 1);
        }
        .gal-tile:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 0 ${SHADE.inkLine};
        }
        .gal-tile .gal-overlay {
          opacity: 0;
          transition: opacity 180ms ease;
          pointer-events: none;
        }
        .gal-tile:hover .gal-overlay {
          opacity: 1;
          pointer-events: auto;
        }
        /* On coarse-pointer devices (touchscreens) the hover overlay never
           triggers, so show it permanently — the "Open in composer" CTA is
           the whole point of the tile. */
        @media (hover: none), (pointer: coarse) {
          .gal-tile .gal-overlay {
            opacity: 1;
            pointer-events: auto;
          }
        }
        .gal-tile .gal-thumb {
          transform: scale(1);
          transition: transform 380ms cubic-bezier(0.2, 1, 0.4, 1);
        }
        .gal-tile:hover .gal-thumb {
          transform: scale(1.04);
        }
        .gal-cta {
          transition:
            transform 120ms ease,
            box-shadow 120ms ease,
            background 160ms ease;
        }
        .gal-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 0 ${SHADE.inkLine};
          background: ${SHADE.gold};
        }
        .gal-cta:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 ${SHADE.inkLine};
        }
        .gal-chip {
          transition:
            transform 120ms ease,
            box-shadow 120ms ease,
            background 160ms ease,
            color 160ms ease;
        }
        .gal-chip:hover:not([data-active="true"]) {
          background: ${SHADE.surface3};
        }
        .gal-back {
          transition: background 160ms ease, color 160ms ease;
        }
        .gal-back:hover { background: ${SHADE.surface3}; }
      `;
      document.head.appendChild(style);
    }
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    const prevOverflowX = document.body.style.overflowX;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.background = SHADE.bg;
    document.body.style.color = SHADE.text;
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
      document.body.style.overflowX = prevOverflowX;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, []);
};

// ─── filters ────────────────────────────────────────────────────────────

type ModeFilter = 'all' | ShaderTemplate;
type TaxFilter = 'all' | 'featured' | 'recent';

function matches(r: CuratedRecipe, mode: ModeFilter, tax: TaxFilter): boolean {
  if (mode !== 'all') {
    const rMode: ShaderTemplate = r.recipe.mode ?? '2d';
    if (rMode !== mode) return false;
  }
  if (tax === 'featured' && !r.featured) return false;
  if (tax === 'recent'   && !r.recent)   return false;
  return true;
}

// ─── small UI atoms ─────────────────────────────────────────────────────

const Eyebrow = ({ children, color, style }: {
  children: ReactNode; color?: string; style?: CSSProperties;
}) => (
  <span
    style={{
      fontFamily: TYPE.bodyMono,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: TYPE.trackEyebrow,
      textTransform: 'uppercase',
      color: color ?? SHADE.textDim,
      ...style,
    }}
  >
    {children}
  </span>
);

const Chip = ({
  active, onClick, label, count, color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  color?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="gal-chip"
    data-active={active}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 14px',
      borderRadius: 999,
      border: `1.5px solid ${active ? SHADE.inkLine : SHADE.border}`,
      background: active ? (color ?? SHADE.inkLine) : SHADE.surface1,
      color: active ? SHADE.cream : SHADE.text,
      cursor: 'pointer',
      fontFamily: TYPE.body,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      boxShadow: active ? `0 2px 0 ${SHADE.inkLine}` : 'none',
    }}
  >
    {label}
    {count !== undefined && (
      <span
        style={{
          fontFamily: TYPE.bodyMono,
          fontSize: 10,
          fontWeight: 600,
          opacity: 0.75,
          padding: '2px 6px',
          borderRadius: 6,
          background: active ? 'rgba(0,0,0,0.2)' : SHADE.surface3,
        }}
      >
        {count}
      </span>
    )}
  </button>
);

const ModeBadge = ({ mode }: { mode: ShaderTemplate }) => {
  const color = mode === '3d' ? SHADE.catEffect : SHADE.catShape;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 7px',
        borderRadius: 4,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        color: SHADE.cream,
        fontFamily: TYPE.bodyMono,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        border: `1px solid ${color}`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 5, height: 5, borderRadius: '50%',
          background: color, boxShadow: `0 0 6px ${color}`,
        }}
      />
      {mode.toUpperCase()}
    </span>
  );
};

// ─── tile ───────────────────────────────────────────────────────────────

const RecipeTile = ({
  curated, onOpen,
}: { curated: CuratedRecipe; onOpen: () => void }) => {
  const mode: ShaderTemplate = curated.recipe.mode ?? '2d';
  return (
    <article
      className="gal-tile"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: SHADE.surface1,
        border: `1.5px solid ${SHADE.inkLine}`,
        borderRadius: 12,
        boxShadow: `0 4px 0 ${SHADE.inkLine}`,
        overflow: 'hidden',
      }}
    >
      {/* thumbnail well */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          background: SHADE.surface4,
          borderBottom: `1.5px solid ${SHADE.inkLine}`,
          overflow: 'hidden',
        }}
      >
        <div
          className="gal-thumb"
          style={{ position: 'absolute', inset: 0 }}
        >
          <MiniRecipeCanvas
            recipe={curated.recipe}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* mode badge — top-right */}
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
          <ModeBadge mode={mode} />
        </div>

        {/* featured ribbon — top-left, only if featured */}
        {curated.featured && (
          <div
            style={{
              position: 'absolute',
              top: 10, left: 10, zIndex: 2,
              padding: '3px 8px',
              background: SHADE.gold,
              border: `1px solid ${SHADE.goldDeep}`,
              borderRadius: 4,
              color: SHADE.inkLine,
              fontFamily: TYPE.bodyMono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset',
            }}
          >
            Featured
          </div>
        )}

        {/* hover overlay with CTA */}
        <div
          className="gal-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 18,
            zIndex: 3,
          }}
        >
          <button
            type="button"
            onClick={onOpen}
            className="gal-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 8,
              border: `1.5px solid ${SHADE.inkLine}`,
              background: `linear-gradient(180deg, ${SHADE.gold} 0%, ${SHADE.goldDeep} 100%)`,
              color: SHADE.inkLine,
              fontFamily: TYPE.body,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              boxShadow: `0 2px 0 ${SHADE.inkLine}, 0 1px 0 rgba(255,255,255,0.22) inset`,
            }}
          >
            <ArrowGlyph />
            Open in composer
          </button>
        </div>
      </div>

      {/* meta */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: TYPE.display,
            fontWeight: 600,
            fontSize: 19,
            letterSpacing: TYPE.trackTight,
            color: SHADE.text,
            lineHeight: 1.15,
          }}
        >
          {curated.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontFamily: TYPE.body,
            fontSize: 13,
            color: SHADE.textDim,
            lineHeight: 1.35,
          }}
        >
          {curated.tag}
        </p>
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Eyebrow>{curated.author}</Eyebrow>
          <Eyebrow color={SHADE.textFaint}>
            {curated.recipe.cards.length} cards
          </Eyebrow>
        </div>
      </div>
    </article>
  );
};

const ArrowGlyph = () => (
  <svg
    width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="M13 5l7 7-7 7" />
  </svg>
);

// ─── page ───────────────────────────────────────────────────────────────

const Gallery = () => {
  useGalleryChrome();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ModeFilter>('all');
  const [tax,  setTax]  = useState<TaxFilter>('all');

  const visible = useMemo(
    () => CURATED_RECIPES.filter((r) => matches(r, mode, tax)),
    [mode, tax],
  );

  const counts = useMemo(() => {
    const total = CURATED_RECIPES.length;
    let d2 = 0, d3 = 0, featured = 0, recent = 0;
    for (const r of CURATED_RECIPES) {
      if ((r.recipe.mode ?? '2d') === '3d') d3++; else d2++;
      if (r.featured) featured++;
      if (r.recent)   recent++;
    }
    return { total, d2, d3, featured, recent };
  }, []);

  const openInComposer = (curated: CuratedRecipe) => {
    // Fresh ids on every open so the reverse parser & cards UI don't
    // collide if the user opens the same gallery item twice in a row.
    const fresh = cloneRecipeWithFreshIds(curated.recipe);
    useCardsStore.getState().setRecipe(fresh);
    navigate('/design');
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: SHADE.bg,
        color: SHADE.text,
        fontFamily: TYPE.body,
        padding: '40px 32px 96px',
      }}
    >
      {/* back-link */}
      <div style={{ maxWidth: 1280, margin: '0 auto 16px' }}>
        <a
          href="/"
          className="gal-back"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            color: SHADE.textDim,
            textDecoration: 'none',
            fontFamily: TYPE.bodyMono,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <BackGlyph />
          Home
        </a>
      </div>

      {/* hero */}
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto 36px',
          background:
            `linear-gradient(180deg, ${SHADE.cream} 0%, ${SHADE.surface1} 100%)`,
          border: `1.5px solid ${SHADE.inkLine}`,
          borderRadius: 16,
          boxShadow: `0 6px 0 ${SHADE.inkLine}`,
          padding: '44px 40px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* decorative diamond cluster — top-right */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 22, right: 28,
            display: 'flex', gap: 6,
            opacity: 0.55,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 9 + i * 2, height: 9 + i * 2,
                background: i === 1 ? SHADE.gold : SHADE.ember,
                border: `1px solid ${SHADE.inkLine}`,
                transform: 'rotate(45deg)',
              }}
            />
          ))}
        </div>

        <Eyebrow color={SHADE.goldDeep}>The Gallery — vol. 01</Eyebrow>
        <h1
          style={{
            margin: '10px 0 12px',
            fontFamily: TYPE.display,
            fontWeight: 700,
            fontSize: 'clamp(38px, 5.4vw, 64px)',
            letterSpacing: TYPE.trackTighter,
            lineHeight: 1.02,
            color: SHADE.text,
            maxWidth: 880,
          }}
        >
          Things people made.<br />Click any of them.
        </h1>
        <p
          style={{
            margin: 0,
            fontFamily: TYPE.body,
            fontSize: 17,
            lineHeight: 1.45,
            color: SHADE.textDim,
            maxWidth: 620,
          }}
        >
          Every thumbnail is a real shader running on your GPU right now,
          not a screenshot. Click one and you land in the composer with
          the cards already loaded. Rip them apart and see what changes.
        </p>

        {/* filter chips */}
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Eyebrow style={{ marginRight: 6 }}>Filter</Eyebrow>
          <Chip
            label="all"
            active={mode === 'all'}
            onClick={() => setMode('all')}
            count={counts.total}
          />
          <Chip
            label="2d"
            active={mode === '2d'}
            onClick={() => setMode('2d')}
            count={counts.d2}
            color={SHADE.catShape}
          />
          <Chip
            label="3d"
            active={mode === '3d'}
            onClick={() => setMode('3d')}
            count={counts.d3}
            color={SHADE.catEffect}
          />
          <span
            aria-hidden
            style={{
              width: 1, height: 22, background: SHADE.border, margin: '0 4px',
            }}
          />
          <Chip
            label="featured"
            active={tax === 'featured'}
            onClick={() => setTax(tax === 'featured' ? 'all' : 'featured')}
            count={counts.featured}
            color={SHADE.goldDeep}
          />
          <Chip
            label="recent"
            active={tax === 'recent'}
            onClick={() => setTax(tax === 'recent' ? 'all' : 'recent')}
            count={counts.recent}
            color={SHADE.ember}
          />
        </div>
      </section>

      {/* grid */}
      <section style={{ maxWidth: 1280, margin: '0 auto' }}>
        {visible.length === 0 ? (
          <EmptyState
            onReset={() => { setMode('all'); setTax('all'); }}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: 22,
            }}
          >
            {visible.map((r, i) => (
              <div
                key={r.id}
                style={{
                  animation: `galFadeUp 360ms cubic-bezier(0.2,1,0.4,1) ${Math.min(i, 8) * 30}ms backwards`,
                }}
              >
                <RecipeTile curated={r} onOpen={() => openInComposer(r)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

const EmptyState = ({ onReset }: { onReset: () => void }) => (
  <div
    style={{
      padding: '64px 24px',
      textAlign: 'center',
      border: `1.5px dashed ${SHADE.border}`,
      borderRadius: 12,
      background: SHADE.surface2,
    }}
  >
    <h3
      style={{
        margin: 0,
        fontFamily: TYPE.display,
        fontWeight: 600,
        fontSize: 22,
        color: SHADE.text,
        letterSpacing: TYPE.trackTight,
      }}
    >
      Nothing matches those filters.
    </h3>
    <p
      style={{
        margin: '8px 0 18px',
        fontFamily: TYPE.body,
        fontSize: 14,
        color: SHADE.textDim,
      }}
    >
      Drop a filter and the recipes come back.
    </p>
    <button
      type="button"
      onClick={onReset}
      className="gal-cta"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 8,
        border: `1.5px solid ${SHADE.inkLine}`,
        background: SHADE.surface1,
        color: SHADE.text,
        cursor: 'pointer',
        fontFamily: TYPE.body,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: `0 2px 0 ${SHADE.inkLine}`,
      }}
    >
      Reset filters
    </button>
  </div>
);

const BackGlyph = () => (
  <svg
    width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
  >
    <path d="M19 12H5" />
    <path d="M11 19l-7-7 7-7" />
  </svg>
);

export default Gallery;
