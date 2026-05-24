// Getting started — Quick start.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const RECIPE = `// Three cards: a soft circle, a cosine palette, and a vignette.
{
  "canvasAspect": "square",
  "mode": "2d",
  "cards": [
    { "kind": "typed", "id": "c1", "type": "radial_gradient",
      "enabled": true,
      "params": { "softness": { "value": 1.2, "animation": null } } },
    { "kind": "typed", "id": "c2", "type": "cosine_palette",
      "enabled": true,
      "params": {} },
    { "kind": "typed", "id": "c3", "type": "vignette",
      "enabled": true,
      "params": { "amount": { "value": 0.55, "animation": null } } }
  ]
}`;

const page: DocPage = {
  id: 'quick-start',
  title: 'Quick start',
  groupLabel: 'Getting started',
  lede: 'Open the composer, drop three cards, see something. Five minutes.',
  body: (
    <>
      <H2>1. Open the composer</H2>
      <P>
        Navigate to <Code>/design</Code>. The desktop layout is three panes:
        the card stack on the left, the live canvas in the middle, and a
        property inspector on the right. Below the canvas you'll see the
        emitted GLSL — that view is editable and updates in lockstep with the
        cards.
      </P>

      <H2>2. Drop three cards</H2>
      <OL>
        <LI>
          Click <Code>+ add card</Code> in the left stack, pick{' '}
          <Strong>shapes → radial gradient</Strong>. The canvas fills with a
          soft greyscale falloff. The card writes into <Code>d</Code> (the
          distance accumulator) — there is no colour yet.
        </LI>
        <LI>
          Add another card, this time <Strong>colors → cosine palette</Strong>.
          The greyscale becomes a parametric ramp; the card reads{' '}
          <Code>d</Code> and writes <Code>col</Code>.
        </LI>
        <LI>
          Add <Strong>effects → vignette</Strong> on top. The corners darken.
          The card multiplies <Code>col</Code> by a radial falloff.
        </LI>
      </OL>

      <H2>3. Tweak parameters</H2>
      <P>
        Click any card to expand it in the inspector. Drag the softness slider
        — the canvas reflows immediately because parameter changes ride the
        uniform fast path (no recompile, see{' '}
        <Term>The renderer · Uniforms</Term>). Try clamping softness to{' '}
        <Code>0.6</Code> and you'll see the gradient tighten to a hard disk.
      </P>

      <H2>4. Peek at the GLSL</H2>
      <P>
        Open the code drawer at the bottom of the canvas. You'll see roughly
        100 lines of GLSL: a preamble of uniforms set by the renderer, the
        emission of the four cosine-palette helper functions used by your
        recipe, and the <Code>main()</Code> body with one delimited region
        per card. Edit a numeric literal inside the radial-gradient block —
        the slider in the inspector follows. Edit it into something the
        parser can't match and watch the card downgrade to a wildcard.
      </P>

      <H2>5. Save the recipe</H2>
      <P>
        Recipes are plain JSON. Hit <Code>⌘&nbsp;S</Code> to copy a share URL
        with the recipe encoded into the fragment. Anyone you send it to
        loads the exact pixels you're looking at. The full recipe for the
        three cards above:
      </P>
      <CodeBlock language="json" source={RECIPE} />

      <P>
        That's the loop — drop cards, tweak, edit code, share. Read the{' '}
        <Term>Recipe model</Term> next for what's inside that JSON, or jump
        to the <Term>Tutorials</Term> for guided walks.
      </P>
    </>
  ),
};

export default page;
