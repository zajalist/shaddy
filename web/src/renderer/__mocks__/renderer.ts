// Drop-in fake RendererAPI for downstream tracks that want to build without
// WebGL. See CONTRACTS.md §1 "test harness" clause and issue #11.
//
// Behaviour, per spec:
//   - mount(host)          → appends an animated CSS-gradient <div>
//   - compile()            → always returns { ok: true }
//   - snapshot()           → resolves to a small fixed PNG data URL
//   - onCompile(cb)        → fires once on first compile (every subscriber
//                            gets exactly one call; late subscribers fire
//                            immediately if compile has already happened)
//   - setUniform / resize  → accepted, no-op (CSS handles sizing)
//   - getFps()             → constant 60

import type { CompileMultiResult, CompileResult, MultiPassDef, RendererAPI, Uniform } from '../index';

// 1x1 transparent PNG, base64-encoded. Tiny, valid, and never throws on decode.
const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';

const KEYFRAMES_ID = 'shaddy-mock-renderer-keyframes';

function ensureKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent =
    '@keyframes shaddy-mock-gradient {' +
    '  0%   { background-position:   0% 50%; }' +
    '  50%  { background-position: 100% 50%; }' +
    '  100% { background-position:   0% 50%; }' +
    '}';
  document.head.appendChild(style);
}

function createSurface(): HTMLDivElement {
  const div = document.createElement('div');
  div.dataset.shaddyMock = 'true';
  Object.assign(div.style, {
    width: '100%',
    height: '100%',
    backgroundImage: 'linear-gradient(120deg, #6366f1, #ec4899, #f59e0b)',
    backgroundSize: '300% 300%',
    animation: 'shaddy-mock-gradient 12s ease-in-out infinite',
  } satisfies Partial<CSSStyleDeclaration>);
  return div;
}

export function createRenderer(): RendererAPI {
  let host: HTMLElement | null = null;
  let surface: HTMLDivElement | null = null;
  let firstCompileResult: CompileResult | null = null;
  const subscribers = new Set<(r: CompileResult) => void>();

  return {
    mount(nextHost) {
      if (host === nextHost) return;
      host = nextHost;
      ensureKeyframes();
      surface ??= createSurface();
      if (surface.parentElement !== nextHost) {
        nextHost.appendChild(surface);
      }
    },

    compile(_fragmentSource) {
      const result: CompileResult = { ok: true };
      if (firstCompileResult === null) {
        firstCompileResult = result;
        for (const cb of subscribers) cb(result);
      }
      return result;
    },

    compileMulti(_passes: MultiPassDef[]): CompileMultiResult {
      // Mock pretends every pass compiles cleanly; the design doc says
      // downstream tracks should be able to build without WebGL.
      const result: CompileResult = { ok: true };
      if (firstCompileResult === null) {
        firstCompileResult = result;
        for (const cb of subscribers) cb(result);
      }
      return { ok: true };
    },

    setUniform(_name: string, _value: Uniform | null): void {
      // no-op — the mock doesn't render shader inputs.
    },

    resize(_width: number, _height: number): void {
      // no-op — the CSS gradient fills its parent.
    },

    snapshot(): Promise<string> {
      return Promise.resolve(TINY_PNG_DATA_URL);
    },

    onCompile(cb) {
      subscribers.add(cb);
      if (firstCompileResult !== null) cb(firstCompileResult);
      return () => {
        subscribers.delete(cb);
      };
    },

    getFps(): number {
      return 60;
    },
  };
}
