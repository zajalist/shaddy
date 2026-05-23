export const RIPPLE_BODY = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float d = length(uv - (u_mouse - 0.5) * 1.6);
  float v = sin(d * 30.0 - u_time * 4.0) / (1.0 + d * 8.0);
  vec3 a = vec3(0.05, 0.10, 0.18);
  vec3 b = vec3(0.45, 0.80, 1.00);
  fragColor = vec4(mix(a, b, 0.5 + 0.5 * v), 1.0);
}
`;
