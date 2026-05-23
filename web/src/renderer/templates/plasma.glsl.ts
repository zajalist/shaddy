// Backend-tunable template (#10 + backend §3): the literals here are the
// surface the ML optimizer can match a target photo against.

export const PLASMA_BODY = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.6;

  float v = 0.0;
  v += sin(uv.x * 6.0 + t);
  v += sin(uv.y * 7.0 + t * 1.3);
  v += sin((uv.x + uv.y) * 5.0 + t * 0.9);
  v += sin(length(uv) * 9.0 + t * 1.7);
  v *= 0.25;

  vec3 c1 = vec3(0.85, 0.30, 0.55);
  vec3 c2 = vec3(0.20, 0.55, 0.85);
  vec3 c3 = vec3(0.95, 0.85, 0.35);

  vec3 col = mix(c1, c2, 0.5 + 0.5 * sin(v * 3.14159));
  col = mix(col, c3, 0.5 + 0.5 * cos(v * 3.14159 + 1.0));
  fragColor = vec4(col, 1.0);
}
`;
