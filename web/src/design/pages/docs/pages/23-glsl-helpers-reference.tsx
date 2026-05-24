// The compiler — GLSL helpers reference.

import type { DocPage } from './registry';
import { H2, P, KvTable, Strong, Callout } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const FBM_EX = `// 4-octave fBm. Used by every "organic noise" card.
float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}`;

const helpers: Array<[string, string, string]> = [
  ['hash21',          '(vec2)→float',                'Hash a vec2 to a [0,1] scalar.'],
  ['hash22',          '(vec2)→vec2',                 'Hash a vec2 to a [0,1] vec2.'],
  ['noise2',          '(vec2)→float',                'Value noise, smoothstep-interpolated. Depends on hash21.'],
  ['fbm2',            '(vec2)→float',                '4-octave fractional Brownian motion. Depends on noise2.'],
  ['ridged2',         '(vec2)→float',                'Ridged-multifractal ((1−|noise|) octaves). Mountain ridges.'],
  ['worley2',         '(vec2)→vec2',                 'Returns (F1, F2). F1 = nearest site distance, F2 = second.'],
  ['hsv2rgb',         '(vec3)→vec3',                 'Convert HSV (0..1) to RGB.'],
  ['rgb2hsv',         '(vec3)→vec3',                 'Convert RGB to HSV (0..1).'],
  ['rot2',            '(float)→mat2',                '2D rotation matrix from an angle in radians.'],
  ['cospal',          '(float,vec3,vec3,vec3,vec3)→vec3',  "iq's parametric cosine palette."],
  ['sdfBox',          '(vec2,vec2)→float',           'Axis-aligned 2D box SDF. b = half-extents.'],
  ['sdfHex',          '(vec2,float)→float',          'Regular hexagon SDF. r = circumradius.'],
  ['sdfTri',          '(vec2,float)→float',          'Equilateral triangle SDF.'],
  ['sdfStar',         '(vec2,float,int,float)→float','n-pointed star SDF. m = inner radius factor.'],
  ['sdfHeart',        '(vec2)→float',                'Heart-shape SDF (iq).'],
  ['sdfSegment',      '(vec2,vec2,vec2)→float',      'Distance from p to segment a..b (no thickness).'],
  ['sdfCapsule',      '(vec2,vec2,vec2,float)→float','Segment inflated by radius r.'],
  ['sdfRoundedBox',   '(vec2,vec2,vec4)→float',      'Box with per-corner radii.'],
  ['sdfEllipse',      '(vec2,vec2)→float',           "Closed-form ellipse SDF (iq's approximation)."],
  ['sdfPolyN',        '(vec2,float,int)→float',      'Regular n-gon SDF.'],
  ['sdfVesica',       '(vec2,float,float)→float',    'Vesica (two-circle intersection lens).'],
  ['sdfPie',          '(vec2,vec2,float)→float',     'Pie wedge SDF. c = (sin θ/2, cos θ/2).'],
  ['sdfTrapezoid',    '(vec2,float,float,float)→float','Trapezoid SDF. r1, r2 = bottom/top half-widths.'],
  ['sdfParallelogram',"(vec2,float,float,float)→float",'Parallelogram SDF with skew sk.'],
  ['sdfHorseshoe',    '(vec2,vec2,float,vec2)→float','Horseshoe / open-arc SDF.'],
  ['sdMin',           '(float,float)→float',         '3D hard union — straight min().'],
  ['sdSmoothMin',     '(float,float,float)→float',   "iq's polynomial smooth-min. k=0 → min()."],
  ['sdfBox3',         '(vec3,vec3)→float',           '3D axis-aligned box SDF. b = half-extents.'],
  ['sdfTorus3',       '(vec3,vec2)→float',           '3D torus SDF. t.x = major, t.y = minor.'],
  ['sceneNormal3',    '(vec3)→vec3',                 'Numerical-gradient normal of sdScene. Emitted AFTER sdScene.'],
  ['softShadow3',     '(vec3,vec3,float,float,float)→float',  "iq's soft-shadow march. 32 steps. AFTER sdScene."],
];

const page: DocPage = {
  id: 'glsl-helpers-reference',
  title: 'GLSL helpers reference',
  groupLabel: 'The compiler',
  lede: 'The shared function pool. Each card declares which it needs; the compiler emits the closure once.',
  body: (
    <>
      <P>
        Helpers live in <Code>cards/library/helpers.ts</Code>. Each one is a
        plain GLSL function string. The compiler walks the recipe, unions
        together the <Code>helpers</Code> arrays of every active card def,
        closes transitively over <Code>HELPER_DEPS</Code>, and emits each
        function exactly once in the order <Code>HELPER_EMISSION_ORDER</Code>{' '}
        prescribes.
      </P>

      <H2>Why this lives in the compiler, not the cards</H2>
      <P>
        Most cards share the same small handful of helpers — every noise
        card wants <Code>noise2</Code>, every smooth-distance card wants{' '}
        <Code>sdfPolyN</Code>, every parametric palette wants{' '}
        <Code>cospal</Code>. Inlining the function body into every card
        would explode the emitted shader size and confuse the user editing
        the GLSL. Centralising in <Code>helpers.ts</Code> gives one canonical
        definition per function and an easy seam to optimise.
      </P>

      <H2>Example — fbm2</H2>
      <CodeBlock language="glsl" source={FBM_EX} />

      <H2>Full list</H2>
      <KvTable
        headers={['name', 'signature · description']}
        rows={helpers.map(([name, sig, desc]) => ({
          key: name,
          value: (
            <>
              <span style={{ display: 'inline-block', minWidth: 220, color: '#8a8377', fontFamily: 'Geist Mono, monospace', fontSize: 12.5 }}>
                {sig}
              </span>
              <span>{desc}</span>
            </>
          ),
        }))}
      />

      <Callout>
        <Strong>3D ordering quirk.</Strong> <Code>sceneNormal3</Code> and{' '}
        <Code>softShadow3</Code> both reference <Code>sdScene</Code> by
        name. The 3D compiler emits them <Term>after</Term>{' '}
        <Code>sdScene</Code> for that reason — the constant{' '}
        <Code>HELPERS_AFTER_SCENE</Code> in <Code>helpers.ts</Code> is the
        canonical set.
      </Callout>
    </>
  ),
};

export default page;
