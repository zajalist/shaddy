// Cards reference — Card catalogue.

import type { DocPage } from './registry';
import { H2, P, UL, LI, A, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';

const page: DocPage = {
  id: 'card-catalogue',
  title: 'Card catalogue',
  groupLabel: 'Cards reference',
  lede: 'One source of truth for the 149 typed cards — the /library route renders the live shelf.',
  body: (
    <>
      <P>
        The full catalogue lives at <A href="/library">/library</A>. That
        page is itself driven by the same <Code>CARD_LIBRARY_LIST</Code>{' '}
        that the compiler reads, so the count, descriptions, and parameter
        shapes you see there are always exactly what the runtime exposes —
        there's no separate "docs version" to drift from.
      </P>

      <H2>What's there today</H2>
      <UL>
        <LI><Strong>149 typed cards</Strong>, plus the wildcard escape hatch.</LI>
        <LI>
          Split across four categories — <Code>shape</Code>,{' '}
          <Code>distortion</Code>, <Code>color</Code>, <Code>effect</Code>.
        </LI>
        <LI>
          The 3D set is the smallest — seven cards as of v1 (sphere, box,
          torus, ground plane, smooth union, repeat domain, material colour).
          Expect this set to grow.
        </LI>
        <LI>
          A growing set of "mouse-interactive" cards — <Code>mouse_glow</Code>,{' '}
          <Code>mouse_repel</Code>, <Code>mouse_paint_d</Code> — that read{' '}
          <Code>u_mouse</Code> and react each frame.
        </LI>
        <LI>
          Time-driven cards — <Code>pulse_brightness</Code>,{' '}
          <Code>pulse_hue</Code>, <Code>hue_cycle</Code> — that read{' '}
          <Code>u_time</Code>.
        </LI>
      </UL>

      <H2>Browsing on /library</H2>
      <P>
        The library page exposes three filter axes:
      </P>
      <UL>
        <LI>
          <Strong>Category pills.</Strong> Narrow to shapes, distortions,
          colours, or effects. Each shows a live count.
        </LI>
        <LI>
          <Strong>Sub-group chips.</Strong> Within a category, sub-groups
          surface — "primitives", "noise", "fractals", "polar", "math /
          waves", "patterns", "gradients" inside shapes; "uv transforms",
          "noise warps", "scalar", "mouse" inside distortions; etc.
        </LI>
        <LI>
          <Strong>Mode toggle.</Strong> "2D" vs "3D" filter for when you're
          building one or the other.
        </LI>
      </UL>

      <P>
        Every tile has a <Strong>"try in composer"</Strong> CTA that drops
        the card into your current recipe and bounces you to{' '}
        <Code>/design</Code>. Use it freely — it appends, never replaces.
      </P>

      <H2>If a card is missing</H2>
      <P>
        Two paths:
      </P>
      <UL>
        <LI>
          <Strong>Wildcard.</Strong> Drop a wildcard card and write the
          GLSL inline. Zero overhead — it runs in the same scope every
          typed card does, and helpers other cards pulled in are in scope
          for it too.
        </LI>
        <LI>
          <Strong>Add a CardDef.</Strong> See <Term>Building your own
          card</Term>. A new card is one file in{' '}
          <Code>cards/library/</Code>; the compiler picks it up the moment
          you add it to <Code>CARD_LIBRARY_LIST</Code>.
        </LI>
      </UL>
    </>
  ),
};

export default page;
