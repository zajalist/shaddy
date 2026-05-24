// Cards reference — Building your own card.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong, Callout } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const CARD = `// cards/library/sun-rays.ts
import type { CardDef } from '../types';

export const SUN_RAYS: CardDef = {
  // 1. The lookup key. Lowercase snake_case; must match the key the
  //    reverse parser will write into the GLSL marker. Stable forever.
  type: 'sun_rays',

  // 2. Which category bucket the UI filters under.
  category: 'effect',

  // 3. Human-facing label in the picker / inspector. Title case ok.
  friendlyName: 'Sun rays',

  // 4. One-sentence description shown under the friendlyName.
  description: 'Radial rays emanating from a point, modulated by hash noise.',

  // 5. Emoji shown on the card tile when no SVG icon is registered.
  icon: '☀️',

  // 6. The param schema. One ParamDef per knob; one uniform per param.
  params: {
    cx: { kind: 'float', label: 'centre x', default: 0,    min: -1, max: 1, step: 0.01 },
    cy: { kind: 'float', label: 'centre y', default: 0,    min: -1, max: 1, step: 0.01 },
    n:  { kind: 'float', label: 'count',    default: 12,   min: 4,  max: 64, step: 1   },
    intensity: { kind: 'float', label: 'intensity', default: 0.6, min: 0, max: 2, step: 0.01 },
  },

  // 7. The GLSL body, emitted into main() between this card's markers.
  //    {{key}} placeholders substitute to the uniform name at compile time.
  //    Read 'uv' and 'col'; write 'col'. Don't redeclare locals.
  snippetTemplate: \`
    {
      vec2 q = uv - vec2({{cx}}, {{cy}});
      float a = atan(q.y, q.x);
      float rays = 0.5 + 0.5 * cos({{n}} * a);
      // jitter so the rays don't look CG-perfect
      rays *= 0.7 + 0.3 * hash21(vec2(floor({{n}} * a * 0.1591), 0.0));
      col += {{intensity}} * rays * (1.0 - smoothstep(0.0, 0.8, length(q)));
    }
  \`,

  // 8. Helpers this card uses. The compiler emits each helper once
  //    in the union of all cards' helpers, with deps closed.
  helpers: ['hash21'],
};`;

const REGISTER = `// cards/library/index.ts — register the new card so it ships.
import { SUN_RAYS } from './sun-rays';

export const CARD_LIBRARY_LIST: CardDef[] = [
  // ... existing cards ...
  SUN_RAYS,   // sub-group: pick where it sits visually in the picker
];`;

const page: DocPage = {
  id: 'building-your-own-card',
  title: 'Building your own card',
  groupLabel: 'Cards reference',
  lede: 'One file in cards/library/. Compiler, UI, and reverse parser pick it up automatically.',
  body: (
    <>
      <P>
        Adding a card is content work, not engineering work. The schema is
        small, the compiler discovers it through the central list, and the
        UI builds the inspector from the param defs. No registration step
        beyond the import.
      </P>

      <H2>Anatomy of a CardDef</H2>
      <P>
        An annotated walk-through. Comment numbers correspond to the eight
        required fields:
      </P>
      <CodeBlock language="ts" source={CARD} />

      <H2>Registering the card</H2>
      <CodeBlock language="ts" source={REGISTER} />
      <P>
        Order matters in <Code>CARD_LIBRARY_LIST</Code> — it drives the
        order the "+ add card" picker shows cards in. Group the new card
        next to its siblings (similar category, similar sub-theme); the
        Library page also reads this list and uses position as a hint for
        where to place it.
      </P>

      <H2>The hard rules</H2>
      <OL>
        <LI>
          <Strong>The snippet must reference every declared param.</Strong>{' '}
          <Code>library.test.ts</Code> walks every <Code>CardDef</Code> and
          asserts each <Code>{'{{key}}'}</Code> in <Code>params</Code>{' '}
          appears at least once in <Code>snippetTemplate</Code>. The
          compiler emits a uniform per param regardless, so dead params
          would silently waste a uniform slot.
        </LI>
        <LI>
          <Strong>The snippet must not redeclare <Code>uv</Code>,{' '}
          <Code>d</Code>, <Code>col</Code></Strong>, or any other local the
          template already provides. Mutate them; don't shadow them. Wrap
          your body in <Code>{'{ ... }'}</Code> if you want local scope.
        </LI>
        <LI>
          <Strong>Stable <Code>type</Code> forever.</Strong> Once a card
          ships, its <Code>type</Code> string is part of the recipe wire
          format. Renaming it would silently turn every saved recipe's
          card into "unknown type". If you must rename, add a wire-format
          migrator at recipe-load time.
        </LI>
      </OL>

      <Callout>
        <Strong>3D cards</Strong> set <Code>mode: '3d'</Code> and supply a{' '}
        <Code>contribution3d</Code> object instead of a real{' '}
        <Code>snippetTemplate</Code>. The template field still has to be
        non-empty and reference every param (the same test rule applies),
        but the compiler ignores it — see <Term>The compiler · 3D
        raymarching template</Term> for the contract.
      </Callout>
    </>
  ),
};

export default page;
