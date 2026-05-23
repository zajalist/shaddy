export const SOFT_GRADIENT_BODY = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 top = vec3(0.95, 0.80, 0.55);
  vec3 mid = vec3(0.85, 0.40, 0.50);
  vec3 bot = vec3(0.30, 0.15, 0.40);
  vec3 c = mix(bot, mid, smoothstep(0.0, 0.5, uv.y));
  c = mix(c, top, smoothstep(0.5, 1.0, uv.y));
  fragColor = vec4(c, 1.0);
}
`;
