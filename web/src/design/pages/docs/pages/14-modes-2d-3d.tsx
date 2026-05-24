// The Recipe model — Modes (2D vs 3D).

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong, KvTable, Callout } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';

const page: DocPage = {
  id: 'modes-2d-3d',
  title: 'Modes — 2D vs 3D',
  groupLabel: 'The Recipe model',
  lede: 'One recipe field flips the entire emitted shader. Each card declares which mode it supports.',
  body: (
    <>
      <P>
        <Code>Recipe.mode</Code> is a single discriminant string —{' '}
        <Code>'2d'</Code> or <Code>'3d'</Code> — that dispatches the compiler
        between two distinct shader templates. Both templates share the same
        outer marker / uniform / helper machinery; what differs is the body
        of <Code>main()</Code>, the per-card contribution model, and which
        cards are valid.
      </P>

      <H2>2D mode (default)</H2>
      <P>
        The classic fragment template. <Code>main()</Code> initialises
        centred <Code>uv</Code>, a distance accumulator <Code>d</Code>, and a
        colour accumulator <Code>col</Code>. Each card emits a GLSL body
        that mutates those locals; the last card's <Code>col</Code> becomes{' '}
        <Code>gl_FragColor</Code>. Old recipes without a <Code>mode</Code>{' '}
        field are treated as 2D.
      </P>

      <H2>3D mode</H2>
      <P>
        Raymarched signed-distance fields. The compiler walks the recipe and
        builds an <Code>sdScene(vec3 p)</Code> function out of every card's{' '}
        <Code>contribution3d</Code>. <Code>main()</Code> then casts a ray
        from the camera per pixel, finds the hit, samples a normal via the
        gradient of the SDF, and shades with Lambert plus iq's soft-shadow
        march. The recipe still controls the camera through the cards store —
        see <Term>The renderer · Camera (3D)</Term>.
      </P>

      <H2>How cards declare which mode they're for</H2>
      <P>
        Every <Code>CardDef</Code> has an optional <Code>mode</Code> field
        defaulting to <Code>'2d'</Code>. 3D cards (e.g. <Code>sphere_3d</Code>,
        {' '}<Code>torus_3d</Code>) set <Code>mode: '3d'</Code> and supply a{' '}
        <Code>contribution3d</Code> object describing how they fold into the
        scene SDF / domain / material. <Strong>Cards whose declared mode
        doesn't match the recipe's mode are no-ops</Strong> — they keep their
        slot in the chain so the user can flip the mode back without losing
        them, but emit nothing.
      </P>

      <H2>Per-mode contribution model</H2>
      <KvTable
        headers={['mode', 'card contract']}
        rows={[
          { key: '2d', value: (
            <>Each card emits a GLSL snippet against the running{' '}
            <Code>uv</Code> / <Code>d</Code> / <Code>col</Code> locals.{' '}
            <Code>{'{{paramKey}}'}</Code> placeholders are substituted with
            the card's uniform names.</>) },
          { key: '3d', value: (
            <>Each card supplies one of four contribution kinds:{' '}
            <Code>sdfExpr</Code> (folds into the scene via{' '}
            <Code>sdMin</Code>/<Code>sdSmoothMin</Code>),{' '}
            <Code>domainExpr</Code> (rebinds <Code>p</Code> for subsequent
            cards), <Code>smoothness</Code> (sets the union blend radius),
            or <Code>material</Code> (sets the global surface colour).</>) },
        ]}
      />

      <H2>When to flip</H2>
      <UL>
        <LI>
          <Strong>2D</Strong> for posters, textures, generative art,
          backgrounds, anything plane-of-pixels-shaped. The card library is
          dramatically bigger here (≈140 cards vs ≈7 for 3D).
        </LI>
        <LI>
          <Strong>3D</Strong> for sculptural scenes — spheres, boxes, tori,
          their unions, intersections, and repeated domains. Comes with
          built-in camera controls and soft shadows.
        </LI>
      </UL>

      <Callout>
        Inserting a 3D card while the recipe is in 2D mode auto-flips the
        recipe to 3D so the new card actually contributes. The reverse is
        not automatic — switching back to 2D simply makes every 3D card a
        no-op until you remove them or re-flip.
      </Callout>
    </>
  ),
};

export default page;
