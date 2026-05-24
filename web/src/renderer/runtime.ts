// Renderer implementation. Private to renderer/; consumers import the
// factory and types from ./index.ts only.
//
// Scope so far:
//   #5  — context, VAO, fullscreen triangle, RAF loop
//   #6  — compile() + onCompile() with hot-swap + last-good fallback
//   #7  — GLSL info-log normalization (in ./gl/error-log.ts)
//   #8  — standard uniforms u_time, u_resolution, u_mouse
//   #9  — setUniform / resize / snapshot / getFps
//
// Still stubbed: mobile perf guardrails (#13).

import type {
  CompileMultiResult,
  CompileResult,
  GLSLError,
  MultiPassDef,
  RendererAPI,
  TextureSource,
  Uniform,
} from './index';
import { FULLSCREEN_TRIANGLE_VERT, linkProgram } from './gl/program';
import { USER_LINE_OFFSET, wrapFragmentSource } from './gl/preamble';
import { parseGlslErrors } from './gl/error-log';
import { DEBUG_FRAGMENT_BODY } from './templates/debug.glsl';
import { FpsCounter } from './fps';
import {
  FpsWatchdog,
  halveBufferSize,
  initialBufferSize,
  isCoarsePointerDevice,
} from './mobile-perf';

type StandardLocs = {
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
};

type BufferId = 'a' | 'b' | 'c' | 'd';

/** One ping-pong FBO pair backing a buffer pass. `read` is what samplers see;
 *  `write` is where the pass draws this frame. After the pass runs, they
 *  swap so the NEXT frame's reads see this frame's output. */
type FboPair = {
  read: { fb: WebGLFramebuffer; tex: WebGLTexture };
  write: { fb: WebGLFramebuffer; tex: WebGLTexture };
  width: number;
  height: number;
};

