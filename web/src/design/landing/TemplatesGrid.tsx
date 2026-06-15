import { TemplatesShared } from '../TemplatesShared';
import type { Template } from '../TemplatesShared';

// ─── Templates preview grid (12 starter templates teaser) ───────────────
export const TEMPLATES: Template[] = [
  { name: 'Terrain',   hint: 'fbm · erosion',     variant: 'terrain' },
  { name: 'Nebula',    hint: 'noise · stars',     variant: 'nebula' },
  { name: 'DNA',       hint: 'sin · helix',       variant: 'dna' },
  { name: 'Ocean',     hint: 'waves · caustics',  variant: 'ocean' },
  { name: 'Lava',      hint: 'turbulence · heat', variant: 'lava' },
  { name: 'Molecule',  hint: 'metaballs · bonds', variant: 'molecule' },
  { name: 'Galaxy',    hint: 'spiral · stars',    variant: 'galaxy' },
  { name: 'Aurora',    hint: 'curtains · noise',  variant: 'aurora' },
  { name: 'Fire',      hint: 'turbulence · rise', variant: 'fire' },
  { name: 'Crystals',  hint: 'voronoi · cells',   variant: 'crystals' },
  { name: 'Wormhole',  hint: 'polar · depth',     variant: 'wormhole' },
  { name: '3D Ball',   hint: 'raymarch · light',  variant: 'raymarch' },
];

export const TemplatesGrid = () => <TemplatesShared templates={TEMPLATES} />;
