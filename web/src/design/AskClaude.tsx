// Claude-translate client + inline status chip for the editable code drawer.
//
// The user edits the GLSL inline; on "Translate to cards" we POST the
// current GLSL + last-good Recipe to the Vite dev plugin (/__claude_ask),
// which shells out to the local `claude` CLI. Claude returns a Recipe-shaped
// JSON document; we validate it before applying it to the store.
//
// Hackathon-grade: no API keys, no production endpoint. The dev proxy is
// `vite.config.ts → claudeAskPlugin`.

import type { CSSProperties } from 'react';
import { SHADE, TYPE } from './tokens';
import type {
  BlendMode,
  Card,
  Recipe,
  Parameter,
  ParameterValue,
} from '@/cards';

const ENDPOINT = '/__claude_ask';

// ─── Public API ────────────────────────────────────────────────────────

/** Throws on parse/validation failure. Returns a Recipe ready for setRecipe. */
export async function translateGlslToRecipe(
  glsl: string,
  currentRecipe: Recipe,
): Promise<Recipe> {
  const prompt = buildTranslatePrompt(glsl, currentRecipe);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode: 'translate' }),
  });
  const raw = await res.text();
  let parsed: { result?: string; error?: string; stderr?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'Non-JSON response from /__claude_ask (HTTP ' + res.status + '): ' + raw.slice(0, 300),
    );
  }
  if (!res.ok) {
    const msg = parsed.error ?? 'HTTP ' + res.status;
    const extra = parsed.stderr ? ' — ' + parsed.stderr.split('\n')[0] : '';
    throw new Error(msg + extra);
  }
  const body = stripCodeFences(parsed.result ?? '').trim();
  if (body.length === 0) throw new Error('Claude returned an empty response.');
  let recipeJson: unknown;
  try {
    recipeJson = JSON.parse(body);
  } catch (e) {
    throw new Error('Claude did not return JSON: ' + String(e) + ' — got: ' + body.slice(0, 200));
  }
  const recipe = coerceRecipe(recipeJson);
  if (!recipe) throw new Error('Claude returned JSON that does not match the Recipe shape.');
  return recipe;
}

// ─── Inline status chip ────────────────────────────────────────────────

export type TranslateState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok' }
  | { kind: 'error'; message: string };

export const TranslateStatus = ({ state }: { state: TranslateState }) => {
  if (state.kind === 'idle') return null;
  const baseStyle: CSSProperties = {
    padding: '4px 9px',
    borderRadius: 3,
    font: `600 10.5px ${TYPE.bodyMono}`,
    letterSpacing: '0.06em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    maxWidth: 460,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  if (state.kind === 'loading') {
    return (
      <span data-testid="translate-status-loading" style={{
        ...baseStyle,
        background: 'rgba(252,180,39,0.18)',
        border: '1px solid rgba(252,180,39,0.55)',
        color: SHADE.gold,
      }}>
        translating…
      </span>
    );
  }
  if (state.kind === 'ok') {
    return (
      <span data-testid="translate-status-ok" style={{
        ...baseStyle,
        background: 'rgba(111,127,26,0.18)',
        border: '1px solid rgba(111,127,26,0.55)',
        color: '#c7d96b',
      }}>
        recipe applied
      </span>
    );
  }
  return (
    <span
      data-testid="translate-status-error"
      title={state.message}
      style={{
        ...baseStyle,
        background: 'rgba(181, 54, 94, 0.18)',
        border: '1px solid rgba(181, 54, 94, 0.55)',
        color: '#FFB7C5',
      }}
    >
      translate failed: {state.message}
    </span>
  );
};

// ─── Prompt template ───────────────────────────────────────────────────

// The set of known card types Claude can pick from. Trimmed to the most
// common / recognisable ones so the prompt stays under the 32KB cap and
// gives the model enough vocabulary to map most user shaders.
const KNOWN_CARD_TYPES = [
  // shapes / fields
  'sphere', 'ring', 'ripple', 'rectangle', 'rounded_box', 'triangle', 'star',
  'heart', 'hexagon', 'pentagon', 'capsule', 'ellipse', 'arc',
  'noise_field', 'fbm', 'voronoi_cells', 'worley_edges', 'plasma',
  'concentric_rings', 'spiral_arms', 'sunburst', 'sin_field', 'truchet',
  'radial_gradient', 'stripes', 'gradient_linear', 'gradient_conic',
  'four_gradient', 'triple_gradient',
  // colour
  'palette', 'palette_themed', 'cosine_palette', 'tint', 'hue_shift',
  'hue_cycle', 'duotone', 'tritone', 'split_tone', 'sepia', 'grayscale',
  'invert_d', 'saturate', 'rainbow_d',
  // distortion
  'mirror_x', 'mirror_y', 'mirror_domain', 'polar_warp', 'polar_repeat',
  'fisheye', 'twirl', 'swirl', 'wave_warp', 'noise_warp', 'domain_warp',
  'scale_uv', 'translate', 'skew', 'repeat', 'mirror_repeat', 'zoom_blur_uv',
  // effects
  'vignette', 'glow', 'fog', 'fog_exp', 'edge_detect', 'ascii', 'halftone',
  'sketch', 'exposure', 'contrast', 'gamma', 'vhs_glitch', 'mouse_glow',
  'mouse_paint_d', 'mouse_repel', 'chromatic_aberration', 'film_grain_color',
  'grain', 'bloom', 'dither', 'crt_curvature', 'pulse_brightness', 'pulse_hue',
  'portal',
] as const;

