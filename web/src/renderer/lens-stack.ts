// Lens stack — Tier 2. Render the same fragment shader N times, each time
// short-circuiting after line K (1-based, user coordinates), so the UX
// side panel can show what the pixel pipeline looks like at each step.
//
// Implementation strategy (per issue #12):
//   - Own a small offscreen canvas + webgl2 context, reused across calls
//     (the "single FBO" in the issue text — implemented as the canvas's
//     own backbuffer with preserveDrawingBuffer so toDataURL works).
//   - For each break line, inject `return;` after that line in the user
//     source, wrap with the standard preamble, compile + draw, snapshot.
//   - Standard uniforms are set to fixed values (time = 0, mouse centered,
//     resolution = canvas size) so the captures are deterministic.
//
// Limitation: injecting `return;` only does the right thing when the
// break line is inside `main()`. Breaking inside a helper function early-
// exits that helper and continues main() as usual. Documented behaviour
// for v1; a future iteration could pass the line through a GLSL parser
// to inject `discard;` or output the last-assigned fragColor instead.

import type { LensStackAPI } from './index';
import { FULLSCREEN_TRIANGLE_VERT, linkProgram } from './gl/program';
import { wrapFragmentSource } from './gl/preamble';

export function injectReturnAfterLine(source: string, line: number): string {
  const lines = source.split('\n');
  if (!Number.isInteger(line) || line < 1 || line > lines.length) return source;
  return [...lines.slice(0, line), 'return;', ...lines.slice(line)].join('\n');
}

const CAPTURE_SIZE_PX = 256;

class LensStack implements LensStackAPI {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;

  private ensureContext(): { gl: WebGL2RenderingContext; canvas: HTMLCanvasElement } {
    if (this.canvas && this.gl) return { gl: this.gl, canvas: this.canvas };

    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_SIZE_PX;
    canvas.height = CAPTURE_SIZE_PX;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('lens-stack: WebGL2 not available in this browser');

    // Bind a single VAO for the lifetime of this lens stack — the fullscreen
    // triangle is generated in the vertex shader from gl_VertexID, so no
    // attribute buffers and no further VAO state changes are needed.
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('lens-stack: failed to create VAO');
    gl.bindVertexArray(vao);

    this.canvas = canvas;
    this.gl = gl;
    return { gl, canvas };
  }

  async capture(fragmentSource: string, breakLines: number[]): Promise<string[]> {
    const { gl, canvas } = this.ensureContext();
    const out: string[] = [];

    for (const line of breakLines) {
      const variant = injectReturnAfterLine(fragmentSource, line);
      const wrapped = wrapFragmentSource(variant);
      const linked = linkProgram(gl, FULLSCREEN_TRIANGLE_VERT, wrapped);

      if (!linked.ok) {
        out.push('');
        continue;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(linked.program);

      const uTime = gl.getUniformLocation(linked.program, 'u_time');
      if (uTime) gl.uniform1f(uTime, 0);
      const uRes = gl.getUniformLocation(linked.program, 'u_resolution');
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      const uMouse = gl.getUniformLocation(linked.program, 'u_mouse');
      if (uMouse) gl.uniform2f(uMouse, 0.5, 0.5);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.deleteProgram(linked.program);

      out.push(canvas.toDataURL('image/png'));
    }

    return out;
  }
}

export function createLensStack(): LensStackAPI {
  return new LensStack();
}
