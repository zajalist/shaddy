// Photo → Cards — small popover for the "Photo" topbar button.
//
// Flow:
//   1. User picks a PNG/JPG via the file input.
//   2. Image is decoded into a 256×256 <canvas> (down-sampled for speed and
//      so the Vite plugin's payload cap is never an issue).
//   3. The base64 PNG of that canvas is POSTed to /__claude_ask with
//      { mode: 'image-to-recipe', imageBase64, currentRecipe } — the plugin
//      writes it to a temp file and feeds Claude with the @file reference.
//   4. The Claude response is parsed via coerceRecipe (shared with
//      AskClaude.tsx) and applied with setRecipe.
//
// Hackathon-grade UI: dropdown anchored to its trigger, no portal.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  cloneRecipeWithFreshIds,
  useCardsStore,
  type Recipe,
} from '@/cards';

import { SHADE, TYPE } from './tokens';
import { coerceRecipe } from './AskClaude';

const ENDPOINT = '/__claude_ask';
const THUMB_SIZE = 256;

// Trimmed card vocabulary the vision prompt suggests Claude pick from.
// Same idea as KNOWN_CARD_TYPES in AskClaude.tsx but tilted toward the
// kinds of cards that approximate a photo's mood (palettes, gradients,
// noise fields, atmospheric effects).
const VISION_CARD_TYPES = [
  'radial_gradient', 'gradient_linear', 'gradient_conic', 'four_gradient',
  'triple_gradient', 'palette', 'palette_themed', 'cosine_palette',
  'duotone', 'tritone', 'split_tone', 'sepia', 'tint', 'hue_shift',
  'noise_field', 'fbm', 'turbulence', 'plasma', 'caustics', 'voronoi_cells',
  'stripes', 'concentric_rings', 'sunburst', 'spiral_arms', 'sin_field',
  'ring', 'rectangle', 'star', 'heart', 'hexagon',
  'vignette', 'glow', 'bloom', 'god_rays', 'fog', 'fog_exp',
  'chromatic_aberration', 'grain', 'film_grain_color', 'crt_curvature',
  'exposure', 'contrast', 'gamma', 'pulse_brightness', 'pulse_hue',
  'image_input', 'webcam_input',
] as const;

// ─── Public API ─────────────────────────────────────────────────────────

/** Translate an image Blob into a Recipe via the Vite-plugin → Claude path.
 *  Throws on network / parse failure. */
export async function translateImageToRecipe(
  imageBlob: Blob,
  currentRecipe: Recipe,
): Promise<Recipe> {
  const imageBase64 = await blobToBase64DataUrl(imageBlob);
  // Down-sample to THUMB_SIZE so the payload stays manageable.
  const thumb = await downscaleImage(imageBase64, THUMB_SIZE);
  const prompt = buildVisionPrompt(currentRecipe);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode: 'image-to-recipe', imageBase64: thumb }),
  });
  const raw = await res.text();
  let parsed: { result?: string; error?: string; stderr?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Non-JSON response from /__claude_ask (HTTP ' + res.status + '): ' + raw.slice(0, 300));
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
  return cloneRecipeWithFreshIds(recipe);
}

// ─── Popover component ─────────────────────────────────────────────────

export type PhotoToCardsPopoverProps = {
  /** Position relative to the trigger button. Caller is responsible for
   *  rendering the trigger and supplying screen-anchored coordinates. */
  anchor: { top: number; right: number };
  onClose: () => void;
};

type PopoverState =
  | { kind: 'idle' }
  | { kind: 'preview'; dataUrl: string; blob: Blob }
  | { kind: 'loading'; dataUrl: string }
  | { kind: 'error'; dataUrl: string | null; message: string };

