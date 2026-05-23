export const POLAR_KALEIDOSCOPE_BODY = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float slices = 8.0;
  a = mod(a, 6.2831 / slices);
  a = abs(a - 3.14159 / slices);
  vec2 p = vec2(cos(a), sin(a)) * r;
  float v = 0.5 + 0.5 * sin(p.x * 14.0 + u_time) * cos(p.y * 14.0 - u_time * 0.7);
  vec3 c1 = vec3(0.95, 0.40, 0.55);
  vec3 c2 = vec3(0.15, 0.40, 0.85);
  fragColor = vec4(mix(c1, c2, v), 1.0);
}
`;
