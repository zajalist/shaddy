import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useCardsStore } from '@/cards';
import { BLOCK_LIB, CATEGORIES, SHADE, TYPE } from './tokens';
import type { BlockDef } from './tokens';
import { Icon, ShadeLogo } from './icons';
import { Starfield } from './Starfield';
import { PhotoToCardsPopover } from './PhotoToCards';

// ─── Text-only difference-blend toggle pill ───────────────────────────────
export const TogglePill = ({
  children, active = true, accent,
}: { children: ReactNode; active?: boolean; accent?: string }) => {
  const c = accent ?? '#fff';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        borderRadius: 4,
        border: `1px ${active ? 'solid' : 'dashed'} ${c}`,
        color: c,
        mixBlendMode: 'difference',
        font: `500 10.5px ${TYPE.bodyMono}`,
        letterSpacing: '0.04em',
        opacity: active ? 1 : 0.45,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {children}
    </span>
  );
};

// ─── Hayba-style top bar with starfield, centered nav, sign-in pill ──────
export const TopBar = () => {
  // Photo → Blocks popover state. Anchored against the topbar's right edge
  // (28px right gutter from the parent) and pinned just below the 60px
  // topbar height. Tracks its own open flag so we don't have to thread
  // props from DesktopApp/MobileApp.
  const photoBtnRef = useRef<HTMLButtonElement | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoAnchor, setPhotoAnchor] = useState<{ top: number; right: number }>({
    top: 64,
    right: 32,
  });
  const openPhoto = () => {
    const btn = photoBtnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      // Position the popover just under the topbar, right-aligned to the
      // button's right edge so it doesn't overflow the viewport.
      setPhotoAnchor({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setPhotoOpen(true);
  };
  return (
  <div
    style={{
      height: 60, flex: '0 0 auto',
      display: 'flex', alignItems: 'center',
      padding: '0 28px',
      borderBottom: `1px solid rgba(255,255,255,0.05)`,
      background: SHADE.topbar,
      color: SHADE.topbarText,
      gap: 22,
      font: `500 12.5px ${TYPE.body}`,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <Starfield opts={{ density: 0.22, leftBias: 1.8 }} />

    {/* logo (compact, Hayba style) — clickable, returns to / landing */}
    <a
      href="/"
      title="Back to landing"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'relative', zIndex: 1,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <ShadeLogo size={22} />
      <span
        style={{
          font: `700 14px ${TYPE.display}`,
          letterSpacing: '0.16em',
          color: SHADE.topbarText,
          textTransform: 'uppercase',
        }}
      >
        Shaddy
      </span>
    </a>

    {/* Tempo cluster removed — kept the topbar minimal until a real
        animation engine is wired up to BPM. */}

    {/* centered nav with hover-underline animation */}
    <nav
      style={{
        position: 'absolute', left: '50%', top: 0, bottom: 0,
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 4,
        zIndex: 1,
      }}
    >
      <NavLink href="/design" active>Compose</NavLink>
      <NavLink href="/library">Library</NavLink>
      <NavLink href="/learn">Learn</NavLink>
      <NavLink href="/gallery">Gallery</NavLink>
      <NavLink href="/docs">Docs</NavLink>
    </nav>

    {/* right cluster: icon-only tools + gold share + sign-in silhouette */}
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
      <TopbarIconBtn
        icon="tb-photo"
        title="Photo → blocks"
        onClick={openPhoto}
        buttonRef={photoBtnRef}
      />
      <TopbarIconBtn icon="tb-paste"  title="Paste GLSL" />
      <TopbarIconBtn icon="tb-share"  title="Share recipe" variant="gold" />
      <TopbarIconBtn icon="tb-signin" title="Sign in" as="a" href="#" />
    </div>
    {photoOpen && (
      <PhotoToCardsPopover
        anchor={photoAnchor}
        onClose={() => setPhotoOpen(false)}
      />
    )}
  </div>
  );
};

// Icon-only topbar button — 36px square, chunky cartoony icon centered.
// `variant="gold"` paints the gold-filled CTA pill used for SHARE.
// `as="a"` renders as an anchor (used by Sign in so it remains a link).
const TopbarIconBtn = ({
  icon, title, variant = 'outline', as = 'button', href, onClick, buttonRef,
}: {
  icon: string;
  title: string;
  variant?: 'outline' | 'gold';
  as?: 'button' | 'a';
  href?: string;
  onClick?: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}) => {
  const gold = variant === 'gold';
  const baseStyle: CSSProperties = {
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: gold ? SHADE.gold : 'transparent',
    border: gold ? `1px solid ${SHADE.goldDeep}` : '1px solid rgba(255,255,255,0.10)',
    borderRadius: 4,
    cursor: 'pointer',
    color: gold ? '#1a1208' : SHADE.topbarText,
    textDecoration: 'none',
    transition: 'background 0.15s, border-color 0.15s',
    padding: 0,
  };
  const iconColor = gold ? '#1a1208' : SHADE.topbarText;
  const iconCream = gold ? SHADE.cream : SHADE.topbarText;
  const child = <Icon name={icon} size={20} color={iconColor} cream={iconCream} />;
  if (as === 'a') {
    return (
      <a
        href={href ?? '#'}
        title={title}
        aria-label={title}
        style={baseStyle}
        onMouseEnter={(e) => {
          if (gold) return;
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
        }}
        onMouseLeave={(e) => {
          if (gold) return;
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
        }}
      >
        {child}
      </a>
    );
  }
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (gold) {
          e.currentTarget.style.background = SHADE.goldDeep;
          return;
        }
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
      }}
      onMouseLeave={(e) => {
        if (gold) {
          e.currentTarget.style.background = SHADE.gold;
          return;
        }
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
      }}
    >
      {child}
    </button>
  );
};

