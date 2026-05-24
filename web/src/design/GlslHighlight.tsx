// Tiny in-house GLSL syntax highlighter. Tokenizes via a regex sweep
// (comments → strings → numbers → identifiers → punctuation) and emits
// styled <span>s. Built so the code drawer stays a flat <pre> — no
// CodeMirror or runtime parser, ~3KB at most.
//
// Theme: cream-on-charcoal to match SHADE.surface4. Colour roles:
//   - comments  → muted warm grey, italic
//   - keywords  → gold (control flow + qualifiers)
//   - types     → soft blue (vec2/3/4, mat, sampler, float, int, bool, void)
//   - numbers   → ember
//   - preproc   → magenta (#version, #define, etc.)
//   - builtins  → cream-bold (sin, cos, mix, fract, …)
//   - punct     → cream
//
// Edit mode: when `editable` is true, the component renders a textarea
// overlaid on top of the highlighted <pre>. The textarea text is rendered
// transparent (caret-color cream) so the user sees the highlighted overlay
// while typing into the real input. They share the same font / line-height
// / padding so the two layers stay aligned glyph-for-glyph.

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { SHADE } from './tokens';

// Order matters: longer alternations before shorter ones to avoid prefix matches.
const TOKEN_RE = new RegExp(
  [
    String.raw`(?<comment>\/\/[^\n]*|\/\*[\s\S]*?\*\/)`,
    String.raw`(?<preproc>^[ \t]*#[^\n]*)`,
    String.raw`(?<string>"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`,
    String.raw`(?<number>\b\d+\.?\d*(?:e[+-]?\d+)?[fFu]?\b|\.\d+(?:e[+-]?\d+)?[fFu]?)`,
    String.raw`(?<ident>[A-Za-z_][A-Za-z0-9_]*)`,
    String.raw`(?<punct>[{}()\[\];,.+\-*\/%=<>!&|^~?:])`,
    String.raw`(?<ws>[ \t]+)`,
    String.raw`(?<nl>\n)`,
  ].join('|'),
  'gmy',
);

const KEYWORDS = new Set([
  'if','else','for','while','do','return','break','continue','discard','switch','case','default',
  'true','false',
  'uniform','attribute','varying','in','out','inout','const','precision','highp','mediump','lowp',
  'layout','location','flat','smooth','centroid','sample','noperspective','invariant',
]);

const TYPES = new Set([
  'void','bool','int','uint','float','double',
  'vec2','vec3','vec4','ivec2','ivec3','ivec4','uvec2','uvec3','uvec4','bvec2','bvec3','bvec4',
  'mat2','mat3','mat4','mat2x2','mat2x3','mat2x4','mat3x2','mat3x3','mat3x4','mat4x2','mat4x3','mat4x4',
  'sampler2D','samplerCube','sampler2DShadow','sampler3D','sampler2DArray',
  'struct',
]);

// A subset of the GLSL stdlib most users recognise. Not exhaustive — the
// rest fall through as plain identifiers which is fine.
const BUILTINS = new Set([
  'sin','cos','tan','asin','acos','atan','radians','degrees',
  'pow','exp','log','exp2','log2','sqrt','inversesqrt',
  'abs','sign','floor','ceil','round','fract','mod','min','max','clamp','mix','step','smoothstep',
  'length','distance','dot','cross','normalize','reflect','refract','faceforward',
  'matrixCompMult','transpose','inverse','determinant','outerProduct',
  'texture','texture2D','textureLod','textureGrad','texelFetch','textureSize',
  'dFdx','dFdy','fwidth','noise1','noise2','noise3',
  'main','gl_Position','gl_FragColor','gl_FragCoord','gl_PointCoord',
]);

