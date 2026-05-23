export const RAYMARCH_SPHERE_BODY = `
float sdSphere(vec3 p, float r) { return length(p) - r; }

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  vec3 ro = vec3(0.0, 0.0, -3.0);
  vec3 rd = normalize(vec3(uv, 1.4));
  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 48; i++) {
    vec3 p = ro + rd * t;
    float d = sdSphere(p - vec3(sin(u_time) * 0.3, 0.0, 0.0), 0.8);
    if (d < 0.001) { hit = 1.0; break; }
    if (t > 8.0) break;
    t += d;
  }
  vec3 p = ro + rd * t;
  vec3 n = normalize(p);
  vec3 light = normalize(vec3(0.5, 0.8, -0.4));
  float diff = max(0.0, dot(n, light));
  vec3 col = mix(vec3(0.05, 0.07, 0.12), vec3(1.0, 0.65, 0.35), diff);
  fragColor = vec4(mix(vec3(0.05, 0.07, 0.12), col, hit), 1.0);
}
`;
