export const SDF_HEART_BODY = `
// Heart SDF — simplified from iq's classic 2d sdf set.
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) {
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  }
  return sqrt(min(dot(p - vec2(0.00, 1.00), p - vec2(0.00, 1.00)),
                  dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))))
         * sign(p.x - p.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  uv.y = -uv.y;
  uv *= 1.8;
  float s = 1.0 + 0.05 * sin(u_time * 3.5);
  float d = sdHeart(uv / s);
  float inside = smoothstep(0.005, -0.005, d);
  float glow = exp(-d * 8.0);
  vec3 ink = vec3(0.95, 0.20, 0.30);
  vec3 bg  = vec3(0.06, 0.06, 0.10);
  fragColor = vec4(mix(bg + ink * glow * 0.25, ink, inside), 1.0);
}
`;
