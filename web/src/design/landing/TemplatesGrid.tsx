import { TemplatesShared } from '../TemplatesShared';
import type { Template } from '../TemplatesShared';

// ─── Templates preview grid (12 starter templates teaser) ───────────────
export const TEMPLATES: Template[] = [
  { name: 'Plasma',   hint: 'sin · cos · sum',  variant: 'plasma' },
  { name: 'Ripples',  hint: 'sin · length',     variant: 'ripples' },
  { name: 'Voronoi',  hint: 'distance · cell',  variant: 'voronoi' },
  { name: 'Caustics', hint: 'ray · refract',    variant: 'caustics' },
  { name: 'Stripes',  hint: 'mod · gradient',   variant: 'stripes' },
  { name: 'Kaleido',  hint: 'atan · mirror',    variant: 'kaleido' },
  { name: 'Warp',     hint: 'noise · displace', variant: 'warp' },
  { name: 'Glow',     hint: 'pow · radial',     variant: 'glow' },
  { name: 'Bloom',    hint: 'threshold · blur', variant: 'bloom' },
  { name: 'Feedback', hint: 'sample · decay',   variant: 'feedback' },
  { name: 'Reaction', hint: 'turing · anti-d',  variant: 'reaction' },
  { name: 'Tunnel',   hint: 'march · rotate',   variant: 'tunnel' },
];

export const TemplatesGrid = () => <TemplatesShared templates={TEMPLATES} />;
