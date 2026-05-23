// Renderer implementation. Private to renderer/; consumers import the
// factory and types from ./index.ts only.
//
// Scope so far:
//   #5  — context, VAO, fullscreen triangle, RAF loop
//   #6  — compile() + onCompile() with hot-swap + last-good fallback
//
// Still stubbed: setUniform / resize / snapshot / getFps (#9), standard
// uniforms u_resolution / u_mouse (#8), mobile perf guardrails (#13).

import type { CompileResult, GLSLError, RendererAPI, Uniform } from './index';
import { FULLSCREEN_TRIANGLE_VERT, linkProgram } from './gl/program';
import { USER_LINE_OFFSET, wrapFragmentSource } from './gl/preamble';
import { DEBUG_FRAGMENT_BODY } from './templates/debug.glsl';

class Renderer implements RendererAPI {
  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private program: WebGLProgram | null = null;
  private rafHandle: number | null = null;
  private startTime = 0;
  private compileSubs = new Set<(r: CompileResult) => void>();

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

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('renderer: failed to create vertex array');
    gl.bindVertexArray(vao);

    this.canvas = canvas;
    this.gl = gl;
    this.vao = vao;

    host.appendChild(canvas);

    // Compile the debug shader through the same compile() path. If this
    // ever fails, the constructor invariant ("there is always a program")
    // is broken and the renderer surfaces the error loudly.
    const initial = this.compile(DEBUG_FRAGMENT_BODY);
    if (!initial.ok) {
      throw new Error(
        `renderer: built-in debug shader failed to compile — ${initial.errors[0]?.message ?? '?'}`,
      );
    }

    this.startTime = performance.now();
    this.loop();
  }

  compile(fragmentSource: string): CompileResult {
    if (!this.gl) {
      throw new Error('renderer.compile: call mount() before compile()');
    }
    const gl = this.gl;

    const wrapped = wrapFragmentSource(fragmentSource);
    const linked = linkProgram(gl, FULLSCREEN_TRIANGLE_VERT, wrapped);

    if (!linked.ok) {
      const errors = parseErrors(linked.infoLog);
      const result: CompileResult = { ok: false, errors };
      this.notifySubs(result);
      return result;
    }

    // Success: delete the old program and swap in the new one. The old
    // program may be null on the very first compile (from mount()).
    if (this.program) gl.deleteProgram(this.program);
    this.program = linked.program;

    const result: CompileResult = { ok: true };
    this.notifySubs(result);
    return result;
  }

  onCompile(cb: (r: CompileResult) => void): () => void {
    this.compileSubs.add(cb);
    return () => {
      this.compileSubs.delete(cb);
    };
  }

  private notifySubs(result: CompileResult): void {
    for (const cb of this.compileSubs) cb(result);
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
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
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

  // Stubs — implemented in #8 / #9.
  setUniform(_name: string, _value: Uniform | null): void {
    throw new Error('renderer.setUniform: not yet implemented (issue #9)');
  }
  resize(_width: number, _height: number): void {
    throw new Error('renderer.resize: not yet implemented (issue #9)');
  }
  snapshot(): Promise<string> {
    return Promise.reject(new Error('renderer.snapshot: not yet implemented (issue #9)'));
  }
  getFps(): number {
    throw new Error('renderer.getFps: not yet implemented (issue #9)');
  }
}

// Placeholder error formatting — proper line/column parsing lands in #7.
// For now we surface the whole driver log as a single GLSLError pinned to
// line 1 so the editor still gets *something* it can render. The line
// number will be corrected by #7's parser once it lands.
function parseErrors(infoLog: string): GLSLError[] {
  void USER_LINE_OFFSET; // referenced so the constant stays alive for #7.
  return [{ line: 1, column: 1, message: infoLog.trim() || 'shader compile failed' }];
}

export function createRenderer(): RendererAPI {
  return new Renderer();
}
