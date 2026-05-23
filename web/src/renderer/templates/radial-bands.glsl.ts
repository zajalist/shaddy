export const RADIAL_BANDS_BODY = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float d = length(uv);
  float bands = 12.0;
  float v = fract(d * bands - u_time * 0.3);
  float edge = smoothstep(0.45, 0.5, v) - smoothstep(0.5, 0.55, v);
  vec3 a = vec3(0.12, 0.16, 0.22);
  vec3 b = vec3(0.95, 0.85, 0.55);
  fragColor = vec4(mix(a, b, edge), 1.0);
}
`;