const NavLink = ({ children, active = false, href = '#' }: { children: ReactNode; active?: boolean; href?: string }) => (
  <a
    href={href}
    style={{
      position: 'relative',
      color: active ? SHADE.topbarText : SHADE.topbarDim,
      textDecoration: 'none',
      font: `500 12.5px ${TYPE.body}`,
      letterSpacing: '0.01em',
      padding: '20px 14px',
      transition: 'color 0.18s',
    }}
    onMouseEnter={(e) => ((e.currentTarget.firstElementChild as HTMLElement).style.transform = 'scaleX(1)')}
    onMouseLeave={(e) => ((e.currentTarget.firstElementChild as HTMLElement).style.transform = active ? 'scaleX(1)' : 'scaleX(0)')}
  >
    <span
      aria-hidden
      style={{
        position: 'absolute', left: 14, right: 14, bottom: 16,
        height: 1,
        background: SHADE.gold,
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'center',
        transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
        display: 'block',
      }}
    />
    {children}
  </a>
);

// ─── Palette item — flat, no glow ────────────────────────────────────────
const PaletteItem = ({ block }: { block: BlockDef }) => {
  const cat = CATEGORIES[block.cat];
  const insertTypedCard = useCardsStore((s) => s.insertTypedCard);
  const [hover, setHover] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => insertTypedCard(block.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          insertTypedCard(block.id);
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Add ${block.name}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 10px 8px 14px',
        borderRadius: 4,
        background: hover ? SHADE.surface3 : SHADE.surface1,
        border: `1px solid ${hover ? SHADE.borderHi : SHADE.border}`,
        cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'background 0.12s, border-color 0.12s',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: cat.color }} />
      <Icon name={block.icon} size={15} color={cat.color} />
      <span
        style={{
          font: `500 12px ${TYPE.body}`, color: SHADE.text,
          letterSpacing: '0.04em',
        }}
      >
        {block.name}
      </span>
      {hover && (
        <span
          style={{
            marginLeft: 'auto',
            font: `700 11px ${TYPE.body}`,
            color: SHADE.textDim,
          }}
        >
          +
        </span>
      )}
    </div>
  );
};

