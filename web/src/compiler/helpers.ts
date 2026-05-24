// Reusable GLSL helper functions referenced by blocks via BlockDef.helpers.
// The compiler walks the recipe, collects the union of names + transitive
// dependencies, then emits each function ONCE at the top of the shader
// (before main()). Emission order is fixed so dependents always come after
// their dependencies.
//
// Sources: noise + hash adapted from iq's Shadertoy snippets.
// voronoi adapted from Inigo Quilez. hsv2rgb from Sam Hocevar (PD).
// rotate2d is the standard 2x2 rotation matrix.

export const GLSL_HELPERS: Record<string, string> = {
  hash: `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}`,

  noise: `float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i + vec2(0.0, 0.0));
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`,

  voronoi: `float voronoi(vec2 p, float jitter) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float md = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      // jitter=0 → seed pinned at cell centre (regular grid);
      // jitter=1 → seed free across the full cell.
      vec2 seed = vec2(hash(ip + g), hash(ip + g + 0.5));
      vec2 site = g + 0.5 + (seed - 0.5) * jitter;
      md = min(md, length(site - fp));
    }
  }
  return md;
}`,

  hsv2rgb: `vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`,

  rotate2d: `mat2 rotate2d(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}`,
};

export const HELPER_DEPS: Record<string, string[]> = {
  noise: ['hash'],
  voronoi: ['hash'],
};

export const HELPER_EMISSION_ORDER: readonly string[] = [
  'hash',
  'noise',
  'voronoi',
  'hsv2rgb',
  'rotate2d',
];

export function resolveHelperClosure(requested: Iterable<string>): Set<string> {
  const out = new Set<string>();
  const stack = [...requested];
  while (stack.length > 0) {
    const name = stack.pop()!;
    if (out.has(name)) continue;
    if (!(name in GLSL_HELPERS)) continue;
    out.add(name);
    const deps = HELPER_DEPS[name];
    if (deps) for (const d of deps) stack.push(d);
  }
  return out;
}
