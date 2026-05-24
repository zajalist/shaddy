// The Recipe model — Recipe schema.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong, KvTable } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const TS = `// web/src/cards/types.ts
export type Recipe = {
  cards: Card[];
  canvasAspect: 'square' | 'portrait' | 'landscape';
  mode?: '2d' | '3d';   // omitted → '2d'
};

export type Card = TypedCard | WildcardCard;

export type TypedCard = {
  kind: 'typed';
  id: string;                       // stable identifier (UI selection)
  type: string;                     // CardDef.type key
  enabled: boolean;
  params: Record<string, Parameter>;
  alpha?: number;                   // 0..1, default 1
  blendMode?: BlendMode;            // default 'normal'
};

export type WildcardCard = {
  kind: 'wildcard';
  id: string;
  enabled: boolean;
  rawSource: string;                // verbatim GLSL between markers
  displayName: string | null;
  alpha?: number;
  blendMode?: BlendMode;
};

export type Parameter = {
  value: number | readonly [number, number, number];
  animation: null;                  // reserved — PR #2 fills with tagged-union
};`;

const JSON_EX = `{
  "canvasAspect": "landscape",
  "mode": "2d",
  "cards": [
    { "kind": "typed", "id": "k7p4", "type": "stripes",
      "enabled": true,
      "params": {
        "spacing":  { "value": 0.08, "animation": null },
        "rotation": { "value": 0.5,  "animation": null }
      } },
    { "kind": "typed", "id": "8n2f", "type": "palette_themed",
      "enabled": true,
      "params": { "theme": { "value": 3, "animation": null } },
      "alpha": 0.8,
      "blendMode": "multiply" }
  ]
}`;

const page: DocPage = {
  id: 'recipe-schema',
  title: 'Recipe schema',
  groupLabel: 'The Recipe model',
  lede: 'A flat Card[] array plus three top-level knobs. That is the entire data model.',
  body: (
    <>
      <P>
        The <Code>Recipe</Code> type is the source of truth — the entire
        authoring state of a Shaddy session boils down to a value of this
        shape. The compiler, the UI, the share URL encoder, and the reverse
        parser all consume or produce a <Code>Recipe</Code>; nothing else.
      </P>

      <H2>The TS shape</H2>
      <CodeBlock language="ts" source={TS} />

      <H2>Top-level fields</H2>
      <KvTable
        headers={['field', 'role']}
        rows={[
          { key: 'cards', value: (
              <>Ordered array of cards. The compiler walks them in array
              order; each card runs against the <Code>col</Code> /{' '}
              <Code>d</Code> accumulators left by the previous card.</>) },
          { key: 'canvasAspect', value: (
              <>One of <Code>'square'</Code> | <Code>'portrait'</Code> |{' '}
              <Code>'landscape'</Code>. Drives the viewport box the renderer
              reserves — not the shader itself.</>) },
          { key: 'mode', value: (
              <><Code>'2d'</Code> (default) emits the classic uv / d / col
              fragment template. <Code>'3d'</Code> emits a raymarched SDF
              scene with Lambert + soft-shadow shading. Old recipe JSON
              without this field is treated as <Code>'2d'</Code>.</>) },
        ]}
      />

      <H2>A real recipe in JSON</H2>
      <P>
        Two cards — a stripe pattern and a themed palette with alpha 0.8 and
        multiply blend. The whole thing weighs less than a kilobyte; share
        URLs are this JSON, gzipped, base64'd.
      </P>
      <CodeBlock language="json" source={JSON_EX} />

      <H2>Invariants</H2>
      <UL>
        <LI>
          <Strong>Stable card ids.</Strong> Each card has a short string{' '}
          <Code>id</Code> the UI uses for selection and drag-reorder, and
          the compiler echoes it back into the GLSL marker comments so the
          reverse parser can round-trip.
        </LI>
        <LI>
          <Strong>Enabled flag, not deletion.</Strong> Toggling a card off
          keeps it in the array but emits no GLSL. The UI surfaces this so
          users can A/B compare without losing parameter values.
        </LI>
        <LI>
          <Strong>Param values via the <Code>Parameter</Code> wrapper.</Strong>{' '}
          Even though <Code>animation</Code> is always <Code>null</Code> in
          v1, every value is wrapped in <Code>{'{ value, animation: null }'}</Code>{' '}
          to leave room for PR #2 to land per-parameter animation without
          breaking recipe JSON.
        </LI>
      </UL>
    </>
  ),
};

export default page;
