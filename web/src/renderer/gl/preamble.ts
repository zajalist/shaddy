// The fragment-shader preamble the renderer prepends to every user source
// before sending it to the GL driver. Keeping this in one place means the
// per-line offset used by the error parser (#7) stays in sync with what
// the user actually sees.
//
// Convention: user writes the body of a fragment shader (helpers + main).
// They get `v_uv` (vec2, [0,1] across the triangle), `fragColor` (vec4 out),
// and the three standard uniforms. They MUST NOT redeclare any of these.

export const FRAGMENT_PREAMBLE_LINES = [
  '#version 300 es',
  'precision highp float;',
  'in vec2 v_uv;',
  'out vec4 fragColor;',
  'uniform float u_time;',
  'uniform vec2 u_resolution;',
  'uniform vec2 u_mouse;',
];

export const FRAGMENT_PREAMBLE = FRAGMENT_PREAMBLE_LINES.join('\n');

/** Number of lines added before the user's source. User line N → wrapped line N + offset. */
export const USER_LINE_OFFSET = FRAGMENT_PREAMBLE_LINES.length;

export function wrapFragmentSource(userSource: string): string {
  return `${FRAGMENT_PREAMBLE}\n${userSource}`;
}
