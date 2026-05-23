// Reusable GLSL helper functions referenced by cards via CardDef.helpers.
// The compiler walks the recipe, collects the union of names + transitive
// dependencies, then emits each function ONCE at the top of the shader
// (before main()). Emission order is fixed below so dependents always come
// after their dependencies.

export const GLSL_HELPERS: Record<string, string> = {
  hash21: `float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}`,

  hash22: `vec2 hash22(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}`,

  noise2: `float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i + vec2(0.0, 0.0));
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`,

  hsv2rgb: `vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`,
};

/** Helper → list of other helpers it depends on. Resolved transitively at compile. */
export const HELPER_DEPS: Record<string, string[]> = {
  noise2: ['hash21'],
};

/** Fixed emission order. Any helper named here that's in the requested set is
 *  emitted; anything not in the registry is ignored. Dependents come AFTER
 *  their dependencies. */
export const HELPER_EMISSION_ORDER: readonly string[] = ['hash21', 'hash22', 'noise2', 'hsv2rgb'];

/** Expand a set of helper names to include all transitive dependencies. */
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
