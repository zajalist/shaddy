// The compiler — Pipeline overview.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const SHAPE = `recipe ─┐
        │  compile()
        ▼
 CompiledShader {
   glsl:     string;          // ready for renderer.compile()
   spans:    Span[];          // one per card, marker line ranges
   uniforms: UniformBinding[];// integration pushes these per frame
 }`;

const page: DocPage = {
  id: 'pipeline-overview',
  title: 'Pipeline overview',
  groupLabel: 'The compiler',
  lede: 'Recipe → AST walk → templated GLSL emission. One pure function, no I/O.',
  body: (
    <>
      <P>
        <Code>compile(recipe)</Code> is a pure function. Given a{' '}
        <Code>Recipe</Code> it returns a <Code>CompiledShader</Code> — the
        full fragment source string, the per-card source spans, and the list
        of uniforms the integration layer should push each frame. No
        filesystem, no network, no DOM. Reasoning about correctness only
        requires reasoning about the input.
      </P>

      <CodeBlock language="text" source={SHAPE} />

      <H2>The walk</H2>
      <OL>
        <LI>
          <Strong>Dispatch on mode.</Strong> <Code>recipe.mode === '3d'</Code>{' '}
          routes to <Code>compile3d</Code>; everything else to{' '}
          <Code>compile2d</Code>. Both paths produce the same{' '}
          <Code>CompiledShader</Code> shape — only the template differs.
        </LI>
        <LI>
          <Strong>Resolve cards.</Strong> Iterate over{' '}
          <Code>recipe.cards</Code>, skip disabled entries, look up each
          typed card's <Code>CardDef</Code> in the library. Unknown card
          types degrade gracefully — they become a no-op comment block.
        </LI>
        <LI>
          <Strong>Collect helpers.</Strong> Union together the{' '}
          <Code>helpers</Code> arrays of every active card def, then close
          transitively over <Code>HELPER_DEPS</Code> so a card that uses{' '}
          <Code>fbm2</Code> implicitly pulls in <Code>noise2</Code> and{' '}
          <Code>hash21</Code>. The set is emitted exactly once in fixed
          dependency order at the top of the shader.
        </LI>
        <LI>
          <Strong>Emit uniforms.</Strong> For each active card, emit one{' '}
          <Code>uniform &lt;type&gt; u_card&lt;i&gt;_&lt;paramKey&gt;;</Code>{' '}
          per param, plus the global uniforms{' '}
          (<Code>u_resolution</Code>, <Code>u_time</Code>,{' '}
          <Code>u_mouse</Code>, and the 3D-only camera trio).
        </LI>
        <LI>
          <Strong>Emit main().</Strong> Walk the cards again, writing each
          card's snippet body inside a marker block that the reverse parser
          will later read. Wrap the body in the blend snapshot when{' '}
          <Code>alpha</Code> or <Code>blendMode</Code> differ from their
          defaults.
        </LI>
        <LI>
          <Strong>Record spans.</Strong> While emitting, track each card's
          marker start line and final body line. The{' '}
          <Code>spans</Code> array on the output lets the UI highlight which
          GLSL lines belong to which card, and lets the reverse parser
          carve the source into per-card slices.
        </LI>
      </OL>

      <H2>Markers</H2>
      <P>
        Each card's body sits inside two comment markers — a{' '}
        <Code>//#card &lt;cardId&gt;</Code> header (with a stable id the
        recipe also carries) and a sentinel newline closing the block. The
        markers are how the reverse parser knows where one card ends and the
        next begins; they're also visible in the code drawer to give the
        user a visual anchor for which lines they're editing. The{' '}
        <Term>reverse parser</Term> is the inverse of step 5 + 6 — it reads
        the markers, slices the source, normalises whitespace, and emits a{' '}
        <Code>ReparseEvent</Code> per recognised change.
      </P>

      <H2>What this enables</H2>
      <P>
        Because the compiler is pure, the integration layer can call it on
        every recipe mutation without worrying about state leaks. Because
        the output carries spans and uniforms — not just GLSL — the
        renderer can hot-swap the program <Strong>and</Strong> the value
        pump in a single call. And because every card's body lives between
        markers, the user gets to drop into the GLSL at any point and the
        recipe stays coherent.
      </P>
    </>
  ),
};

export default page;
