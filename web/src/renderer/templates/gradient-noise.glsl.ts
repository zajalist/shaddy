// Backend-tunable template (#10 + backend §3): value-noise field with
// tunable scale + color palette. Backend mirrors the literal layout to
// optimize against a target photo.

export const GRADIENT_NOISE_BODY = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i + vec2(0.0, 0.0));
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float scale = 4.5;
  float n = noise(uv * scale + u_time * 0.15);
  n = 0.5 + 0.6 * (n - 0.5);

  vec3 low  = vec3(0.10, 0.16, 0.30);
  vec3 high = vec3(0.92, 0.78, 0.55);
  fragColor = vec4(mix(low, high, n), 1.0);
}
`;
