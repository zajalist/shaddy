import type { ReactNode } from 'react';
import { SHADE, TYPE } from './tokens';
import { Icon } from './icons';
import { IconV2 } from './iconsV2';

// Dev-only gallery to approve the icon-language v2 direction. Shows each core
// icon OLD vs NEW, plus a NEW size ramp (15/20/32), on the warm composer palette
// and on the dark topbar surface where relevant. Route: /icons

type Item = { name: string; label: string; color: string; cream?: string; dark?: boolean };

const CAT = SHADE.catShape;
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Category',
    items: [
      { name: 'cat-shape', label: 'shapes', color: SHADE.catShape },
      { name: 'cat-distort', label: 'distortions', color: SHADE.catDistort },
      { name: 'cat-color', label: 'colors', color: SHADE.catColor },
      { name: 'cat-effect', label: 'effects', color: SHADE.catEffect },
    ],
  },
  {
    title: 'UI',
    items: [
      { name: 'search', label: 'search', color: SHADE.textDim },
      { name: 'plus', label: 'plus', color: SHADE.textDim },
      { name: 'close', label: 'close', color: SHADE.textDim },
      { name: 'chevron', label: 'chevron', color: SHADE.textDim },
      { name: 'play', label: 'play', color: SHADE.textDim },
      { name: 'trash', label: 'trash', color: '#8a2222' },
      { name: 'code', label: 'code', color: SHADE.goldDeep },
      { name: 'share', label: 'share', color: SHADE.textDim },
      { name: 'record', label: 'record', color: SHADE.ember },
      { name: 'camera', label: 'camera', color: SHADE.textDim },
      { name: 'dots', label: 'dots', color: SHADE.textDim },
      { name: 'menu', label: 'menu', color: SHADE.textDim },
      { name: 'lock', label: 'lock', color: SHADE.textDim },
      { name: 'sparkle', label: 'sparkle', color: SHADE.goldDeep },
    ],
  },
  {
    title: 'Topbar (on dark)',
    items: [
      { name: 'tb-photo', label: 'photo → blocks', color: SHADE.cream, cream: SHADE.gold, dark: true },
      { name: 'tb-paste', label: 'paste GLSL', color: SHADE.cream, cream: SHADE.gold, dark: true },
      { name: 'tb-share', label: 'share', color: SHADE.cream, cream: SHADE.gold, dark: true },
      { name: 'tb-signin', label: 'sign in', color: SHADE.cream, cream: SHADE.topbar, dark: true },
    ],
  },
  {
    title: 'Special',
    items: [
      { name: 'ai-spark', label: 'ask claude', color: SHADE.catEffect },
      { name: 'composer-blocks', label: 'composer', color: SHADE.gold },
    ],
  },
  {
    title: 'Shapes / primitives',
    items: [
      { name: 'card-square', label: 'square', color: CAT },
      { name: 'card-rectangle', label: 'rectangle', color: CAT },
      { name: 'card-triangle', label: 'triangle', color: CAT },
      { name: 'card-hexagon', label: 'hexagon', color: CAT },
      { name: 'card-star', label: 'star', color: CAT },
      { name: 'card-heart', label: 'heart', color: CAT },
      { name: 'card-cross', label: 'cross', color: CAT },
      { name: 'card-arc', label: 'arc', color: CAT },
    ],
  },
  {
    title: 'Shapes — primitives (batch 2)',
    items: [
      { name: 'card-radial-gradient', label: 'radial gradient', color: CAT },
      { name: 'card-ring', label: 'ring', color: CAT },
      { name: 'card-rounded-box', label: 'rounded box', color: CAT },
      { name: 'card-pentagon', label: 'pentagon', color: CAT },
      { name: 'card-ellipse', label: 'ellipse', color: CAT },
      { name: 'card-capsule', label: 'capsule', color: CAT },
      { name: 'card-segment', label: 'segment', color: CAT },
      { name: 'card-trapezoid', label: 'trapezoid', color: CAT },
      { name: 'card-parallelogram', label: 'parallelogram', color: CAT },
      { name: 'card-vesica', label: 'vesica', color: CAT },
      { name: 'card-pie-slice', label: 'pie slice', color: CAT },
      { name: 'card-horseshoe', label: 'horseshoe', color: CAT },
    ],
  },
  {
    title: 'Card batch 3 — patterns + polar/radial',
    items: [
      { name: 'card-truchet', label: 'truchet', color: CAT },
      { name: 'card-truchet-tris', label: 'truchet tris', color: CAT },
      { name: 'card-triangular-tiles', label: 'triangular tiles', color: CAT },
      { name: 'card-random-squares', label: 'random squares', color: CAT },
      { name: 'card-cross-hatch', label: 'cross hatch', color: CAT },
      { name: 'card-wavy-stripes', label: 'wavy stripes', color: CAT },
      { name: 'card-polar-grid', label: 'polar grid', color: CAT },
      { name: 'card-stripes', label: 'stripes', color: CAT },
      { name: 'card-metaballs', label: 'metaballs', color: CAT },
      { name: 'card-rose-curve', label: 'rose curve', color: SHADE.catColor },
      { name: 'card-rose-petals', label: 'rose petals', color: SHADE.catColor },
      { name: 'card-cardioid-shape', label: 'cardioid', color: SHADE.catDistort },
      { name: 'card-lemniscate', label: 'lemniscate', color: SHADE.catDistort },
      { name: 'card-spiral-arms', label: 'spiral arms', color: SHADE.catColor },
      { name: 'card-sector', label: 'sector', color: CAT },
    ],
  },
  {
    title: 'Card batch 4 — noise / math / fractals',
    items: [
      { name: 'card-fbm', label: 'fbm', color: CAT },
      { name: 'card-ridged', label: 'ridged', color: CAT },
      { name: 'card-turbulence', label: 'turbulence', color: SHADE.catDistort },
      { name: 'card-domain-warp', label: 'domain warp', color: SHADE.catDistort },
      { name: 'card-voronoi-cells', label: 'voronoi', color: CAT },
      { name: 'card-worley-edges', label: 'worley edges', color: CAT },
      { name: 'card-noise-field', label: 'noise field', color: CAT },
      { name: 'card-sin-field', label: 'sin field', color: CAT },
      { name: 'card-plasma', label: 'plasma', color: CAT },
      { name: 'card-interference', label: 'interference', color: CAT },
      { name: 'card-moire', label: 'moiré', color: CAT },
      { name: 'card-caustics', label: 'caustics', color: CAT },
      { name: 'card-julia', label: 'julia', color: SHADE.catEffect },
      { name: 'card-mandelbrot', label: 'mandelbrot', color: SHADE.catEffect },
      { name: 'card-mandelbulb-2d', label: 'mandelbulb', color: SHADE.catEffect },
      { name: 'card-burning-ship', label: 'burning ship', color: SHADE.catEffect },
      { name: 'card-newton', label: 'newton', color: SHADE.catEffect },
      { name: 'card-sierpinski', label: 'sierpinski', color: SHADE.catEffect },
      { name: 'card-orbit-trap-circle', label: 'orbit trap', color: SHADE.catEffect },
    ],
  },
  {
    title: 'Card batch 5a — UV-transform distortions',
    items: [
      { name: 'card-translate', label: 'translate', color: SHADE.catDistort },
      { name: 'card-scale-uv', label: 'scale', color: SHADE.catDistort },
      { name: 'card-mirror-x', label: 'mirror x', color: SHADE.catDistort },
      { name: 'card-mirror-y', label: 'mirror y', color: SHADE.catDistort },
      { name: 'card-skew', label: 'skew', color: SHADE.catDistort },
      { name: 'card-swirl', label: 'swirl', color: SHADE.catDistort },
      { name: 'card-fisheye', label: 'fisheye', color: SHADE.catDistort },
      { name: 'card-polar-warp', label: 'polar warp', color: SHADE.catDistort },
    ],
  },
  {
    title: 'Card batch 5b — scalar transforms / remap',
    items: [
      { name: 'card-threshold-d', label: 'threshold', color: SHADE.catDistort },
      { name: 'card-bands', label: 'bands', color: SHADE.catDistort },
      { name: 'card-invert-d', label: 'invert', color: SHADE.catDistort },
      { name: 'card-onion', label: 'onion', color: SHADE.catDistort },
      { name: 'card-contour', label: 'contour', color: SHADE.catDistort },
      { name: 'card-remap', label: 'remap', color: SHADE.catDistort },
      { name: 'card-power-curve', label: 'power curve', color: SHADE.catDistort },
      { name: 'card-cubic-smoothstep', label: 'smoothstep', color: SHADE.catDistort },
      { name: 'card-ripple', label: 'ripple', color: SHADE.catDistort },
      { name: 'card-polar-repeat', label: 'polar repeat', color: SHADE.catDistort },
    ],
  },
  {
    title: 'Card batch 5c — distortion stragglers',
    items: [
      { name: 'card-twirl', label: 'twirl', color: SHADE.catDistort },
      { name: 'card-noise-warp', label: 'noise warp', color: SHADE.catDistort },
      { name: 'card-wave-warp', label: 'wave warp', color: SHADE.catDistort },
      { name: 'card-mirror-domain', label: 'mirror domain', color: SHADE.catDistort },
      { name: 'card-mirror-repeat', label: 'mirror repeat', color: SHADE.catDistort },
      { name: 'card-zoom-blur-uv', label: 'zoom blur', color: SHADE.catDistort },
      { name: 'card-sin-wave-d', label: 'sin wave', color: SHADE.catDistort },
      { name: 'card-antialiased-step', label: 'aa step', color: SHADE.catDistort },
      { name: 'card-sigmoid-curve', label: 'sigmoid', color: SHADE.catDistort },
      { name: 'card-smooth-min-d', label: 'smooth min', color: SHADE.catDistort },
      { name: 'card-smooth-min-to-circle', label: 'smin→circle', color: SHADE.catDistort },
      { name: 'card-smooth-intersection', label: 'smooth ∩', color: SHADE.catDistort },
    ],
  },
  {
    title: 'Card batch 6 — colors',
    items: [
      { name: 'card-solid-color', label: 'solid', color: SHADE.catColor },
      { name: 'card-palette', label: 'palette', color: SHADE.catColor },
      { name: 'card-cosine-palette', label: 'cosine palette', color: SHADE.catColor },
      { name: 'card-triple-gradient', label: 'triple grad', color: SHADE.catColor },
      { name: 'card-palette-themed', label: 'themed', color: SHADE.catColor },
      { name: 'card-duotone', label: 'duotone', color: SHADE.catColor },
      { name: 'card-split-tone', label: 'split tone', color: SHADE.catColor },
      { name: 'card-tritone', label: 'tritone', color: SHADE.catColor },
      { name: 'card-four-gradient', label: 'four grad', color: SHADE.catColor },
      { name: 'card-grayscale', label: 'grayscale', color: SHADE.catColor },
      { name: 'card-sepia', label: 'sepia', color: SHADE.catColor },
      { name: 'card-saturate', label: 'saturate', color: SHADE.catColor },
      { name: 'card-hue-shift', label: 'hue shift', color: SHADE.catColor },
      { name: 'card-hue-cycle', label: 'hue cycle', color: SHADE.catColor },
      { name: 'card-rainbow-d', label: 'rainbow', color: SHADE.catColor },
      { name: 'card-d-as-rgb', label: 'd as rgb', color: SHADE.catColor },
      { name: 'card-material-color-3d', label: 'material 3d', color: SHADE.catColor },
    ],
  },
  {
    title: 'Card batch 7 — effects',
    items: [
      { name: 'card-aces-tonemap', label: 'aces tonemap', color: SHADE.catEffect },
      { name: 'card-filmic-tonemap', label: 'filmic tonemap', color: SHADE.catEffect },
      { name: 'card-reinhard-tonemap', label: 'reinhard tonemap', color: SHADE.catEffect },
      { name: 'card-exposure', label: 'exposure', color: SHADE.catEffect },
      { name: 'card-gamma', label: 'gamma', color: SHADE.catEffect },
      { name: 'card-linear-to-srgb', label: 'linear to srgb', color: SHADE.catEffect },
      { name: 'card-contrast', label: 'contrast', color: SHADE.catEffect },
      { name: 'card-dim', label: 'dim', color: SHADE.catEffect },
      { name: 'card-bloom', label: 'bloom', color: SHADE.catEffect },
      { name: 'card-glow', label: 'glow', color: SHADE.catEffect },
      { name: 'card-god-rays', label: 'god rays', color: SHADE.catEffect },
      { name: 'card-radial-blur-fake', label: 'radial wash', color: SHADE.catEffect },
      { name: 'card-mouse-glow', label: 'mouse glow', color: SHADE.catEffect },
      { name: 'card-blinn-phong', label: 'blinn phong', color: SHADE.catEffect },
      { name: 'card-rim-light', label: 'rim light', color: SHADE.catEffect },
      { name: 'card-fresnel', label: 'fresnel', color: SHADE.catEffect },
      { name: 'card-ambient-occlusion', label: 'ambient occlusion', color: SHADE.catEffect },
      { name: 'card-sphere-ao', label: 'sphere ao', color: SHADE.catEffect },
      { name: 'card-soft-shadow', label: 'soft shadow', color: SHADE.catEffect },
      { name: 'card-grain', label: 'grain', color: SHADE.catEffect },
      { name: 'card-film-grain-color', label: 'film grain color', color: SHADE.catEffect },
      { name: 'card-overlay-noise', label: 'overlay noise', color: SHADE.catEffect },
      { name: 'card-dither', label: 'dither', color: SHADE.catEffect },
      { name: 'card-halftone', label: 'halftone', color: SHADE.catEffect },
      { name: 'card-ascii', label: 'ascii', color: SHADE.catEffect },
      { name: 'card-sketch', label: 'sketch', color: SHADE.catEffect },
      { name: 'card-edge-detect', label: 'edge detect', color: SHADE.catEffect },
      { name: 'card-crt-curvature', label: 'crt curvature', color: SHADE.catEffect },
      { name: 'card-vhs-glitch', label: 'vhs glitch', color: SHADE.catEffect },
      { name: 'card-chromatic-aberration', label: 'chromatic aberration', color: SHADE.catEffect },
      { name: 'card-fog', label: 'fog', color: SHADE.catEffect },
      { name: 'card-fog-exp', label: 'fog exp', color: SHADE.catEffect },
      { name: 'card-vignette', label: 'vignette', color: SHADE.catEffect },
      { name: 'card-tint', label: 'tint', color: SHADE.catEffect },
      { name: 'card-pulse-brightness', label: 'pulse brightness', color: SHADE.catEffect },
      { name: 'card-pulse-hue', label: 'pulse hue', color: SHADE.catEffect },
      { name: 'card-feedback-decay', label: 'feedback decay', color: SHADE.catEffect },
      { name: 'card-portal', label: 'portal', color: SHADE.catEffect },
    ],
  },
  {
    title: 'Card batch 8 — 3D / gradients / media / mouse / Islamic',
    items: [
      { name: 'card-box-3d', label: 'box 3d', color: CAT },
      { name: 'card-sphere-3d', label: 'sphere 3d', color: CAT },
      { name: 'card-torus-3d', label: 'torus 3d', color: CAT },
      { name: 'card-ground-3d', label: 'ground 3d', color: CAT },
      { name: 'card-repeat-3d', label: 'repeat 3d', color: SHADE.catDistort },
      { name: 'card-smooth-union-3d', label: 'smooth union 3d', color: SHADE.catDistort },
      { name: 'card-gradient-linear', label: 'gradient linear', color: CAT },
      { name: 'card-gradient-conic', label: 'gradient conic', color: CAT },
      { name: 'card-image-input', label: 'image input', color: CAT },
      { name: 'card-webcam-input', label: 'webcam input', color: CAT },
      { name: 'card-sample-buffer-a', label: 'buffer A', color: CAT },
      { name: 'card-sample-buffer-b', label: 'buffer B', color: CAT },
      { name: 'card-sample-buffer-c', label: 'buffer C', color: CAT },
      { name: 'card-sample-buffer-d', label: 'buffer D', color: CAT },
      { name: 'card-mouse-paint-d', label: 'mouse paint', color: SHADE.catDistort },
      { name: 'card-mouse-repel', label: 'mouse repel', color: SHADE.catDistort },
      { name: 'card-islamic-6pt-star', label: 'islamic 6pt', color: CAT },
      { name: 'card-islamic-8pt-star', label: 'islamic 8pt', color: CAT },
      { name: 'card-islamic-12pt-rosette', label: 'islamic 12pt', color: CAT },
      { name: 'card-arabesque-curls', label: 'arabesque', color: CAT },
      { name: 'card-kufic-grid', label: 'kufic grid', color: CAT },
      { name: 'card-zellige-grid', label: 'zellige grid', color: CAT },
    ],
  },
  {
    title: 'Patterns (were mush at 15px)',
    items: [
      { name: 'b-ripple', label: 'ripple', color: SHADE.catDistort },
      { name: 'b-grid', label: 'grid', color: SHADE.catShape },
    ],
  },
  {
    title: 'Card batch 1 — patterns & repeat (grids = shape + repeat now)',
    items: [
      { name: 'card-repeat', label: 'repeat (tile)', color: SHADE.catDistort },
      { name: 'card-concentric', label: 'concentric', color: CAT },
      { name: 'card-sunburst', label: 'sunburst', color: SHADE.catColor },
      { name: 'card-radial-stripes', label: 'radial stripes', color: SHADE.catColor },
      { name: 'card-brick-wall', label: 'brick wall', color: CAT },
      { name: 'card-triangle-grid', label: 'triangle grid', color: CAT },
      { name: 'card-hex-grid', label: 'hex grid', color: CAT },
    ],
  },
];

