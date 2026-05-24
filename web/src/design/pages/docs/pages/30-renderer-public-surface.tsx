// The renderer — Public surface.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const API = `// web/src/renderer/index.ts — the entire stable surface.
export interface RendererAPI {
  mount(host: HTMLElement): void;

  compile(fragmentSource: string): CompileResult;
  setUniform(name: string, value: Uniform | null): void;
  resize(width: number, height: number): void;
  snapshot(): Promise<string>;
  onCompile(cb: (r: CompileResult) => void): () => void;
  getFps(): number;
}

export type CompileResult =
  | { ok: true }
  | { ok: false; errors: GLSLError[] };

export type Uniform =
  | { kind: 'float'; value: number }
  | { kind: 'vec2';  value: [number, number] }
  | { kind: 'vec3';  value: [number, number, number] }
  | { kind: 'vec4';  value: [number, number, number, number] };

export { createRenderer } from './runtime';`;

const page: DocPage = {
  id: 'renderer-public-surface',
  title: 'WebGL2 + the public surface',
  groupLabel: 'The renderer',
  lede: 'Eight methods on RendererAPI. Everything else lives behind the boundary.',
  body: (
    <>
      <P>
        The renderer is a thin, opinionated wrapper around a single WebGL2
        fullscreen-triangle pass. Consumers see only what{' '}
        <Code>web/src/renderer/index.ts</Code> re-exports — every other
        file in the renderer folder is implementation detail and may
        change. This is the boundary the editor, the cards UI, and the
        integration layer are coded against.
      </P>

      <H2>The interface</H2>
      <CodeBlock language="ts" source={API} />

      <H2>Method-by-method</H2>
      <UL>
        <LI>
          <Strong><Code>mount(host)</Code></Strong> — attach the GL canvas
          to a host DOM node. Idempotent; calling it again moves the canvas.
        </LI>
        <LI>
          <Strong><Code>compile(fragmentSource)</Code></Strong> — compile a
          new fragment shader. Hot-swaps on success; on failure returns the
          error list and keeps the last-good program running. Throws
          nothing.
        </LI>
        <LI>
          <Strong><Code>setUniform(name, value)</Code></Strong> — set or
          clear a named uniform. Persists across compiles so a recipe
          structural change (which triggers a recompile) doesn't drop the
          per-frame uniform values. Passing <Code>null</Code> clears it.
        </LI>
        <LI>
          <Strong><Code>resize(w, h)</Code></Strong> — resize the drawing
          buffer. Caller decides DPR policy — the renderer doesn't read{' '}
          <Code>devicePixelRatio</Code> on its own.
        </LI>
        <LI>
          <Strong><Code>snapshot()</Code></Strong> — read back the current
          frame as a PNG data URL. Used for thumbnails and share previews;
          forces a sync draw so the returned image matches the just-set
          uniforms.
        </LI>
        <LI>
          <Strong><Code>onCompile(cb)</Code></Strong> — subscribe to
          compile events. Returns an unsubscribe function. Used by the
          GLSL error gutter and the AI panel.
        </LI>
        <LI>
          <Strong><Code>getFps()</Code></Strong> — frame rate over the last
          second. The mobile-perf module reads this to decide when to drop
          DPR.
        </LI>
      </UL>

      <H2>Lens stack — additive contract</H2>
      <P>
        Tier-2 API for capturing the same shader at multiple "cuts" through{' '}
        <Code>main()</Code>. <Code>createLensStack().capture(source, breakLines)</Code>{' '}
        runs the shader N times, each time injecting an early <Code>discard</Code>{' '}
        after the requested break line, and returns one PNG per cut. Used
        by the "step through" view that visualises what the canvas would
        look like with only the first K cards active.
      </P>

      <H2>What lives behind the boundary</H2>
      <P>
        Implementation details — the WebGL2 context creation, the FBO
        chain, the fullscreen-triangle vertex array, the uniform
        bookkeeping, the FPS sampler, the perf-mode policy — are all in
        files that <Term>nothing outside the renderer folder</Term> may
        import. ESLint's boundary rule enforces this; see CONTRACTS.md §1
        for the locked contract.
      </P>
    </>
  ),
};

export default page;
