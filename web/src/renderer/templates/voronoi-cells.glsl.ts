// Backend-tunable template (#10 + backend §3): cellular noise with
// tunable density and palette.

export const VORONOI_CELLS_BODY = `
vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float density = 8.0;
  vec2 p = uv * density;

  vec2 i = floor(p);
  vec2 f = fract(p);

  float best = 10.0;
  vec2 bestCell;
  for (int yo = -1; yo <= 1; yo++) {
    for (int xo = -1; xo <= 1; xo++) {
      vec2 cell = vec2(float(xo), float(yo));
      vec2 site = hash2(i + cell);
      site = 0.5 + 0.5 * sin(u_time * 0.5 + 6.2831 * site);
      float d = length(cell + site - f);
      if (d < best) { best = d; bestCell = i + cell; }
    }
  }

  vec3 a = vec3(0.18, 0.22, 0.32);
  vec3 b = vec3(0.95, 0.55, 0.30);
  vec3 col = mix(a, b, hash2(bestCell).x);
  col *= smoothstep(0.0, 0.05, best); // dark seams between cells
  fragColor = vec4(col, 1.0);
}
`;
