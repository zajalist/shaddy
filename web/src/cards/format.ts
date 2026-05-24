// Small formatters for the compiler + marker display. Pulled out so the
// compiler stays focused on emission structure, not number→string trivia.

import type { ColorRgb, ParameterValue } from './types';

export function isColor(value: ParameterValue): value is ColorRgb {
  return Array.isArray(value);
}

/** Render a float for the marker comment. Trims trailing zeroes; keeps short. */
export function formatFloatForDisplay(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  // 3 sig fractional digits is plenty for the display comment.
  return Number(n.toFixed(3)).toString();
}

/** Render a color as #rrggbb for the marker comment. */
export function formatColorForDisplay([r, g, b]: ColorRgb): string {
  const ch = (x: number): string => {
    const clamped = Math.max(0, Math.min(1, x));
    return Math.round(clamped * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

export function formatParameterForDisplay(value: ParameterValue): string {
  if (typeof value === 'string') {
    // Media-param value — a data URL or 'webcam'. Don't dump megabytes of
    // base64 into the marker comment; just show a short tag.
    if (value === '') return '(none)';
    if (value === 'webcam') return 'webcam';
    if (value.startsWith('data:')) return 'image';
    return value.slice(0, 24);
  }
  return isColor(value) ? formatColorForDisplay(value) : formatFloatForDisplay(value);
}

/** Render a value as a GLSL literal (used for default initializers, never
 *  for the in-snippet placeholders — those become uniform refs). */
export function formatParameterAsGlslLiteral(value: ParameterValue): string {
  if (typeof value === 'string') {
    // Media-param literals aren't representable inline (they're textures);
    // emit a benign black colour so any caller that fell through has
    // valid GLSL. In practice no card uses this for image/video params.
    return 'vec3(0.0)';
  }
  if (isColor(value)) {
    const [r, g, b] = value;
    return `vec3(${glslFloat(r)}, ${glslFloat(g)}, ${glslFloat(b)})`;
  }
  return glslFloat(value);
}

function glslFloat(n: number): string {
  // GLSL requires a decimal point on float literals (otherwise it's int).
  const s = Number(n.toFixed(6)).toString();
  return s.includes('.') ? s : `${s}.0`;
}

/** Substitute every `{{paramKey}}` in `template` using the provided mapper.
 *  Throws on unknown placeholders so we catch CardDef authoring bugs early. */
export function substitutePlaceholders(
  template: string,
  mapper: (paramKey: string) => string,
): string {
  return template.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, key) => mapper(key as string));
}
