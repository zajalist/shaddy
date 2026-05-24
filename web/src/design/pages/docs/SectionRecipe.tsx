// §1 — The Recipe model.

import { CodeBlock } from './CodeBlock';
import { Code, P, SectionHeader, SECTIONS, UL, LI, FieldRow, H3 } from './primitives';

const meta = SECTIONS.find((s) => s.id === 'recipe')!;

const RECIPE_SRC = `// web/src/cards/types.ts
export type Recipe = {
  cards: Card[];
  canvasAspect: 'square' | 'portrait' | 'landscape';
  mode?: '2d' | '3d';   // omitted → '2d'
};

export type Card = TypedCard | WildcardCard;

export type TypedCard = {
  kind: 'typed';
  id: string;
  type: string;                  // CardDef.type key
  enabled: boolean;
  params: Record<string, Parameter>;
  alpha?: number;                // 0..1, default 1
  blendMode?: BlendMode;         // default 'normal'
};

export type WildcardCard = {
  kind: 'wildcard';
  id: string;
  enabled: boolean;
  rawSource: string;             // verbatim GLSL between markers
  displayName: string | null;
  alpha?: number;
  blendMode?: BlendMode;
};`;

export const SectionRecipe = () => (
  <section data-section={meta.id}>
    <SectionHeader meta={meta} />

    <P>
      A <Code>Recipe</Code> is the source of truth. The emitted GLSL is a{' '}
      <em>projection</em> of the recipe — given the same recipe the compiler
      produces byte-identical shader source. Round-tripping through the
      reverse parser preserves the recipe (or downgrades a card to a
      wildcard if the user's edits no longer match the card's shape).
    </P>

    <P>
      A recipe is a flat <Code>Card[]</Code> array plus three top-level
      knobs. Cards are either <Code>typed</Code> entries that resolve to a{' '}
      <Code>CardDef</Code> in the library, or <Code>wildcard</Code> cards
      that carry arbitrary GLSL the typed system can't represent.
    </P>

    <CodeBlock language="ts" source={RECIPE_SRC} />

    <H3>Top-level fields</H3>

    <FieldRow name="cards" type="Card[]">
      Ordered list of cards. The compiler walks them in array order and each
      card runs against the running <Code>col</Code> / <Code>d</Code>{' '}
      accumulators left by the previous card.
    </FieldRow>

    <FieldRow name="canvasAspect" type="'square' | 'portrait' | 'landscape'">
      Drives the viewport box the renderer reserves for the canvas. Doesn't
      change the shader — only the host's framebuffer aspect.
    </FieldRow>

    <FieldRow name="mode" type="'2d' | '3d' (optional)">
      Compiler dispatch flag. <Code>'2d'</Code> emits the classic uv / d /
      col fragment template. <Code>'3d'</Code> emits a raymarched SDF scene
      with Lambert + soft shadow shading. Old recipe JSON without this
      field is treated as <Code>'2d'</Code>.
    </FieldRow>

    <H3>Per-card composition</H3>

    <P>
      Every card carries an optional <Code>alpha</Code> (default 1) and{' '}
      <Code>blendMode</Code> (default <Code>'normal'</Code>) — the
      composition pair. When either differs from its default, the compiler
      wraps the card's emitted body in a snapshot/mix block that mixes the
      previous <Code>col</Code> with the card's contribution via the chosen
      blend op. See <Code>§6 Blending + alpha</Code> for the math.
    </P>

    <UL>
      <LI><Code>alpha</Code> is stored optional so pre-blend recipe JSON loads cleanly; <Code>state.ts</Code> defaults it on insert.</LI>
      <LI>Cards can be toggled off via <Code>enabled: false</Code> — they keep their slot in the array but emit no GLSL.</LI>
      <LI><Code>id</Code> is a stable card identifier the UI uses for selection / drag-reorder; the compiler echoes it back into the GLSL marker comments so the reverse parser can round-trip.</LI>
    </UL>
  </section>
);
