// Renderer public surface — DO NOT IMPORT ANYTHING ELSE FROM renderer/.
// See CONTRACTS.md §1 for the locked contract.
//
// The implementation lives in this folder's private files; consumers only
// see what is re-exported here. This file is the boundary the editor, ux,
// and integration tracks code against — keep it stable.

export type CompileResult = { ok: true } | { ok: false; errors: GLSLError[] };

export type GLSLError = {
  /** 1-based, in user source coordinates (not the wrapped source the GL driver sees). */
  line: number;
  column: number;
  message: string;
};

export type Uniform =
  | { kind: 'float'; value: number }
  | { kind: 'vec2'; value: [number, number] }
  | { kind: 'vec3'; value: [number, number, number] }
  | { kind: 'vec4'; value: [number, number, number, number] }
  | { kind: 'sampler2D'; value: TextureSource }
  /** A reference to one of the multi-pass buffer FBOs. The renderer resolves
   *  the buffer id to the LAST-rendered (or, for same-pass self-reference,
   *  the previous-frame ping-pong) texture. Cards use this kind when their
   *  ParamDef is `kind: 'buffer'`. */
  | { kind: 'sampler2D-buffer'; value: 'a' | 'b' | 'c' | 'd' };

/** Source data the `sampler2D` uniform can be backed by. Renderer uploads
 *  these via texImage2D on first set, and re-uploads every frame when the
 *  source is a (likely-moving) <video>. */
export type TextureSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | ImageBitmap;

/** One pass in a multi-pass pipeline. The renderer compiles each pass into
 *  its own GLSL program, allocates an offscreen FBO (or pair, for
 *  ping-pong'd buffer passes) per non-image pass, and runs them in order
 *  every frame. */
export type MultiPassDef = {
  id: 'image' | 'a' | 'b' | 'c' | 'd';
  fragmentSource: string;
};

/** Result of a multi-pass compile — one ok/error per pass. The renderer
 *  hot-swaps the WHOLE pipeline atomically (only when every pass compiles
 *  successfully); on any failure the previous pipeline keeps running. */
export type CompileMultiResult =
  | { ok: true }
  | { ok: false; failures: Array<{ id: MultiPassDef['id']; errors: GLSLError[] }> };

export interface RendererAPI {
  /** Attach the WebGL canvas to a host element. Idempotent. */
  mount(host: HTMLElement): void;

  /** Compile a new fragment shader. Hot-swaps on success; keeps last good on failure. */
  compile(fragmentSource: string): CompileResult;

  /** Compile a multi-pass pipeline. The renderer runs the passes in array
   *  order each frame; buffer passes (id ≠ 'image') write into ping-pong'd
   *  FBOs; the final 'image' pass renders to the screen. Hot-swaps the
   *  whole pipeline atomically — any failure preserves the previous one. */
  compileMulti(passes: MultiPassDef[]): CompileMultiResult;

  /** Set or clear a named uniform. Persists across compiles. */
  setUniform(name: string, value: Uniform | null): void;

  /** Resize the drawing buffer. Caller decides device-pixel-ratio policy. */
  resize(width: number, height: number): void;

  /** Read back the current frame as PNG data URL. For thumbnails & share preview. */
  snapshot(): Promise<string>;

  /** Subscribe to compile events. Returns an unsubscribe function. */
  onCompile(cb: (r: CompileResult) => void): () => void;

  /** Frame-per-second over the last second. UX shows it on debug. */
  getFps(): number;
}

// Lens stack — Tier 2, additive contract.
export interface LensStackAPI {
  /** Render the same shader N times, each time discarding after the given line. */
  capture(fragmentSource: string, breakLines: number[]): Promise<string[]>;
}

export { createRenderer } from './runtime';
export { createLensStack } from './lens-stack';
export { TEMPLATES, generateThumbnails } from './templates/manifest';
export type { Template } from './templates/manifest';

// Preamble metadata — the renderer prepends this to every user source before
// sending to the GL driver. Consumers showing the source to the user (e.g.
// the cards code-view) wrap with it so the preamble shows as read-only
// scaffolding above the editable card body.
export { FRAGMENT_PREAMBLE, USER_LINE_OFFSET, wrapFragmentSource } from './gl/preamble';
