// The Recipe model — Typed vs wildcard cards.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const WILDCARD_EX = `// A wildcard card the user wrote by hand. The compiler emits
// the rawSource verbatim, inside the marker block for cardId 'wx3'.
{
  "kind": "wildcard",
  "id": "wx3",
  "enabled": true,
  "rawSource": "// nautilus warp\\nvec2 q = uv * 1.7;\\nfloat r = length(q);\\nfloat a = atan(q.y, q.x) + 4.0 * log(r);\\nuv = vec2(cos(a), sin(a)) * r;",
  "displayName": "nautilus warp"
}`;

const TYPED_EX = `// The same shape as a typed card, after the parser
// recognised the source as the swirl template.
{
  "kind": "typed",
  "id": "wx3",
  "type": "swirl",
  "enabled": true,
  "params": {
    "strength":  { "value": 4.0, "animation": null },
    "radius":    { "value": 1.7, "animation": null }
  }
}`;

const page: DocPage = {
  id: 'cards-typed-vs-wildcard',
  title: 'Cards — typed vs wildcard',
  groupLabel: 'The Recipe model',
  lede: 'Typed cards are templated; wildcards are escape hatches. Reverse parsing moves between the two.',
  body: (
    <>
      <H2>Typed cards</H2>
      <P>
        A typed card points at a <Code>CardDef</Code> from the library via{' '}
        <Code>type</Code>. The def supplies the param schema, the friendly
        name, the icon, the GLSL snippet template, and the list of helper
        functions the compiler must emit. Typed cards are the 95% case — the
        composer-side UI is rich, the share URL is compact, and the reverse
        parser can recover the exact recipe from arbitrary edits as long as
        the shape still matches.
      </P>

      <H2>Wildcards</H2>
      <P>
        A wildcard card carries arbitrary GLSL in its <Code>rawSource</Code>{' '}
        field. The compiler emits it verbatim, inside the same marker block
        every other card lives in. Wildcards exist for two reasons:
      </P>
      <UL>
        <LI>
          <Strong>Escape hatch.</Strong> The typed library can't cover every
          imaginable snippet. Anywhere it falls short, the user opens a
          wildcard and writes the GLSL they actually want.
        </LI>
        <LI>
          <Strong>Transitional state.</Strong> When a user edits a typed
          card's GLSL into something the template no longer matches, the
          reverse parser downgrades it to a wildcard so the chain stays
          coherent. Edit it back into shape and the parser upgrades it again
          on the next debounce tick.
        </LI>
      </UL>

      <H2>The promote/demote loop</H2>
      <P>
        Both directions are lossless within their boundaries. A typed card{' '}
        <em style={{ fontStyle: 'italic', opacity: 0.85 }}>becomes</em> a wildcard when the reverse parser receives source
        that the card's template can't match — the captured source becomes
        the wildcard's <Code>rawSource</Code>, and the typed card's params
        are dropped (they no longer correspond to anything). The reverse is
        symmetrical: when a wildcard's source matches a template exactly, it
        promotes to the corresponding typed card with the inferred params.
      </P>

      <P>The wildcard form, before the parser recognises it:</P>
      <CodeBlock language="json" source={WILDCARD_EX} />

      <P>The same card after promotion to <Code>swirl</Code>:</P>
      <CodeBlock language="json" source={TYPED_EX} />

      <H2>When to deliberately use a wildcard</H2>
      <UL>
        <LI>
          You want behaviour that isn't in the library and don't want to add
          a new card. Wildcards have zero overhead — they're a normal entry
          in the chain.
        </LI>
        <LI>
          You're prototyping a card. Build it as a wildcard first; once the
          shape stabilises, lift it into a <Code>CardDef</Code> and the
          recipe upgrades automatically.
        </LI>
        <LI>
          You need to call helper functions the library doesn't expose. The
          wildcard runs inside the same scope as every other card; any
          helper the compiler emitted (because some other card pulled it in)
          is in scope here too.
        </LI>
      </UL>
    </>
  ),
};

export default page;
