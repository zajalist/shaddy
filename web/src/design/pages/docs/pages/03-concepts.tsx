// Getting started — Concepts.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';

const page: DocPage = {
  id: 'concepts',
  title: 'Concepts',
  groupLabel: 'Getting started',
  lede: 'Five words and you have the whole system: recipe, card, chain, blend, portal. Everything else hangs off these.',
  body: (
    <>
      <H2>Recipe</H2>
      <P>
        A <Term>recipe</Term> is the entire authoring state — what the user
        composed. Concretely it's a flat <Code>Card[]</Code> array plus three
        top-level knobs (<Code>canvasAspect</Code>, <Code>mode</Code>, and
        the order itself). Recipes serialise as JSON, ride share URLs, and
        round-trip cleanly through the reverse parser. Two recipes that are
        deeply equal produce byte-identical GLSL.
      </P>

      <H2>Card</H2>
      <P>
        A <Term>card</Term> is one step in the recipe. Two flavours:
      </P>
      <UL>
        <LI>
          <Strong>Typed.</Strong> Points at a <Code>CardDef</Code> in the
          library by <Code>type</Code>. Carries values for the def's params.
          The compiler knows the shape and emits a templated snippet.
        </LI>
        <LI>
          <Strong>Wildcard.</Strong> Carries raw GLSL the user wrote
          directly. The compiler emits it verbatim. The reverse parser
          upgrades it back to a typed card the instant its source matches a
          known template again.
        </LI>
      </UL>

      <H2>Chain</H2>
      <P>
        The recipe is a linear <Term>chain</Term>. The compiler walks the
        cards in order; each card runs on top of the <Code>col</Code> (RGB
        accumulator) and <Code>d</Code> (signed-distance scalar) the
        previous card left behind. No node graph, no fan-out, no portals
        between cards. The simplest possible composition model — Photoshop
        layers but for shader fragments.
      </P>

      <H2>Blend</H2>
      <P>
        Every card carries an optional <Code>alpha</Code> (default 1) and{' '}
        <Code>blendMode</Code> (default <Code>'normal'</Code>). When either
        differs from its default the compiler wraps the card's body in a
        snapshot/mix block that blends the card's contribution against the
        running accumulator using one of six modes (<Code>normal</Code>,{' '}
        <Code>add</Code>, <Code>multiply</Code>, <Code>screen</Code>,{' '}
        <Code>lighten</Code>, <Code>darken</Code>). See{' '}
        <Term>Recipe model · Blending + alpha</Term> for the math.
      </P>

      <H2>Portal</H2>
      <P>
        A <Term>portal</Term> is a no-op card that exists only to mark a
        position in the chain. The integration layer uses it as a stable
        anchor — when a snapshot, a mouse paint trail, or a future
        feedback-loop ping needs to read pixels at a specific point in the
        recipe, it inserts a portal there and that's the entry point. From
        the compiler's perspective a portal emits exactly zero GLSL.
      </P>

      <H2>Putting it together</H2>
      <P>
        A typical reading: "this <Term>recipe</Term> is a <Term>chain</Term>{' '}
        of seven <Term>cards</Term>; the fifth one is a wildcard with a
        custom polar warp; the seventh is a vignette set to{' '}
        <Code>multiply</Code> at <Code>alpha&nbsp;0.6</Code>." Five words.
        That's the system.
      </P>
    </>
  ),
};

export default page;
