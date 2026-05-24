// Getting started — Introduction.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';

const page: DocPage = {
  id: 'introduction',
  title: 'Introduction',
  groupLabel: 'Getting started',
  lede: 'A card-based composer for live GLSL fragment shaders. Snap typed pieces together, see pixels, drop into raw code when you outgrow the cards.',
  body: (
    <>
      <P>
        Shaddy treats a shader as a <Term>recipe</Term>: an ordered list of
        small typed cards, each contributing a snippet of GLSL to one
        fragment program. The composer holds the recipe. The compiler emits
        the program. The renderer ships pixels. Same recipe in, byte-identical
        program out, every time. Round-trip through the reverse parser and
        every card survives intact.
      </P>

      <P>
        The card system opens in two directions. Outward, the typed library
        ships <Strong>149 cards</Strong> across shapes, distortions, colours,
        and effects, working in both the 2D fragment template and the 3D
        raymarched template. Inward, anywhere the typed library falls short
        you can drop a <Term>wildcard</Term> card and write raw GLSL the
        compiler emits verbatim. Edit it back into the shape of a known
        template and the reverse parser promotes it to a typed card on the
        next tick.
      </P>

      <P>
        The route layout sticks to the simplest split that survives complex
        work: the composer on <Code>/design</Code>, the full card shelf on
        {' '}<Code>/library</Code>, curated finished pieces on{' '}
        <Code>/gallery</Code>, and this documentation on{' '}
        <Code>/docs</Code>. Each route is standalone — they share the
        cards store and the renderer surface, nothing else.
      </P>

      <P>
        The rest of these docs walk the system from outside in. If you've
        used the composer for five minutes already, skim the{' '}
        <Term>Recipe model</Term> group to ground the data shape, then jump
        to whichever subsystem you need.
      </P>

      <H2>What this is not</H2>
      <UL>
        <LI>
          <Strong>Not a node graph.</Strong> Cards are a linear stack, not a
          DAG. Think Photoshop layers, but the layers are GLSL fragments and
          each one runs on top of whatever the previous card left in the
          accumulator.
        </LI>
        <LI>
          <Strong>Not a playground that hides the GLSL.</Strong> The code
          view is a first-class surface. Edit it directly and the cards
          follow.
        </LI>
        <LI>
          <Strong>Not a baked-pixel editor.</Strong> Everything is live.
          Parameters animate. The canvas redraws every frame. Recipes are
          JSON you can paste into a URL.
        </LI>
      </UL>

      <H2>What you actually need to know</H2>
      <P>
        Two ideas carry the whole system. One:{' '}
        <Term>recipes project to GLSL</Term>. Two:{' '}
        <Term>GLSL edits reparse back into recipes</Term>. Hold those two
        and everything else &mdash; uniforms, blending, helpers, the 3D
        camera &mdash; reads as a detail that serves one of them.
      </P>
    </>
  ),
};

export default page;