/** One pass in a compiled multi-pass pipeline. */
type CompiledPass = {
  id: MultiPassDef['id'];
  program: WebGLProgram;
  stdLocs: StandardLocs;
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
  // Caller-set uniforms; persist across compiles, applied every frame.
  private uniforms = new Map<string, Uniform>();
  private fpsCounter = new FpsCounter();
  private fpsWatchdog = new FpsWatchdog();

  // Texture bookkeeping for sampler2D uniforms. Each unique uniform name
  // gets a stable WebGLTexture + texture-unit slot (0, 1, 2, ...). On
  // subsequent setUniform calls with the SAME source object we skip the
  // upload unless the source is a video element (which is assumed live —
  // re-uploaded every frame inside the rAF loop via touchTextures()).
  private textures = new Map<string, { tex: WebGLTexture; unit: number; source: TextureSource }>();
  private nextTextureUnit = 0;

  // ── Multi-pass state ────────────────────────────────────────────────
  // When `multiPasses` is non-null, the per-frame loop renders THROUGH
  // the multi-pass pipeline instead of the single `program` field above.
  // Each non-image pass has a ping-pong FBO pair allocated in `fbos`.
  private multiPasses: CompiledPass[] | null = null;
  private fbos = new Map<BufferId, FboPair>();
  // Per-pass uniform bag — buffer passes can't share `this.uniforms`
  // because two passes may set the same uniform name to different values.
  // The default single-pass code path leaves `passUniforms` empty and
  // continues to use `this.uniforms` (which is what setUniform writes to).
  // For multi-pass, callers must use setUniformOnPass.
  private passUniforms = new Map<MultiPassDef['id'], Map<string, Uniform>>();

  // u_mouse — normalized [0,1] across the host. Origin at lower-left (y-up).
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
    const size = initialBufferSize({
      cssWidth: host.clientWidth,
      cssHeight: host.clientHeight,
      devicePixelRatio: dpr,
      isCoarsePointer: isCoarsePointerDevice(),
    });
    canvas.width = size.width;
    canvas.height = size.height;

    // preserveDrawingBuffer: true means snapshot() can call toDataURL at any
    // time without having to time it precisely against the compositor.
    // Modest perf cost; acceptable for a learning environment.
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
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

    // Switching from a multi-pass pipeline back to a single-pass shader —
    // drop FBOs + buffer-pass programs so the loop's multi-pass branch
    // doesn't try to use them.
    if (this.multiPasses) this.teardownMultiPass();

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

  compileMulti(passes: MultiPassDef[]): CompileMultiResult {
    if (!this.gl) {
      throw new Error('renderer.compileMulti: call mount() before compileMulti()');
    }
    const gl = this.gl;

    // Single-pass shortcut: if there's only the image pass, delegate to
    // compile() so we keep one canonical path for the common case.
    if (passes.length === 1 && passes[0]!.id === 'image') {
      this.teardownMultiPass();
      const r = this.compile(passes[0]!.fragmentSource);
      if (r.ok) return { ok: true };
      return { ok: false, failures: [{ id: 'image', errors: r.errors }] };
    }

    // Compile every pass FIRST. If any fail, abort without touching the
    // currently-running pipeline (matches the single-pass "keep last good
    // on failure" semantic).
    const compiled: CompiledPass[] = [];
    const failures: Array<{ id: MultiPassDef['id']; errors: GLSLError[] }> = [];
    for (const pass of passes) {
      const wrapped = wrapFragmentSource(pass.fragmentSource);
      const linked = linkProgram(gl, FULLSCREEN_TRIANGLE_VERT, wrapped);
      if (!linked.ok) {
        failures.push({ id: pass.id, errors: parseErrors(linked.infoLog) });
        continue;
      }
      compiled.push({
        id: pass.id,
        program: linked.program,
        stdLocs: {
          uTime: gl.getUniformLocation(linked.program, 'u_time'),
          uResolution: gl.getUniformLocation(linked.program, 'u_resolution'),
          uMouse: gl.getUniformLocation(linked.program, 'u_mouse'),
        },
      });
    }
    if (failures.length > 0) {
      // Roll back: delete the programs we successfully compiled but won't use.
      for (const c of compiled) gl.deleteProgram(c.program);
      const result: CompileMultiResult = { ok: false, failures };
      // Notify single-pass subscribers of the first failure so the existing
      // compile-status UI surfaces the error without a separate subscription.
      const first = failures[0]!;
      this.notifySubs({ ok: false, errors: first.errors });
      return result;
    }

    // Swap pipelines atomically.
    this.teardownMultiPass();
    this.multiPasses = compiled;
    // Single-pass program reference is now stale — clear it so the per-frame
    // loop takes the multi-pass branch.
    this.program = null;
    this.stdLocs = null;

    // Allocate / resize FBOs for any non-image pass.
    const wantedBuffers = new Set<BufferId>();
    for (const p of compiled) {
      if (p.id !== 'image') wantedBuffers.add(p.id);
    }
    for (const id of wantedBuffers) {
      this.ensureFboPair(id);
    }

    this.notifySubs({ ok: true });
    return { ok: true };
  }

  private ensureFboPair(id: BufferId): void {
    const gl = this.gl;
    const canvas = this.canvas;
    if (!gl || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const existing = this.fbos.get(id);
    if (existing && existing.width === w && existing.height === h) return;
    if (existing) this.disposeFboPair(existing);
    const make = (): { fb: WebGLFramebuffer; tex: WebGLTexture } => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { fb, tex };
    };
    this.fbos.set(id, { read: make(), write: make(), width: w, height: h });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private disposeFboPair(pair: FboPair): void {
    const gl = this.gl;
    if (!gl) return;
    gl.deleteFramebuffer(pair.read.fb);
    gl.deleteTexture(pair.read.tex);
    gl.deleteFramebuffer(pair.write.fb);
    gl.deleteTexture(pair.write.tex);
  }

  private teardownMultiPass(): void {
    const gl = this.gl;
    if (!gl) {
      this.multiPasses = null;
      this.fbos.clear();
      this.passUniforms.clear();
      return;
    }
    if (this.multiPasses) {
      for (const p of this.multiPasses) gl.deleteProgram(p.program);
      this.multiPasses = null;
    }
    for (const pair of this.fbos.values()) this.disposeFboPair(pair);
    this.fbos.clear();
    this.passUniforms.clear();
  }

  setUniform(name: string, value: Uniform | null): void {
    if (value === null) {
      this.uniforms.delete(name);
      // Free a texture slot if the cleared uniform was a sampler2D. We
      // intentionally DON'T reuse this slot for a fresh sampler — texture
      // units are cheap and stale unit numbers don't break correctness.
      const tex = this.textures.get(name);
      if (tex && this.gl) {
        this.gl.deleteTexture(tex.tex);
        this.textures.delete(name);
      }
      return;
    }
    if (value.kind === 'sampler2D') {
      this.uploadTexture(name, value.value);
      // Mirror non-texture uniforms so the per-frame applyUniform path can
      // see the binding exists; the actual int sampler write happens there.
      this.uniforms.set(name, value);
      return;
    }
    if (value.kind === 'sampler2D-buffer') {
      // Buffer-FBO reference — no upload here. The per-frame loop reads the
      // value.value (the buffer id) and binds the appropriate FBO texture
      // (read slot, which is "previous frame" for self-reference and
      // "current frame" for cross-pass).
      this.uniforms.set(name, value);
      return;
    }
    this.uniforms.set(name, value);
  }

  /** Upload (or update) a texture for a sampler2D uniform. Allocates a
   *  stable texture unit on first use; subsequent calls with the SAME
   *  source object only re-upload when the source is a <video> element
   *  (which always-updates) or when the source object changed. */
  private uploadTexture(name: string, source: TextureSource): void {
    const gl = this.gl;
    if (!gl) return;
    let entry = this.textures.get(name);
    const isVideo = typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement;
    const sourceChanged = entry !== undefined && entry.source !== source;
    if (!entry) {
      const tex = gl.createTexture();
      if (!tex) return;
      const unit = this.nextTextureUnit++;
      entry = { tex, unit, source };
      this.textures.set(name, entry);
    } else if (sourceChanged) {
      entry.source = source;
    }
    // Skip the upload if it's the same non-video source we already pushed
    // and the call isn't a per-frame refresh from the rAF loop's video
    // ticker. We can't know that from here cheaply, so use the rule: same
    // object + not a video = skip.
    if (!isVideo && !sourceChanged && entry.source === source) {
      // First-time upload still has to happen — detect by checking we got
      // here because we just created the entry (entry.tex has no image).
      // The flag below tells us; we use a small marker on the entry.
      const e = entry as typeof entry & { _uploaded?: boolean };
      if (e._uploaded) return;
      e._uploaded = true;
    } else if (!isVideo) {
      (entry as typeof entry & { _uploaded?: boolean })._uploaded = true;
    }

    gl.activeTexture(gl.TEXTURE0 + entry.unit);
    gl.bindTexture(gl.TEXTURE_2D, entry.tex);
    // Flip Y so DOM-coord image data lands as bottom-up in GL (matches the
    // way cards' uv = (uv*0.5+0.5) reads).
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    try {
      // texImage2D handles HTMLImageElement / HTMLCanvasElement /
      // HTMLVideoElement / ImageBitmap natively in WebGL2.
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        source as TexImageSource,
      );
    } catch {
      // First frames of a <video> can throw if the source isn't ready yet.
      // Drop silently; next rAF tick will retry.
      return;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  resize(width: number, height: number): void {
    if (!this.canvas) {
      throw new Error('renderer.resize: call mount() before resize()');
    }
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.canvas.width = w;
    this.canvas.height = h;
    // Viewport + u_resolution are reapplied each frame in loop(), so we
    // don't have to do anything else here.
  }

  snapshot(): Promise<string> {
    const canvas = this.canvas;
    if (!canvas) {
      return Promise.reject(new Error('renderer.snapshot: call mount() before snapshot()'));
    }
    return Promise.resolve(canvas.toDataURL('image/png'));
  }

  onCompile(cb: (r: CompileResult) => void): () => void {
    this.compileSubs.add(cb);
    return () => {
      this.compileSubs.delete(cb);
    };
  }

  getFps(): number {
    return this.fpsCounter.get();
  }

  private notifySubs(result: CompileResult): void {
    for (const cb of this.compileSubs) cb(result);
  }

  private attachPointerListeners(host: HTMLElement): void {
    const fromPoint = (clientX: number, clientY: number): void => {
      const r = host.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      this.mouseX = clamp01((clientX - r.left) / r.width);
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
    if (!gl || !canvas) return;

    const now = performance.now();
    this.fpsCounter.tick(now);

    if (this.fpsWatchdog.shouldHalve(this.fpsCounter.get(), now)) {
      const next = halveBufferSize({ width: canvas.width, height: canvas.height });
      this.resize(next.width, next.height);
      this.fpsCounter.reset();
      console.warn(
        `[shaddy renderer] fps below threshold for >2s — halved drawing buffer to ${next.width}x${next.height}. ` +
          `Subscribe to onCompile / poll getFps() for further perf insight.`,
      );
    }

    // Multi-pass branch — render the buffer passes into their write FBOs,
    // swap each pair after its draw, then render the image pass to the
    // default framebuffer. Cross-pass sampling sees the most-recent frame's
    // output (because the previous pass already swapped); same-pass
    // sampling sees the PREVIOUS frame's output (we sample read BEFORE
    // swapping, even though we draw into write).
    if (this.multiPasses) {
      // Make sure FBOs match current canvas size — they're re-allocated
      // lazily here so resize() doesn't have to know about them.
      for (const id of this.fbos.keys()) this.ensureFboPair(id);
      const timeSec = (now - this.startTime) / 1000;
      for (const pass of this.multiPasses) {
        if (pass.id === 'image') {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, canvas.width, canvas.height);
        } else {
          const pair = this.fbos.get(pass.id);
          if (!pair) continue;
          gl.bindFramebuffer(gl.FRAMEBUFFER, pair.write.fb);
          gl.viewport(0, 0, pair.width, pair.height);
        }
        gl.useProgram(pass.program);
        if (pass.stdLocs.uTime) gl.uniform1f(pass.stdLocs.uTime, timeSec);
        if (pass.stdLocs.uResolution) gl.uniform2f(pass.stdLocs.uResolution, canvas.width, canvas.height);
        if (pass.stdLocs.uMouse) gl.uniform2f(pass.stdLocs.uMouse, this.mouseX, this.mouseY);
        this.applyCallerUniformsToProgram(pass.program);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        // Ping-pong swap: after this pass drew into `write`, swap so the
        // texture we just produced becomes the readable one for the NEXT
        // frame (or for any LATER pass this frame sampling cross-pass).
        if (pass.id !== 'image') {
          const pair = this.fbos.get(pass.id)!;
          const tmp = pair.read;
          pair.read = pair.write;
          pair.write = tmp;
        }
      }
      this.rafHandle = requestAnimationFrame(this.loop);
      return;
    }

    // Single-pass branch — original code path.
    const program = this.program;
    const locs = this.stdLocs;
    if (!program || !locs) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);

    if (locs.uTime) {
      gl.uniform1f(locs.uTime, (now - this.startTime) / 1000);
    }
    if (locs.uResolution) {
      gl.uniform2f(locs.uResolution, canvas.width, canvas.height);
    }
    if (locs.uMouse) {
      gl.uniform2f(locs.uMouse, this.mouseX, this.mouseY);
    }

    this.applyCallerUniformsToProgram(program);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.rafHandle = requestAnimationFrame(this.loop);
  };

  /** Apply every caller-set uniform to `program`. Handles standard scalar
   *  uniforms, sampler2D (live texture bindings), and sampler2D-buffer
   *  (multi-pass FBO references). No-op for uniforms the program doesn't
   *  actually declare (getUniformLocation returns null). */
  private applyCallerUniformsToProgram(program: WebGLProgram): void {
    const gl = this.gl;
    if (!gl) return;
    for (const [name, u] of this.uniforms) {
      const loc = gl.getUniformLocation(program, name);
      if (loc === null) continue;
      if (u.kind === 'sampler2D') {
        const entry = this.textures.get(name);
        if (!entry) continue;
        const isVideo = typeof HTMLVideoElement !== 'undefined'
          && entry.source instanceof HTMLVideoElement;
        if (isVideo && (entry.source as HTMLVideoElement).readyState >= 2) {
          gl.activeTexture(gl.TEXTURE0 + entry.unit);
          gl.bindTexture(gl.TEXTURE_2D, entry.tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          try {
            gl.texImage2D(
              gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
              entry.source as TexImageSource,
            );
          } catch { /* stream not ready */ }
        } else {
          gl.activeTexture(gl.TEXTURE0 + entry.unit);
          gl.bindTexture(gl.TEXTURE_2D, entry.tex);
        }
        gl.uniform1i(loc, entry.unit);
        continue;
      }
      if (u.kind === 'sampler2D-buffer') {
        const pair = this.fbos.get(u.value as BufferId);
        if (!pair) continue;
        // Buffer-FBO references claim a texture unit on the fly. We grab
        // one per sampler name (consistent across frames so we don't churn
        // unit numbers) — kept in the same `textures` map but with a
        // dummy source the upload path never touches.
        let unit = this.bufferSamplerUnits.get(name);
        if (unit === undefined) {
          unit = this.nextTextureUnit++;
          this.bufferSamplerUnits.set(name, unit);
        }
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, pair.read.tex);
        gl.uniform1i(loc, unit);
        continue;
      }
      applyUniform(gl, loc, u);
    }
  }

  // Texture-unit registry for sampler2D-buffer uniforms. Kept separate from
  // `this.textures` because those entries own a TextureSource we'd never
  // upload for an FBO reference.
  private bufferSamplerUnits = new Map<string, number>();

  private teardown(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.detachPointerListeners();
    this.fpsCounter.reset();
    this.fpsWatchdog = new FpsWatchdog();
    if (this.gl) {
      for (const entry of this.textures.values()) this.gl.deleteTexture(entry.tex);
    }
    this.textures.clear();
    this.nextTextureUnit = 0;
    this.bufferSamplerUnits.clear();
    this.teardownMultiPass();
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
}

function applyUniform(gl: WebGL2RenderingContext, loc: WebGLUniformLocation, u: Uniform): void {
  switch (u.kind) {
    case 'float':
      gl.uniform1f(loc, u.value);
      return;
    case 'vec2':
      gl.uniform2f(loc, u.value[0], u.value[1]);
      return;
    case 'vec3':
      gl.uniform3f(loc, u.value[0], u.value[1], u.value[2]);
      return;
    case 'vec4':
      gl.uniform4f(loc, u.value[0], u.value[1], u.value[2], u.value[3]);
      return;
    case 'sampler2D':
    case 'sampler2D-buffer':
      // Texture-backed uniforms are bound in the per-frame loop (which owns
      // the texture-unit registry); these cases are unreachable but kept
      // for exhaustiveness so future Uniform variants must update this
      // switch.
      return;
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
