// Renderer implementation. Private to renderer/; consumers import the
// factory and types from ./index.ts only.
//
// Scope so far: #5 — WebGL2 context, fullscreen triangle, debug shader,
// requestAnimationFrame loop. compile/setUniform/resize/snapshot/onCompile
// remain stubbed for #6–#9; mount() does enough to satisfy #5's acceptance
// ("mounting to a <div> shows a moving color gradient").

import type { CompileResult, RendererAPI, Uniform } from './index';
import { FULLSCREEN_TRIANGLE_VERT, linkProgram } from './gl/program';
import { DEBUG_FRAGMENT_SHADER } from './templates/debug.glsl';

class Renderer implements RendererAPI {
  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private program: WebGLProgram | null = null;
  private rafHandle: number | null = null;
  private startTime = 0;

  mount(host: HTMLElement): void {
    if (this.host === host) return;
    if (this.host) this.teardown();

    this.host = host;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const w = Math.max(host.clientWidth, 1);
    const h = Math.max(host.clientHeight, 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('renderer: WebGL2 not available in this browser');

    // Fullscreen-triangle geometry is generated in the vertex shader from
    // gl_VertexID — we only need a VAO bound for the draw call.
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('renderer: failed to create vertex array');
    gl.bindVertexArray(vao);

    const linked = linkProgram(gl, FULLSCREEN_TRIANGLE_VERT, DEBUG_FRAGMENT_SHADER);
    if (!linked.ok) {
      throw new Error(`renderer: debug shader failed to compile: ${linked.infoLog}`);
    }

    this.canvas = canvas;
    this.gl = gl;
    this.vao = vao;
    this.program = linked.program;

    host.appendChild(canvas);

    this.startTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    const gl = this.gl;
    const canvas = this.canvas;
    const program = this.program;
    if (!gl || !canvas || !program) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);

    const uTime = gl.getUniformLocation(program, 'u_time');
    if (uTime) gl.uniform1f(uTime, (performance.now() - this.startTime) / 1000);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.rafHandle = requestAnimationFrame(this.loop);
  };

  private teardown(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.gl && this.program) gl_safeDelete(this.gl, this.program);
    if (this.gl && this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.gl = null;
    this.vao = null;
    this.program = null;
    this.host = null;
  }

  // Stubs — implemented across #6–#9. Kept as 'not yet implemented' so that
  // consumers fail loudly rather than silently no-op (compare with mock,
  // which is intentionally a no-op).
  compile(_fragmentSource: string): CompileResult {
    throw new Error('renderer.compile: not yet implemented (issue #6)');
  }
  setUniform(_name: string, _value: Uniform | null): void {
    throw new Error('renderer.setUniform: not yet implemented (issue #9)');
  }
  resize(_width: number, _height: number): void {
    throw new Error('renderer.resize: not yet implemented (issue #9)');
  }
  snapshot(): Promise<string> {
    return Promise.reject(new Error('renderer.snapshot: not yet implemented (issue #9)'));
  }
  onCompile(_cb: (r: CompileResult) => void): () => void {
    throw new Error('renderer.onCompile: not yet implemented (issue #6)');
  }
  getFps(): number {
    throw new Error('renderer.getFps: not yet implemented (issue #9)');
  }
}

function gl_safeDelete(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  gl.deleteProgram(program);
}

export function createRenderer(): RendererAPI {
  return new Renderer();
}
