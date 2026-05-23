export const CHECKERBOARD_BODY = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float n = 8.0;
  vec2 g = floor(uv * n);
  float s = mod(g.x + g.y, 2.0);
  vec3 a = vec3(0.96, 0.94, 0.90);
  vec3 b = vec3(0.20, 0.20, 0.22);
  fragColor = vec4(mix(a, b, s), 1.0);
}
`;