// Khronos GLSL ES 3.0 reference pages — the closest official docs for our
// renderer (`#version 300 es`). Hovering a known identifier in the code
// drawer shows a one-line tooltip; click opens the spec page in a new tab.
const KHRONOS_BASE = 'https://registry.khronos.org/OpenGL-Refpages/es3.0/html/';
const DOCS: Record<string, string> = {
  // types
  vec2: 'Two-component floating-point vector.',
  vec3: 'Three-component floating-point vector (rgb, xyz).',
  vec4: 'Four-component floating-point vector (rgba, xyzw).',
  ivec2: 'Two-component integer vector.',
  ivec3: 'Three-component integer vector.',
  ivec4: 'Four-component integer vector.',
  mat2: '2×2 floating-point matrix.',
  mat3: '3×3 floating-point matrix.',
  mat4: '4×4 floating-point matrix.',
  sampler2D: 'Opaque type for 2D textures.',
  float: 'Single-precision floating-point scalar.',
  int: '32-bit signed integer scalar.',
  bool: 'Boolean scalar.',
  void: 'No return value / no arguments.',
  // keywords / qualifiers
  uniform: 'Read-only per-draw global, set from JS via setUniform().',
  in: 'Stage input (vertex attribute, or varying into the fragment stage).',
  out: 'Stage output (varying out / fragment output).',
  highp: 'High-precision qualifier (32-bit on most hardware).',
  precision: 'Default precision qualifier for the file.',
  discard: 'Abort the current fragment without writing to the framebuffer.',
  return: 'Exit a function with a value.',
  if: 'Conditional execution.',
  for: 'Bounded loop. GLSL ES requires a constant or constant-derived bound.',
  while: 'Loop while condition holds.',
  // builtins (one-liner + Khronos refpage)
  sin: 'Sine of x (radians).',
  cos: 'Cosine of x (radians).',
  tan: 'Tangent of x (radians).',
  atan: 'Arctangent. atan(y, x) returns full-range angle in [-π, π].',
  asin: 'Arcsine.',
  acos: 'Arccosine.',
  pow: 'pow(x, y) = x raised to the y. Undefined for x < 0.',
  exp: 'Natural exponential.',
  log: 'Natural log.',
  sqrt: 'Square root.',
  inversesqrt: '1 / sqrt(x). Often a single GPU instruction.',
  abs: 'Absolute value.',
  sign: 'Sign of x: -1, 0, or 1.',
  floor: 'Largest integer ≤ x.',
  ceil: 'Smallest integer ≥ x.',
  round: 'Round to nearest integer.',
  fract: 'Fractional part: x - floor(x).',
  mod: 'mod(x, y) = x - y · floor(x / y).',
  min: 'Per-component minimum.',
  max: 'Per-component maximum.',
  clamp: 'clamp(x, lo, hi) — clamp x to [lo, hi].',
  mix: 'mix(a, b, t) = a·(1-t) + b·t. Linear interpolation.',
  step: 'step(edge, x) = 0 if x<edge else 1.',
  smoothstep: 'smoothstep(e0, e1, x) — cubic hermite ramp between edges.',
  length: 'Vector length.',
  distance: 'Distance between two points.',
  dot: 'Dot product.',
  cross: 'Cross product (vec3).',
  normalize: 'Unit-length vector in the same direction.',
  reflect: 'Reflect I about normal N.',
  refract: 'Snell refraction.',
  texture: 'Sample a texture. texture(sampler, uv) → vec4.',
  dFdx: 'Screen-space derivative of x. Used for analytic filtering.',
  dFdy: 'Screen-space derivative of y.',
  fwidth: 'abs(dFdx(x)) + abs(dFdy(x)) — pixel-size estimate.',
  gl_FragCoord: 'Window-space pixel coords (with .5 offset to pixel centre).',
  gl_Position: 'Vertex output in clip space.',
  main: 'Shader entrypoint.',
};

function docHref(name: string): string | null {
  if (!(name in DOCS)) return null;
  // Map a few names that have different filenames on the refpages site.
  const alias: Record<string, string> = {
    inversesqrt: 'inversesqrt', // matches
    gl_FragCoord: 'gl_FragCoord',
    gl_Position: 'gl_Position',
    main: 'main',
  };
  return `${KHRONOS_BASE}${alias[name] ?? name}.xhtml`;
}

type SpanRecord = { text: string; color: string; italic?: boolean; bold?: boolean; doc?: string; href?: string };