export const PhotoToCardsPopover = ({ anchor, onClose }: PhotoToCardsPopoverProps) => {
  const setRecipe = useCardsStore((s) => s.setRecipe);
  const recipe = useCardsStore((s) => s.recipe);
  const [state, setState] = useState<PopoverState>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside dismissal. We attach to the document so any click outside
  // the popover (including elsewhere in the topbar) closes it.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);

  const onFile = (file: File) => {
    if (!/^image\/(png|jpeg|jpg|webp)/i.test(file.type)) {
      setState({ kind: 'error', dataUrl: null, message: 'Please pick a PNG or JPG.' });
      return;
    }
    void blobToBase64DataUrl(file).then((dataUrl) => {
      setState({ kind: 'preview', dataUrl, blob: file });
    });
  };

  const onConvert = async () => {
    if (state.kind !== 'preview') return;
    setState({ kind: 'loading', dataUrl: state.dataUrl });
    try {
      const next = await translateImageToRecipe(state.blob, recipe);
      setRecipe(next);
      onClose();
    } catch (e) {
      setState({
        kind: 'error',
        dataUrl: state.dataUrl,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const popStyle: CSSProperties = {
    position: 'fixed',
    top: anchor.top,
    right: anchor.right,
    width: 320,
    background: SHADE.bg,
    border: `1px solid ${SHADE.inkLine}`,
    borderRadius: 6,
    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
    zIndex: 100,
    padding: 16,
    color: SHADE.text,
    font: `500 12.5px ${TYPE.body}`,
  };

  return (
    <div ref={wrapperRef} style={popStyle} role="dialog" aria-label="Photo to cards">
      <div
        style={{
          font: `700 11px ${TYPE.body}`,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: SHADE.textDim,
          marginBottom: 10,
        }}
      >
        Photo → Blocks
      </div>

      {/* Preview / placeholder thumbnail */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: SHADE.surface1,
          border: `1px dashed ${SHADE.border}`,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginBottom: 12,
          position: 'relative',
        }}
      >
        {state.kind === 'idle' && (
          <span style={{ color: SHADE.textFaint, font: `500 11px ${TYPE.bodyMono}`, letterSpacing: '0.08em' }}>
            no image yet
          </span>
        )}
        {(state.kind === 'preview' || state.kind === 'loading' || state.kind === 'error') && state.dataUrl && (
          <img
            src={state.dataUrl}
            alt="upload preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {state.kind === 'loading' && (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(15,18,26,0.78)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: SHADE.gold,
              font: `600 11px ${TYPE.bodyMono}`,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textAlign: 'center',
              padding: 12,
            }}
          >
            shaddy is squinting at your photo…
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={state.kind === 'loading'}
          style={secondaryBtn(state.kind === 'loading')}
        >
          {state.kind === 'idle' ? 'Choose…' : 'Replace'}
        </button>
        <button
          type="button"
          onClick={() => void onConvert()}
          disabled={state.kind !== 'preview'}
          style={goldBtn(state.kind !== 'preview')}
        >
          Convert to shader
        </button>
      </div>

      {state.kind === 'error' && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            border: '1px solid rgba(181,54,94,0.55)',
            background: 'rgba(181,54,94,0.18)',
            borderRadius: 3,
            color: '#FFB7C5',
            font: `500 11px ${TYPE.bodyMono}`,
            letterSpacing: '0.04em',
            wordBreak: 'break-word',
          }}
        >
          {state.message}
        </div>
      )}
    </div>
  );
};

// ─── Styling helpers ────────────────────────────────────────────────────

function goldBtn(disabled: boolean): CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 3,
    background: disabled ? 'rgba(252,180,39,0.32)' : SHADE.gold,
    color: '#1a1208',
    border: `1px solid ${SHADE.goldDeep}`,
    font: `700 11px ${TYPE.body}`,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function secondaryBtn(disabled: boolean): CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 3,
    background: 'transparent',
    color: SHADE.text,
    border: `1px solid ${SHADE.border}`,
    font: `600 11px ${TYPE.body}`,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function blobToBase64DataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Expected string from FileReader'));
    };
    reader.readAsDataURL(blob);
  });
}

/** Decode the data URL into an Image, paint onto a `size×size` canvas, and
 *  return the canvas's PNG data URL. Keeps the payload to Claude small. */
function downscaleImage(dataUrl: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not decode image'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }
      // Object-cover style: fit short edge then center-crop.
      const scale = Math.max(size / img.width, size / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (size - dw) / 2;
      const dy = (size - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

function buildVisionPrompt(currentRecipe: Recipe): string {
  return [
    'You are translating a reference photograph into a procedural shader by',
    'choosing a small set of "cards" from the Shaddy library that, when',
    'composed, approximate the photo\'s mood — colour palette, structure,',
    'and a suggestion of motion.',
    '',
    'Output a JSON Recipe with this shape:',
    '{ "mode": "2d", "canvasAspect": "landscape" | "square" | "portrait",',
    '  "cards": [',
    '    { "kind": "typed", "id": "<auto>", "type": "<card-type>", "enabled": true,',
    '      "alpha": 1, "blendMode": "normal",',
    '      "params": { "<key>": { "value": <number|[r,g,b]>, "animation": null } } }',
    '  ]',
    '}',
    '',
    'Pick from these card types (the most relevant for matching a photo):',
    VISION_CARD_TYPES.join(', '),
    '',
    'Guidelines:',
    '- 3–8 cards is usually enough. Stack a colour base, then add a couple',
    '  of texture / atmospheric cards.',
    '- Colours are normalised RGB triples [r, g, b] in the 0..1 range.',
    '- Use "<auto>" for ids — the host replaces them on apply.',
    '- Don\'t use the image_input or webcam_input cards — they need live',
    '  media bindings the user hasn\'t supplied here.',
    '- Output ONLY valid JSON. No prose, no fences.',
    '',
    'Current recipe (for reference; the user wants to REPLACE it):',
    '<<<JSON',
    JSON.stringify(currentRecipe, null, 2),
    '>>>',
  ].join('\n');
}

function stripCodeFences(raw: string): string {
  let s = raw.trim();
  const leading = s.match(/^```[a-zA-Z0-9_-]*\s*\n/);
  if (leading) s = s.slice(leading[0].length);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trimEnd();
}