function buildTranslatePrompt(glsl: string, currentRecipe: Recipe): string {
  const recipeJson = JSON.stringify(currentRecipe, null, 2);
  return [
    'You are a code-to-data translator. Given a GLSL fragment shader produced by the',
    'Shaddy compiler, output a JSON Recipe that, when re-compiled, would produce',
    'equivalent output.',
    '',
    'The Shaddy Recipe schema:',
    '{ "mode": "2d" | "3d", "canvasAspect": "square" | "portrait" | "landscape",',
    '  "cards": [',
    '    { "kind": "typed", "id": "<auto>", "type": "<card-type>", "enabled": true,',
    '      "alpha": 1, "blendMode": "normal",',
    '      "params": { "<key>": { "value": <number|[r,g,b]>, "animation": null } } }',
    '    OR',
    '    { "kind": "wildcard", "id": "<auto>", "enabled": true, "alpha": 1,',
    '      "blendMode": "normal", "rawSource": "<raw GLSL block>",',
    '      "displayName": "..." }',
    '  ]',
    '}',
    '',
    'Known card types: ' + KNOWN_CARD_TYPES.join(', ') + '.',
    '',
    'For any GLSL block you can\'t confidently map to a known card, emit a',
    '"wildcard" card with the raw GLSL in rawSource. The compiler will emit it',
    'verbatim. Prefer wildcards over guessing wrong card types.',
    '',
    'Use "<auto>" as the id of every card — the host will replace these with',
    'fresh ids on apply.',
    '',
    'Current recipe (for reference; the user has edited the GLSL):',
    '<<<JSON',
    recipeJson,
    '>>>',
    '',
    'User\'s edited GLSL:',
    '<<<',
    glsl,
    '>>>',
    '',
    'Output ONLY valid JSON. No prose, no fences.',
  ].join('\n');
}

// Claude sometimes wraps output in ```json … ``` despite being asked not to.
function stripCodeFences(raw: string): string {
  let s = raw.trim();
  const leading = s.match(/^```[a-zA-Z0-9_-]*\s*\n/);
  if (leading) s = s.slice(leading[0].length);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trimEnd();
}

// ─── Validation / coercion ─────────────────────────────────────────────

const BLEND_SET = new Set<BlendMode>(['normal', 'add', 'multiply', 'screen', 'lighten', 'darken']);
const ASPECT_SET = new Set<Recipe['canvasAspect']>(['square', 'portrait', 'landscape']);

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function coerceParameterValue(raw: unknown): ParameterValue | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (Array.isArray(raw) && raw.length === 3 && raw.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return [raw[0] as number, raw[1] as number, raw[2] as number] as const;
  }
  return null;
}

function coerceParameter(raw: unknown): Parameter | null {
  if (!isRecord(raw)) return null;
  const v = coerceParameterValue(raw.value);
  if (v === null) return null;
  // We intentionally drop any animation field — PR #2's territory.
  return { value: v, animation: null };
}

function coerceCard(raw: unknown): Card | null {
  if (!isRecord(raw)) return null;
  const enabled = raw.enabled !== false; // default true
  const alpha = typeof raw.alpha === 'number' && Number.isFinite(raw.alpha)
    ? Math.max(0, Math.min(1, raw.alpha))
    : 1;
  const blendMode: BlendMode = typeof raw.blendMode === 'string' && BLEND_SET.has(raw.blendMode as BlendMode)
    ? raw.blendMode as BlendMode
    : 'normal';
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : '__placeholder__';
  if (raw.kind === 'wildcard') {
    const rawSource = typeof raw.rawSource === 'string' ? raw.rawSource : '';
    const displayName = typeof raw.displayName === 'string'
      ? raw.displayName
      : raw.displayName === null ? null : null;
    return { kind: 'wildcard', id, enabled, alpha, blendMode, rawSource, displayName };
  }
  if (raw.kind === 'typed') {
    if (typeof raw.type !== 'string' || raw.type.length === 0) return null;
    const params: Record<string, Parameter> = {};
    if (isRecord(raw.params)) {
      for (const [k, v] of Object.entries(raw.params)) {
        const p = coerceParameter(v);
        if (p) params[k] = p;
      }
    }
    return { kind: 'typed', id, type: raw.type, enabled, alpha, blendMode, params };
  }
  return null;
}

/** Validate + coerce an arbitrary JSON payload into a Recipe. Returns null
 *  if the shape is unrecoverable. Cards with unknown card types are kept
 *  as typed cards — the compiler's CARD_LIBRARY proxy falls back to a
 *  wildcard at render time, so downstream is forgiving. */
export function coerceRecipe(raw: unknown): Recipe | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.cards)) return null;
  const canvasAspect: Recipe['canvasAspect'] = typeof raw.canvasAspect === 'string' && ASPECT_SET.has(raw.canvasAspect as Recipe['canvasAspect'])
    ? raw.canvasAspect as Recipe['canvasAspect']
    : 'square';
  const mode: Recipe['mode'] = raw.mode === '3d' ? '3d' : '2d';
  const cards: Card[] = [];
  for (const c of raw.cards) {
    const card = coerceCard(c);
    if (card) cards.push(card);
  }
  // A recipe with zero cards is technically valid but useless — accept it
  // so an empty translation still reaches the user; they'll see the blank
  // canvas and know to re-translate.
  return { cards, canvasAspect, mode };
}
