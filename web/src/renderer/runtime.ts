// Renderer implementation. Private to renderer/; consumers import the
// factory and types from ./index.ts only.
//
// Scope so far:
//   #5  — context, VAO, fullscreen triangle, RAF loop
//   #6  — compile() + onCompile() with hot-swap + last-good fallback
//   #7  — GLSL info-log normalization (in ./gl/error-log.ts)
//   #8  — standard uniforms u_time, u_resolution, u_mouse
//
// Still stubbed: setUniform / resize / snapshot / getFps (#9), mobile perf
// guardrails (#13).

import type { CompileResult, RendererAPI, Uniform } from './index';
import { FULLSCREEN_TRIANGLE_VERT, linkProgram } from './gl/program';
import { USER_LINE_OFFSET, wrapFragmentSource } from './gl/preamble';
import { parseGlslErrors } from './gl/error-log';
import { DEBUG_FRAGMENT_BODY } from './templates/debug.glsl';

type StandardLocs = {
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
};

class Renderer implements RendererAPI {
  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private program: WebGLProgram | null = null;
  private stdLocs: StandardLocs | null = null;
  private rafHandle: number | null = null;
  private startTime = 0;
  private compileSubs = new Set<(r: CompileResult) => void>();

  // u_mouse — normalized [0,1] across the host. Origin at lower-left
  // (y-up) so shaders can compare against uv directly. Starts centered.
  private mouseX = 0.5;
  private mouseY = 0.5;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;

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
    this.attachPointerListeners(host);

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

    if (this.program) gl.deleteProgram(this.program);
    this.program = linked.program;
    this.stdLocs = {
      uTime: gl.getUniformLocation(linked.program, 'u_time'),
      uResolution: gl.getUniformLocation(linked.program, 'u_resolution'),
      uMouse: gl.getUniformLocation(linked.program, 'u_mouse'),
    };

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

  private attachPointerListeners(host: HTMLElement): void {
    const fromPoint = (clientX: number, clientY: number): void => {
      const r = host.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      this.mouseX = clamp01((clientX - r.left) / r.width);
      // y-up: shader convention (origin at lower-left), so flip the
      // browser's top-down y-axis.
      this.mouseY = 1 - clamp01((clientY - r.top) / r.height);
    };

    const pointer = (e: PointerEvent) => fromPoint(e.clientX, e.clientY);
    const touch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) fromPoint(t.clientX, t.clientY);
    };

    host.addEventListener('pointermove', pointer);
    host.addEventListener('touchmove', touch, { passive: true });

    this.pointerMoveHandler = pointer;
    this.touchMoveHandler = touch;
  }

  private detachPointerListeners(): void {
    const host = this.host;
    if (!host) return;
    if (this.pointerMoveHandler) host.removeEventListener('pointermove', this.pointerMoveHandler);
    if (this.touchMoveHandler) host.removeEventListener('touchmove', this.touchMoveHandler);
    this.pointerMoveHandler = null;
    this.touchMoveHandler = null;
  }

  private loop = (): void => {
    const gl = this.gl;
    const canvas = this.canvas;
    const program = this.program;
    const locs = this.stdLocs;
    if (!gl || !canvas || !program || !locs) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);

    if (locs.uTime) {
      gl.uniform1f(locs.uTime, (performance.now() - this.startTime) / 1000);
    }
    if (locs.uResolution) {
      gl.uniform2f(locs.uResolution, canvas.width, canvas.height);
    }
    if (locs.uMouse) {
      gl.uniform2f(locs.uMouse, this.mouseX, this.mouseY);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.rafHandle = requestAnimationFrame(this.loop);
  };

  private teardown(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.detachPointerListeners();
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    if (this.gl && this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.gl = null;
    this.vao = null;
    this.program = null;
    this.stdLocs = null;
    this.host = null;
  }

  // Stubs — implemented in #9.
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

function parseErrors(infoLog: string) {
  return parseGlslErrors(infoLog, USER_LINE_OFFSET);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function createRenderer(): RendererAPI {
  return new Renderer();
}
