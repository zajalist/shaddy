// Raw fragment-shader preview for the Learn page.
//
// The composer / Library pages use <RecipeCanvas/> which goes through the
// cards Recipe → compile() pipeline. Learn is different: each lesson is a
// short, self-contained GLSL fragment that the user is hand-editing. So we
// bypass cards entirely and feed raw source straight to the renderer.
//
// The renderer's gl/preamble injects `v_uv`, `fragColor`, `u_time`,
// `u_resolution`, `u_mouse` for us — lessons write only the body.
//
// Exposes:
//   - source: GLSL fragment body (with main, no #version line)
//   - onCompileResult: surface errors back to LessonEditor so it can show
//     a tiny inline error pill
//   - sampleRef: lets the parent grab the underlying canvas for pixel checks

import { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { CSSProperties, Ref } from 'react';

import { createRenderer, type CompileResult, type RendererAPI } from '@/renderer';

export type RawShaderCanvasHandle = {
  /** Read back the current frame into a Uint8Array (RGBA). */
  readPixels: () => { pixels: Uint8Array; width: number; height: number } | null;
  /** Get the underlying canvas (if mounted). Stable across renders. */
  getCanvas: () => HTMLCanvasElement | null;
};

export type RawShaderCanvasProps = {
  /** GLSL fragment body (no #version, no precision — preamble adds those). */
  source: string;
  /** Reported on every compile attempt. */
  onCompileResult?: (r: CompileResult) => void;
  /** Imperative handle for pixel sampling at Check time. */
  handleRef?: Ref<RawShaderCanvasHandle>;
  style?: CSSProperties;
  className?: string;
};

export const RawShaderCanvas = ({
  source,
  onCompileResult,
  handleRef,
  style,
  className,
}: RawShaderCanvasProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompileRef = useRef(onCompileResult);
  useEffect(() => { onCompileRef.current = onCompileResult; }, [onCompileResult]);

  // Mount once. Same wipe + remount pattern as RecipeCanvas so StrictMode
  // double-invokes don't stack canvases.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    const r = createRenderer();
    r.mount(host);
    rendererRef.current = r;
    // Grab the canvas the renderer just inserted so we can readPixels later.
    canvasRef.current = host.querySelector('canvas');

    const applyDprSize = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = Math.max(1, Math.floor(host.clientWidth * dpr));
      const h = Math.max(1, Math.floor(host.clientHeight * dpr));
      r.resize(w, h);
    };
    applyDprSize();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => applyDprSize())
      : null;
    if (ro) ro.observe(host);

    return () => {
      if (ro) ro.disconnect();
      host.replaceChildren();
      rendererRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  // Recompile whenever source changes. Light debounce via useMemo so a flood
  // of keystrokes only triggers one compile per source value.
  const compiledKey = useMemo(() => source, [source]);
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const result = r.compile(compiledKey);
    onCompileRef.current?.(result);
  }, [compiledKey]);

  useImperativeHandle(handleRef, () => ({
    readPixels: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!gl) return null;
      const w = canvas.width;
      const h = canvas.height;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { pixels, width: w, height: h };
    },
    getCanvas: () => canvasRef.current,
  }), []);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ ...style, position: style?.position ?? 'relative', overflow: 'hidden' }}
    />
  );
};

/** Sample one pixel from a readPixels result. (x, y) in [0..1] — (0,0) is bottom-left,
 *  matching GL's framebuffer origin. Returns RGBA in [0..1] floats. */
export function samplePixel(
  buf: { pixels: Uint8Array; width: number; height: number },
  u: number,
  v: number,
): [number, number, number, number] {
  const x = Math.min(buf.width - 1, Math.max(0, Math.floor(u * buf.width)));
  const y = Math.min(buf.height - 1, Math.max(0, Math.floor(v * buf.height)));
  const i = (y * buf.width + x) * 4;
  return [
    (buf.pixels[i]     ?? 0) / 255,
    (buf.pixels[i + 1] ?? 0) / 255,
    (buf.pixels[i + 2] ?? 0) / 255,
    (buf.pixels[i + 3] ?? 0) / 255,
  ];
}

/** Luminance of an RGBA sample (Rec.709). */
export function luma(rgba: readonly [number, number, number, number]): number {
  return 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2];
}
