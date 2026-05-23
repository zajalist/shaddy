// WebGL2 shader/program compilation. Private to renderer/ — consumers go
// through index.ts. The error normalization for getShaderInfoLog lives in
// ./error-log.ts (issue #7); the compile helpers below just surface the
// raw info log to the caller, which decides how to translate it.

export const FULLSCREEN_TRIANGLE_VERT = `#version 300 es
precision highp float;

// One fullscreen triangle in clip space — covers [-1, 1] × [-1, 1].
// vertexID 0 → (-1, -1), 1 → (3, -1), 2 → (-1, 3).
out vec2 v_uv;

void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                (gl_VertexID == 2) ? 3.0 : -1.0);
  v_uv = (p + 1.0) * 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

export type CompiledShader =
  | { ok: true; shader: WebGLShader }
  | { ok: false; infoLog: string };

export type LinkedProgram =
  | { ok: true; program: WebGLProgram }
  | { ok: false; infoLog: string };

export function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
): CompiledShader {
  const shader = gl.createShader(type);
  if (!shader) return { ok: false, infoLog: 'gl.createShader returned null' };
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(shader) ?? '';
    gl.deleteShader(shader);
    return { ok: false, infoLog };
  }
  return { ok: true, shader };
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
): LinkedProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  if (!vert.ok) return { ok: false, infoLog: `[vertex] ${vert.infoLog}` };

  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!frag.ok) {
    gl.deleteShader(vert.shader);
    return { ok: false, infoLog: frag.infoLog };
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vert.shader);
    gl.deleteShader(frag.shader);
    return { ok: false, infoLog: 'gl.createProgram returned null' };
  }
  gl.attachShader(program, vert.shader);
  gl.attachShader(program, frag.shader);
  gl.linkProgram(program);

  // Shaders can be detached + deleted after link — the program retains them.
  gl.detachShader(program, vert.shader);
  gl.detachShader(program, frag.shader);
  gl.deleteShader(vert.shader);
  gl.deleteShader(frag.shader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const infoLog = gl.getProgramInfoLog(program) ?? '';
    gl.deleteProgram(program);
    return { ok: false, infoLog: `[link] ${infoLog}` };
  }
  return { ok: true, program };
}