const Tile = ({ children, color, dark }: { children: ReactNode; color: string; dark?: boolean }) => (
  <div
    style={{
      width: 34, height: 34, borderRadius: 9,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: dark ? SHADE.topbar : `${color}1f`,
      border: `1px solid ${dark ? SHADE.topbarBorder : `${color}44`}`,
    }}
  >
    {children}
  </div>
);

const Cell = ({ item }: { item: Item }) => {
  const cream = item.cream ?? SHADE.cream;
  return (
    <div
      style={{
        background: SHADE.surface1,
        border: `1px solid ${SHADE.border}`,
        borderRadius: 10,
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ font: `600 11px ${TYPE.body}`, color: SHADE.text, letterSpacing: '0.02em' }}>
        {item.label}
        <span style={{ font: `500 9.5px ${TYPE.bodyMono}`, color: SHADE.textFaint, marginLeft: 8 }}>{item.name}</span>
      </div>
      {/* old vs new at 20 */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <Tile color={item.color} dark={item.dark}>
            <Icon name={item.name} size={20} color={item.color} cream={cream} legacy />
          </Tile>
          <span style={{ font: `500 8.5px ${TYPE.bodyMono}`, color: SHADE.textFaint, letterSpacing: '0.1em' }}>OLD</span>
        </div>
        <span style={{ color: SHADE.textFaint, font: `400 14px ${TYPE.body}` }}>→</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <Tile color={item.color} dark={item.dark}>
            <IconV2 name={item.name} size={20} color={item.color} cream={cream} />
          </Tile>
          <span style={{ font: `600 8.5px ${TYPE.bodyMono}`, color: SHADE.goldDeep, letterSpacing: '0.1em' }}>NEW</span>
        </div>
      </div>
      {/* new size ramp — must read at 15 */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', paddingTop: 4, borderTop: `1px dashed ${SHADE.border}` }}>
        {[15, 20, 32].map((s) => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <IconV2 name={item.name} size={s} color={item.color} cream={cream} />
            <span style={{ font: `500 8px ${TYPE.bodyMono}`, color: SHADE.textFaint }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const IconGallery = () => (
  <div style={{ minHeight: '100vh', background: SHADE.bg, color: SHADE.text, padding: '40px clamp(20px, 5vw, 64px) 80px', font: `400 14px ${TYPE.body}` }}>
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{ font: `600 28px ${TYPE.display}`, letterSpacing: TYPE.trackTight, margin: '0 0 4px' }}>Icon language v2 — core set</h1>
      <p style={{ color: SHADE.textDim, margin: '0 0 32px', maxWidth: 560, lineHeight: 1.5 }}>
        Bold flat/duotone: one strong silhouette in the category color + a single cream accent + a uniform subtle ink edge.
        Old vs new at 20px, then the new glyph at 15 / 20 / 32. The 15px column is the legibility test.
      </p>
      {GROUPS.map((g) => (
        <section key={g.title} style={{ marginBottom: 40 }}>
          <h2
            style={{
              font: `700 11px ${TYPE.bodyMono}`, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: SHADE.textDim, margin: '0 0 16px', borderBottom: `1px solid ${SHADE.border}`, paddingBottom: 8,
            }}
          >
            {g.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {g.items.map((item) => (
              <Cell key={`${g.title}-${item.name}`} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export default IconGallery;
