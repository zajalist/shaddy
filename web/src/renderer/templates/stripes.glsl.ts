export const STRIPES_BODY = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float angle = 0.6;
  float freq = 18.0;
  float coord = uv.x * cos(angle) + uv.y * sin(angle);
  float s = step(0.5, fract(coord * freq));
  vec3 a = vec3(0.95, 0.93, 0.88);
  vec3 b = vec3(0.18, 0.18, 0.22);
  fragColor = vec4(mix(a, b, s), 1.0);
}
`;