const PaletteCategoryHeader = ({
  cat, count, collapsed, onToggle,
}: {
  cat: (typeof CATEGORIES)[keyof typeof CATEGORIES];
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    style={{
      width: '100%',
      display: 'flex', alignItems: 'center', gap: 9,
      margin: '2px 6px 8px',
      padding: '7px 10px',
      background: `${cat.color}12`,
      border: `1px solid ${cat.color}38`,
      borderRadius: 4,
      font: `700 10.5px ${TYPE.body}`,
      color: cat.color,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      textAlign: 'left',
    }}
    aria-expanded={!collapsed}
  >
    <span
      style={{
        width: 20, height: 20, borderRadius: 3,
        background: cat.color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flex: '0 0 auto',
      }}
    >
      <Icon name={cat.icon} size={13} color="#fff" cream="#fff" />
    </span>
    <span>{cat.label}</span>
    <span style={{ marginLeft: 'auto', font: `500 10px ${TYPE.bodyMono}`, opacity: 0.7, letterSpacing: 0 }}>{count}</span>
    <span
      aria-hidden
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14,
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 160ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <Icon name="chevron" size={10} color={cat.color} />
    </span>
  </button>
);

const PaletteSubgroupHeader = ({ label, count }: { label: string; count: number }) => (
  <div
    style={{
      display: 'flex', alignItems: 'baseline', gap: 6,
      margin: '6px 8px 4px 8px',
      padding: '2px 0',
      font: `600 9.5px ${TYPE.bodyMono}`,
      color: SHADE.textFaint,
      letterSpacing: '0.18em', textTransform: 'uppercase',
    }}
  >
    <span>{label}</span>
    <span style={{ flex: 1, height: 1, background: SHADE.border, opacity: 0.6 }} />
    <span style={{ opacity: 0.7 }}>{count}</span>
  </div>
);

// ─── Sub-group taxonomy ──────────────────────────────────────────────────
// Derived from the comment groupings in cards/library/index.ts. The order
// here matches the visual rendering order inside each category. Cards not
// matched by any subgroup fall into "Other" at the bottom.
type SubgroupDef = { label: string; ids: readonly string[] };
const SUBGROUPS: Record<keyof typeof CATEGORIES, SubgroupDef[]> = {
  shape: [
    { label: 'Primitives', ids: [
      'radial_gradient', 'ring', 'square', 'rectangle', 'rounded_box', 'triangle',
      'pentagon', 'hexagon', 'star', 'heart', 'cross', 'arc', 'ellipse',
      'capsule', 'segment', 'trapezoid', 'parallelogram', 'vesica',
      'pie_slice', 'horseshoe',
    ] },
    { label: 'Patterns', ids: [
      'stripes', 'hex_grid', 'triangle_grid', 'diamond_grid', 'brick_wall', 'truchet',
    ] },
    { label: 'Noise', ids: [
      'noise_field', 'fbm', 'ridged', 'turbulence', 'domain_warp',
      'voronoi_cells', 'worley_edges',
    ] },
    { label: 'Math / Waves', ids: [
      'sin_field', 'plasma', 'interference', 'moire', 'caustics',
    ] },
    { label: 'Fractals', ids: [
      'julia', 'mandelbrot', 'mandelbulb_2d', 'burning_ship',
      'newton', 'sierpinski', 'orbit_trap_circle',
    ] },
    { label: 'Polar / Radial', ids: [
      'concentric_rings', 'sunburst', 'rose_curve', 'sector', 'spiral_arms',
    ] },
    { label: 'Gradients', ids: [
      'gradient_linear', 'gradient_conic',
    ] },
  ],
  distort: [
    { label: 'UV Transforms', ids: [
      'translate', 'scale_uv', 'mirror_x', 'mirror_y', 'skew',
      'polar_warp', 'fisheye', 'zoom_blur_uv',
    ] },
    { label: 'Domain Repetition', ids: [
      'repeat', 'polar_repeat', 'mirror_domain', 'mirror_repeat',
    ] },
    { label: 'Noise-driven', ids: [
      'swirl', 'twirl', 'noise_warp', 'wave_warp',
    ] },
    { label: 'Scalar Transforms', ids: [
      'ripple', 'threshold_d', 'invert_d', 'power_curve', 'bands', 'contour',
      'sin_wave_d', 'onion', 'antialiased_step', 'remap', 'cubic_smoothstep',
      'sigmoid_curve', 'smooth_min_d', 'smooth_min_to_circle', 'smooth_intersection',
    ] },
  ],
  color: [
    { label: 'Generic', ids: [
      'palette', 'triple_gradient', 'four_gradient', 'duotone',
      'cosine_palette', 'rainbow_d', 'hue_cycle', 'd_as_rgb',
      'solid_color', 'tritone', 'split_tone',
    ] },
    { label: 'Themed', ids: [
      'palette_themed',
    ] },
    { label: 'Adjustments', ids: [
      'hue_shift', 'saturate', 'grayscale', 'sepia',
    ] },
  ],
  effect: [
    { label: 'Lens / Atmospheric', ids: [
      'vignette', 'glow', 'bloom', 'god_rays', 'radial_blur_fake',
      'fog', 'fog_exp', 'sphere_ao', 'rim_light', 'chromatic_aberration',
    ] },
    { label: 'Lighting', ids: [
      'fresnel', 'blinn_phong', 'ambient_occlusion', 'soft_shadow',
    ] },
    { label: 'Tonal', ids: [
      'contrast', 'exposure', 'gamma', 'dim', 'tint',
    ] },
    { label: 'Tonemapping', ids: [
      'reinhard_tonemap', 'aces_tonemap', 'filmic_tonemap', 'linear_to_srgb',
    ] },
    { label: 'Stylize', ids: [
      'halftone', 'sketch', 'ascii', 'dither', 'edge_detect', 'overlay_noise',
    ] },
    { label: 'Texture / Noise', ids: [
      'grain', 'film_grain_color',
    ] },
    { label: 'Retro', ids: [
      'crt_curvature', 'vhs_glitch',
    ] },
    { label: 'Time-driven', ids: [
      'pulse_brightness', 'pulse_hue',
    ] },
    { label: 'Markers', ids: [
      'portal',
    ] },
  ],
};

// Resolve sub-group buckets for a given category from the live BLOCK_LIB,
// honoring SUBGROUPS order. Unknown ids land in "Other" so the palette is
// never lossy if the library grows.
function bucketize(cat: keyof typeof CATEGORIES, blocks: BlockDef[]): Array<{ label: string; blocks: BlockDef[] }> {
  const subs = SUBGROUPS[cat];
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const used = new Set<string>();
  const out: Array<{ label: string; blocks: BlockDef[] }> = [];
  for (const { label, ids } of subs) {
    const picks: BlockDef[] = [];
    for (const id of ids) {
      const b = byId.get(id);
      if (b) {
        picks.push(b);
        used.add(id);
      }
    }
    if (picks.length > 0) out.push({ label, blocks: picks });
  }
  const leftover = blocks.filter((b) => !used.has(b.id));
  if (leftover.length > 0) out.push({ label: 'Other', blocks: leftover });
  return out;
}

// Tiny fuzzy match: tokenize query on whitespace, then require each token
// to appear as a substring in order against the haystack. Returns a score
// (lower is better — earlier matches rank higher) or -1 for no match.
function fuzzyScore(haystack: string, tokens: string[]): number {
  let cursor = 0;
  let score = 0;
  for (const t of tokens) {
    const idx = haystack.indexOf(t, cursor);
    if (idx < 0) return -1;
    score += idx;       // earlier hits rank better
    cursor = idx + t.length;
  }
  return score;
}

// The REAL 3D cards — these contribute to the raymarched SDF scene when the
// recipe is in 3D mode. Inserting any of them auto-flips the recipe to 3D
// (see cards/state.ts.insertTypedCard).
const REAL_3D_IDS: readonly string[] = [
  'sphere_3d',
  'box_3d',
  'torus_3d',
  'ground_3d',
  'repeat_3d',
  'smooth_union_3d',
  'material_color_3d',
];

// Hybrid cards — existing 2D cards that already produce a 3D-looking result.
// Shown below the real cards on the 3D tab as "Hybrid (fake 3D)" — they're
// 2D under the hood so inserting them does NOT flip the recipe.
const HYBRID_3D_IDS: readonly string[] = [
  'mandelbulb_2d',
  'julia',
  'sphere_ao',
  'fresnel',
  'domain_warp',
  'rim_light',
];

type PaletteTab = '2d' | '3d';

// Single tab button — matches the topbar NavLink idiom (animated underline,
// dim → cream on active) but at a smaller size to fit the sidebar.
const PaletteTabButton = ({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      flex: 1,
      position: 'relative',
      padding: '11px 0 10px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: active ? SHADE.text : SHADE.textFaint,
      font: `700 11px ${TYPE.body}`,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      transition: 'color 0.18s, background 0.18s',
    }}
    onMouseEnter={(e) => {
      if (active) return;
      e.currentTarget.style.background = SHADE.surface1;
      e.currentTarget.style.color = SHADE.textDim;
    }}
    onMouseLeave={(e) => {
      if (active) return;
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = SHADE.textFaint;
    }}
    aria-pressed={active}
  >
    {label}
    <span
      aria-hidden
      style={{
        position: 'absolute', left: 10, right: 10, bottom: 0,
        height: 3,
        background: SHADE.gold,
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'center',
        transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1)',
        display: 'block',
        borderRadius: 1.5,
      }}
    />
  </button>
);

