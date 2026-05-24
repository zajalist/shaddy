// Cards reference — Helpers.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const ADD = `// cards/library/helpers.ts

export const GLSL_HELPERS: Record<string, string> = {
  // ... existing helpers ...

  // New helper — exact key matches what cards put in CardDef.helpers.
  // Body is plain GLSL. Don't include 'highp' / 'precision' qualifiers
  // (the preamble already sets them).
  starRays: \`
    float starRays(vec2 p, float n, float jitter) {
      float a = atan(p.y, p.x);
      float r = 0.5 + 0.5 * cos(n * a);
      return r * mix(1.0, hash21(vec2(floor(n * a * 0.16), 0.0)), jitter);
    }
  \`,
};

export const HELPER_DEPS: Record<string, string[]> = {
  // ...
  starRays: ['hash21'],     // transitive — pulled in automatically
};

export const HELPER_EMISSION_ORDER: readonly string[] = [
  // ... insert in dependency order:
  'hash21',
  'starRays',
  // ...
];`;

const USE = `// cards/library/sun-rays.ts
export const SUN_RAYS: CardDef = {
  type: 'sun_rays',
  // ...
  snippetTemplate: \`
    col += {{intensity}} * starRays(uv - vec2({{cx}}, {{cy}}), {{n}}, 0.3);
  \`,
  helpers: ['starRays'],   // hash21 comes along transitively
};`;

const page: DocPage = {
  id: 'helpers',
  title: 'Helpers — adding to helpers.ts',
  groupLabel: 'Cards reference',
  lede: 'Reusable GLSL functions emitted once per shader. Three lists, in lockstep.',
  body: (
    <>
      <P>
        When a snippet repeats across multiple cards, lift it into a
        helper. The compiler emits each helper exactly once at the top of
        the shader, even if a dozen cards declare it. Three exports in{' '}
        <Code>cards/library/helpers.ts</Code> stay in sync:
      </P>

      <OL>
        <LI>
          <Strong><Code>GLSL_HELPERS</Code></Strong> — the function bodies,
          keyed by name. The name is what cards put in their{' '}
          <Code>CardDef.helpers</Code> array.
        </LI>
        <LI>
          <Strong><Code>HELPER_DEPS</Code></Strong> — which helpers your
          helper itself depends on. The compiler closes transitively so
          your card only needs to declare what it calls directly.
        </LI>
        <LI>
          <Strong><Code>HELPER_EMISSION_ORDER</Code></Strong> — the order
          they're emitted in. Dependents must come after dependencies.
        </LI>
      </OL>

      <H2>Adding a helper end-to-end</H2>
      <CodeBlock language="ts" source={ADD} />

      <H2>Using it from a card</H2>
      <CodeBlock language="ts" source={USE} />

      <H2>Rules of thumb</H2>
      <P>
        <Strong>Lift when two or more cards want the same thing.</Strong>{' '}
        Don't pre-emptively. One-off snippets stay inline in the card —
        the compiler doesn't gain anything from a one-card helper, and the
        emitted shader gets less readable.
      </P>
      <P>
        <Strong>Keep helpers pure.</Strong> Read parameters, return values
        — don't write to <Code>col</Code> or <Code>d</Code> inside a
        helper. The shader you see in the code drawer is the user's window
        into what's happening; opaque helper side-effects make it harder
        to read.
      </P>
      <P>
        <Strong>3D helpers that reference sdScene</Strong> — like{' '}
        <Code>sceneNormal3</Code> and <Code>softShadow3</Code> — must be
        listed in <Code>HELPERS_AFTER_SCENE</Code> in the same file. The
        3D compiler emits them after <Code>sdScene</Code> is in scope; the
        2D compiler ignores them entirely.
      </P>
    </>
  ),
};

export default page;
