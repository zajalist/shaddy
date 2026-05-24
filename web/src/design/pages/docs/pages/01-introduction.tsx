// Getting started — Introduction.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';

const page: DocPage = {
  id: 'introduction',
  title: 'Introduction',
  groupLabel: 'Getting started',
  lede: 'Shaddy is a card-based composer for live GLSL fragment shaders — drop typed pieces together, see pixels, dive into the code when you need to.',
  body: (
    <>
      <P>
        Shaddy treats a shader as a <Term>recipe</Term>: an ordered list of
        small, typed cards that each contribute a snippet of GLSL to a single
        fragment program. The composer maintains the recipe; the compiler
        emits the program; the renderer ships pixels. The same recipe always
        produces the same program — there is no hidden state between
        sessions, and round-tripping through the reverse parser preserves
        every card.
      </P>

      <P>
        The card system is open in two directions. Outward — the typed
        library currently ships <Strong>149 cards</Strong> spanning shapes,
        distortions, colours, and effects across both a 2D fragment template
        and a 3D raymarched template. Inward — anywhere the typed system
        falls short the user can drop a <Term>wildcard</Term> card and write
        raw GLSL that the compiler emits verbatim. The reverse parser
        upgrades a wildcard back to a typed card the moment its shape matches
        a known definition.
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
          DAG. The mental model is "Photoshop layers for shaders" — each
          card runs on top of the accumulator the previous card left behind.
        </LI>
        <LI>
          <Strong>Not a shader playground that hides the GLSL.</Strong> The
          code view is a first-class surface; you can edit it directly and
          the recipe follows along.
        </LI>
        <LI>
          <Strong>Not a baked-pixel editor.</Strong> Everything is live —
          parameters animate, the canvas redraws every frame, and recipes
          are JSON you can pass around as URLs.
        </LI>
      </UL>

      <H2>What you actually need to know</H2>
      <P>
        Two ideas carry most of the system:{' '}
        <Term>recipes project to GLSL</Term> (one direction), and{' '}
        <Term>GLSL edits reparse back into recipes</Term> (the other
        direction). Hold those, and everything else — uniforms, blending,
        helpers, the 3D camera — fits as a detail that supports one of those
        two transports.
      </P>
    </>
  ),
};

export default page;
