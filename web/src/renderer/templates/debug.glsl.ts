// Debug shader body. Compiled through the same compile() path as user
// shaders, so it doesn't include #version / precision / declarations —
// those live in the preamble (see ../gl/preamble.ts).

export const DEBUG_FRAGMENT_BODY = `
void main() {
  vec3 c = 0.5 + 0.5 * cos(u_time + v_uv.xyx * 3.14159 + vec3(0.0, 2.0, 4.0));
  fragColor = vec4(c, 1.0);
}
`;