export const Palette = ({ width = 240 }: { width?: number }) => {
  const [tab, setTab] = useState<PaletteTab>('2d');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const tokens = useMemo(() => (q.length === 0 ? [] : q.split(/\s+/).filter(Boolean)), [q]);

  // Per-category collapse state — expanded by default so first-time users
  // see everything. Keyed by category id.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Active pool depends on the selected tab. 3D tab merges the REAL 3D card
  // set with the hybrid "looks 3D in 2D maths" set so search hits both, but
  // they're visually grouped under separate subgroup headers below.
  const blocksById = useMemo(() => new Map(BLOCK_LIB.map((b) => [b.id, b])), []);
  const real3dBlocks = useMemo(
    () => REAL_3D_IDS.map((id) => blocksById.get(id)).filter((b): b is BlockDef => b != null),
    [blocksById],
  );
  const hybrid3dBlocks = useMemo(
    () => HYBRID_3D_IDS.map((id) => blocksById.get(id)).filter((b): b is BlockDef => b != null),
    [blocksById],
  );
  const activeBlocks = useMemo(() => {
    if (tab === '2d') return BLOCK_LIB;
    return [...real3dBlocks, ...hybrid3dBlocks];
  }, [tab, real3dBlocks, hybrid3dBlocks]);

  // When searching, produce a flat ranked list against the active tab's pool.
  // When not, the 2D tab groups by category → subgroup as usual; the 3D tab
  // renders a single curated panel below.
  const ranked = useMemo(() => {
    if (tokens.length === 0) return null;
    const out: Array<{ block: BlockDef; score: number }> = [];
    for (const b of activeBlocks) {
      const hay = `${b.name.toLowerCase()} ${b.id.toLowerCase().replace(/_/g, ' ')}`;
      const s = fuzzyScore(hay, tokens);
      if (s >= 0) out.push({ block: b, score: s });
    }
    out.sort((a, b) => a.score - b.score);
    return out;
  }, [tokens, activeBlocks]);

  const grouped = useMemo(() => (
    (Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((k) => ({
      k,
      buckets: bucketize(k, BLOCK_LIB.filter((b) => b.cat === k)),
      count: BLOCK_LIB.filter((b) => b.cat === k).length,
    }))
  ), []);

  const resultCount = ranked?.length ?? 0;

  return (
    <div
      style={{
        width, flex: '0 0 auto',
        background: SHADE.bg,
        borderRight: `1px solid ${SHADE.border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top-level dimension tabs — sit above the search field, full width. */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${SHADE.border}`,
          background: SHADE.bg,
        }}
      >
        <PaletteTabButton label="2D" active={tab === '2d'} onClick={() => setTab('2d')} />
        <PaletteTabButton label="3D" active={tab === '3d'} onClick={() => setTab('3d')} />
      </div>

      <div style={{ padding: '14px 12px 10px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
            borderRadius: 4, padding: '8px 11px',
          }}
        >
          <Icon name="search" size={14} color={SHADE.textDim} />
          <input
            type="text" placeholder="search blocks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: SHADE.text,
              font: `500 12.5px ${TYPE.body}`,
              minWidth: 0,
            }}
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Clear"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: SHADE.textFaint, font: `500 9.5px ${TYPE.bodyMono}`,
                padding: '2px 4px',
              }}
            >
              ×
            </button>
          ) : (
            <span
              style={{
                font: `500 9.5px ${TYPE.bodyMono}`, color: SHADE.textFaint,
                padding: '2px 5px', border: `1px solid ${SHADE.border}`, borderRadius: 2,
              }}
            >
              ⌘K
            </span>
          )}
        </div>
        {query.length > 0 && (
          <div
            style={{
              marginTop: 6, padding: '0 2px',
              font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textDim,
              letterSpacing: '0.06em',
            }}
          >
            {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </div>
        )}
      </div>
      <div style={{ padding: '2px 8px 16px', overflowY: 'auto', flex: 1 }}>
        {/* Search-active flat ranked list */}
        {ranked != null && (
          ranked.length === 0 ? (
            <div
              style={{
                padding: '14px 12px',
                font: `400 12px ${TYPE.body}`, color: SHADE.textDim,
                textAlign: 'center',
              }}
            >
              No blocks match “{query}”.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
              {ranked.map(({ block }) => <PaletteItem key={block.id} block={block} />)}
            </div>
          )
        )}
        {/* 2D default hierarchical view — categories with subgroups */}
        {ranked == null && tab === '2d' && grouped.map(({ k, buckets, count }) => {
          const isCollapsed = collapsed[k] ?? false;
          return (
            <div key={k} style={{ marginBottom: 14 }}>
              <PaletteCategoryHeader
                cat={CATEGORIES[k]}
                count={count}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed((prev) => ({ ...prev, [k]: !(prev[k] ?? false) }))}
              />
              {!isCollapsed && buckets.map(({ label, blocks }) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <PaletteSubgroupHeader label={label} count={blocks.length} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
                    {blocks.map((b) => <PaletteItem key={b.id} block={b} />)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* 3D tab — real raymarched SDF cards on top, the existing 2D
            "looks 3D" cards still visible below for compatibility. */}
        {ranked == null && tab === '3d' && (
          <div style={{ padding: '4px 4px 0' }}>
            <div
              style={{
                margin: '4px 4px 10px',
                padding: '2px 0',
                font: `700 11px ${TYPE.body}`,
                color: SHADE.text,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              3D raymarching
            </div>
            <PaletteSubgroupHeader label="SDF scene cards" count={real3dBlocks.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
              {real3dBlocks.map((b) => <PaletteItem key={b.id} block={b} />)}
            </div>

            {hybrid3dBlocks.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <PaletteSubgroupHeader
                  label="Hybrid cards that fake 3D"
                  count={hybrid3dBlocks.length}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
                  {hybrid3dBlocks.map((b) => <PaletteItem key={b.id} block={b} />)}
                </div>
              </div>
            )}

            {/* Soft-info panel — quiet, not loud. */}
            <div
              style={{
                marginTop: 18,
                padding: '11px 12px',
                background: SHADE.surface1,
                border: `1px dashed ${SHADE.border}`,
                borderRadius: 4,
                color: SHADE.textDim,
                font: `500 11px ${TYPE.body}`,
                lineHeight: 1.45,
                letterSpacing: '0.01em',
              }}
            >
              <div
                style={{
                  font: `700 9.5px ${TYPE.bodyMono}`,
                  color: SHADE.textFaint,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Heads up
              </div>
              Inserting an SDF card auto-flips the recipe to 3D mode. Toggle back via
              the mode pill in the Properties panel.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Charismatic slider — chunky square handle + tick marks, no glow ────
export const PropertySlider = ({
  label, value, unit = '', animated = false, onChange,
}: {
  label: string; value: number; unit?: string; animated?: boolean;
  onChange?: (v: number) => void;
}) => {
  const [t, setT] = useState(value);
  useEffect(() => {
    if (!animated) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const dt = (performance.now() - start) / 1000;
      setT(0.5 + 0.4 * Math.sin(dt * 1.6));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  useEffect(() => { if (!animated) setT(value); }, [value, animated]);
  const v = animated ? t : value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span
          style={{
            font: `600 10.5px ${TYPE.body}`, color: SHADE.textDim,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}
        >
          {label}
          {animated && (
            <span style={{ marginLeft: 8, color: SHADE.ember, font: `500 9.5px ${TYPE.bodyMono}`, letterSpacing: '0.18em' }}>
              ANIM
            </span>
          )}
        </span>
        <span style={{ font: `500 12px ${TYPE.bodyMono}`, color: animated ? SHADE.ember : SHADE.text }}>
          {v.toFixed(3)}{unit}
        </span>
      </div>
      <SliderRail value={v} animated={animated} onChange={onChange} />
    </div>
  );
};

// The slider rail itself — extracted so blocks/mobile/editor share the look.
export const SliderRail = ({
  value, animated = false, onChange, height = 6,
}: { value: number; animated?: boolean; onChange?: (v: number) => void; height?: number }) => {
  const v = Math.max(0, Math.min(1, value));
  const handleSize = 16;
  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onChange(Math.max(0, Math.min(1, x)));
  };
  return (
    <div
      onPointerDown={onPointer}
      onPointerMove={(e) => (e.buttons & 1 ? onPointer(e) : undefined)}
      style={{
        position: 'relative', height: handleSize + 4,
        cursor: onChange ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* rail base */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0,
          top: (handleSize + 4 - height) / 2,
          height,
          background: SHADE.surface3,
          border: `1px solid ${SHADE.border}`,
          borderRadius: 1,
        }}
      />
      {/* tick marks at 0/25/50/75/100 */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <div
          key={p}
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `calc(${p * 100}% - 0.5px)`,
            width: 1, background: p === 0.5 ? SHADE.textDim : SHADE.border,
            opacity: p === 0 || p === 1 ? 0 : 0.55,
          }}
        />
      ))}
      {/* filled portion */}
      <div
        style={{
          position: 'absolute', left: 0,
          top: (handleSize + 4 - height) / 2,
          height,
          width: `${v * 100}%`,
          background: animated
            ? `repeating-linear-gradient(45deg, ${SHADE.ember} 0 4px, ${SHADE.goldDeep} 4px 8px)`
            : SHADE.inkLine,
          borderTopLeftRadius: 1, borderBottomLeftRadius: 1,
        }}
      />
      {/* chunky handle — square with rounded corners, no glow */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${v * 100}% - ${handleSize / 2}px)`,
          top: 2,
          width: handleSize, height: handleSize,
          background: SHADE.surface1,
          border: `1.5px solid ${animated ? SHADE.ember : SHADE.inkLine}`,
          borderRadius: 3,
        }}
      >
        {/* grip lines for tactile feel */}
        <span style={{ position: 'absolute', left: 4, right: 4, top: 5,  height: 1, background: SHADE.textDim, opacity: 0.6 }} />
        <span style={{ position: 'absolute', left: 4, right: 4, top: 8,  height: 1, background: SHADE.textDim, opacity: 0.6 }} />
        <span style={{ position: 'absolute', left: 4, right: 4, top: 11, height: 1, background: SHADE.textDim, opacity: 0.6 }} />
      </div>
    </div>
  );
};

export const PropSectionHeader = ({ title, right }: { title: string; right?: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 8px' }}>
    <span
      style={{
        font: `700 10.5px ${TYPE.body}`,
        color: SHADE.textDim,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}
    >
      {title}
    </span>
    {right}
  </div>
);

// ─── Workspace bg — graph-paper instead of dot grid for a hand-drawn feel ─
export const DotGridBg = () => (
  <div
    style={{
      position: 'absolute', inset: 0,
      background: `
        linear-gradient(${SHADE.border} 1px, transparent 1px),
        linear-gradient(90deg, ${SHADE.border} 1px, transparent 1px)
      `,
      backgroundSize: '32px 32px, 32px 32px',
      backgroundPosition: '-1px -1px, -1px -1px',
      opacity: 0.35,
      pointerEvents: 'none',
    }}
  />
);

export const CanvasToolBtn = ({ icon, title }: { icon: string; title: string }) => (
  <button
    title={title}
    style={{
      width: 28, height: 28, borderRadius: 3,
      background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
      color: SHADE.textDim, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <Icon name={icon} size={14} color={SHADE.textDim} />
  </button>
);

export const fullscreenBtnStyle: CSSProperties = {
  width: 24, height: 24, borderRadius: 3,
  border: `1px solid ${SHADE.border}`,
  background: 'transparent', color: SHADE.textDim, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