function tokenize(src: string): SpanRecord[] {
  const out: SpanRecord[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  let lastIndex = 0;
  while ((m = TOKEN_RE.exec(src)) !== null) {
    // `y` flag: if a position has no match, lastIndex didn't advance — bail.
    if (m.index < lastIndex) break;
    lastIndex = TOKEN_RE.lastIndex;
    const g = m.groups ?? {};
    const text = m[0];
    if (g.comment) {
      out.push({ text, color: '#8a8377', italic: true });
    } else if (g.preproc) {
      out.push({ text, color: '#d57bb5' });
    } else if (g.string) {
      out.push({ text, color: '#c5e0a0' });
    } else if (g.number) {
      out.push({ text, color: SHADE.ember });
    } else if (g.ident) {
      const doc = DOCS[text];
      const href = docHref(text) ?? undefined;
      if (KEYWORDS.has(text)) out.push({ text, color: SHADE.gold, doc, href });
      else if (TYPES.has(text)) out.push({ text, color: '#7fb3d5', doc, href });
      else if (BUILTINS.has(text)) out.push({ text, color: SHADE.cream, bold: true, doc, href });
      else if (/^u_[A-Za-z0-9_]+$/.test(text)) out.push({ text, color: '#e6c98f', doc: 'Card uniform — value set per frame from a TypedCard parameter.' });
      else out.push({ text, color: SHADE.cream });
    } else {
      // punct, ws, nl
      out.push({ text, color: SHADE.cream });
    }
  }
  // Pick up any trailing untokenized text (shouldn't happen with the catch-all
  // groups above, but defensive).
  if (lastIndex < src.length) {
    out.push({ text: src.slice(lastIndex), color: SHADE.cream });
  }
  return out;
}

export type GlslHighlightProps = {
  source: string;
  /** When true, render an overlaid textarea so the user can edit `source`.
   *  The highlighted layer becomes the visual feedback; the textarea drives
   *  text input + caret. Requires onSourceChange. */
  editable?: boolean;
  /** Called when the textarea text changes. Ignored in read-only mode. */
  onSourceChange?: (next: string) => void;
};

export const GlslHighlight = ({ source, editable, onSourceChange }: GlslHighlightProps) => {
  const tokens = useMemo(() => tokenize(source), [source]);
  const highlighted = (
    <>
      {tokens.map((t, i) => {
        const baseStyle = {
          color: t.color,
          fontStyle: t.italic ? 'italic' : undefined,
          fontWeight: t.bold ? 600 : undefined,
        };
        // Identifiers with a known doc render as <a> with a tooltip that
        // hover-shows the description; clicking opens the Khronos spec page.
        // In edit mode we can't have anchor tags (they'd swallow clicks meant
        // for the textarea overlay) so drop the tooltip wrapping there.
        if (!editable && t.doc && t.href) {
          return (
            <a
              key={i}
              href={t.href}
              target="_blank"
              rel="noreferrer noopener"
              title={`${t.text} — ${t.doc}\nClick to open Khronos GLSL ES reference.`}
              style={{
                ...baseStyle,
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: 'rgba(254,231,199,0.3)',
                textUnderlineOffset: 3,
                cursor: 'help',
              }}
            >
              {t.text}
            </a>
          );
        }
        if (!editable && t.doc) {
          return (
            <span key={i} title={t.doc} style={{ ...baseStyle, cursor: 'help' }}>
              {t.text}
            </span>
          );
        }
        return <span key={i} style={baseStyle}>{t.text}</span>;
      })}
    </>
  );

  if (!editable) {
    return highlighted;
  }

  // Edit mode: wrap the highlighted <pre> in a relative positioner with an
  // overlaid <textarea>. Both share font, line-height, padding, and
  // white-space so each glyph the user types sits directly under the
  // matching coloured span in the highlight overlay.
  //
  // The textarea is `position: absolute; inset: 0` with `color: transparent`
  // and `caretColor: cream`. Its background is also transparent so the
  // highlight bleeds through. `whiteSpace: pre` + `overflow: hidden`
  // matches the parent <pre> behaviour exactly.
  const sharedTextStyle: CSSProperties = {
    margin: 0,
    padding: 0,
    font: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    tabSize: 2,
    whiteSpace: 'pre',
    wordBreak: 'normal',
    overflowWrap: 'normal',
  };
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <span aria-hidden style={{ ...sharedTextStyle, display: 'block', pointerEvents: 'none' }}>
        {highlighted}
        {/* Trailing newline ensures the highlight overlay extends one line
            below the last user line, matching textarea behaviour. */}
        {'\n'}
      </span>
      <textarea
        value={source}
        onChange={(e) => onSourceChange?.(e.target.value)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        data-testid="glsl-editor-textarea"
        style={{
          ...sharedTextStyle,
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          color: 'transparent',
          caretColor: SHADE.cream,
          // Selection bleeds through as a translucent gold band so the
          // user can see what they're highlighting against the coloured
          // tokens below.
          // (browser-default selection colour usually looks fine, this
          // is the same visual as a regular textarea.)
        }}
      />
    </span>
  );
};
