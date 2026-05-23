export const PLAIN_CIRCLE_BODY = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float r = 0.35;
  float d = length(uv);
  float edge = smoothstep(r, r - 0.005, d);
  vec3 bg = vec3(0.08, 0.10, 0.14);
  vec3 fg = vec3(0.95, 0.96, 0.98);
  fragColor = vec4(mix(bg, fg, edge), 1.0);
}
`;
