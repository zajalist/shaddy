// Cards reference — Categories.

import type { DocPage } from './registry';
import { H2, P, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';

const page: DocPage = {
  id: 'categories',
  title: 'Categories',
  groupLabel: 'Cards reference',
  lede: 'Shapes write d. Distortions transform uv or d. Colors write col. Effects modify col.',
  body: (
    <>
      <P>
        Every <Code>CardDef</Code> declares a single <Code>category</Code>{' '}
        — <Code>'shape'</Code>, <Code>'distortion'</Code>,{' '}
        <Code>'color'</Code>, or <Code>'effect'</Code>. The category is a
        UI hint (it drives icon colour, position in the picker, the filter
        chips on <Code>/library</Code>) — the compiler doesn't care. But
        it's a semantically meaningful hint: each category has a typical
        contract with the chain's locals.
      </P>

      <H2>shape</H2>
      <P>
        Writes <Code>d</Code>, generally not <Code>col</Code>. A shape card
        produces a scalar field — a signed distance, a falloff, a noise
        sample. Examples: <Code>radial_gradient</Code>, <Code>star</Code>,{' '}
        <Code>fbm</Code>, <Code>voronoi_cells</Code>, <Code>plasma</Code>.
        Usually the first card in a recipe, since the chain starts with{' '}
        <Code>d&nbsp;=&nbsp;0</Code> and shapes are the ones that bring
        structure.
      </P>

      <H2>distortion</H2>
      <P>
        Transforms <Code>uv</Code> or <Code>d</Code> — never writes{' '}
        <Code>col</Code>. Examples: <Code>swirl</Code> warps <Code>uv</Code>{' '}
        through a polar twist; <Code>ripple</Code> remaps <Code>d</Code>{' '}
        through a sin wave; <Code>mirror_x</Code> folds <Code>uv.x</Code>{' '}
        through zero. Distortions are positional — they only affect cards{' '}
        <Term>after</Term> them in the chain.
      </P>

      <H2>color</H2>
      <P>
        Writes <Code>col</Code>, reads <Code>d</Code>. The point where the
        chain transitions from "I've described a shape / pattern" to "I'm
        choosing pixels". Examples: <Code>palette</Code>,{' '}
        <Code>cosine_palette</Code>, <Code>d_as_rgb</Code> (cheap debug),{' '}
        <Code>gradient_linear</Code>, <Code>solid_color</Code>. Usually
        exactly one colour card per recipe; multiple is fine but only the
        last one's contribution survives unless they blend.
      </P>

      <H2>effect</H2>
      <P>
        Reads and writes <Code>col</Code>. Adjustments, tonemaps, lens
        effects, post-process. Examples: <Code>vignette</Code>,{' '}
        <Code>bloom</Code>, <Code>chromatic_aberration</Code>,{' '}
        <Code>aces_tonemap</Code>, <Code>pulse_brightness</Code>,{' '}
        <Code>contrast</Code>. Almost always come last in the chain — they
        are the "treatments" applied on top of the finished image.
      </P>

      <H2>The implicit reading order</H2>
      <P>
        Read a recipe top-down and it tells a story: <Strong>shape →
        (distortions) → colour → effects</Strong>. The composer doesn't
        enforce this order — you can put a colour card first and watch the
        canvas go solid, then a shape card later and watch the colour get
        rewritten — but the category labels are a hint at the natural
        layering most recipes settle into.
      </P>
    </>
  ),
};

export default page;
