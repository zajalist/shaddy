import { describe, it, expect } from 'vitest';
import { compile, validateRecipe } from '@/cards';
import { TEMPLATE_RECIPES } from './templateRecipes';
import type { TemplateVariant } from './templateVariants';

const VARIANTS: TemplateVariant[] = [
  'terrain', 'nebula', 'dna', 'ocean', 'lava', 'molecule',
  'galaxy', 'aurora', 'fire', 'crystals', 'wormhole', 'raymarch',
];

describe('template recipes', () => {
  it('defines a recipe for every variant', () => {
    for (const v of VARIANTS) {
      expect(TEMPLATE_RECIPES[v], v).toBeDefined();
      expect(TEMPLATE_RECIPES[v].cards.length, v).toBeGreaterThan(0);
    }
  });

  it('every recipe validates (all card types known)', () => {
    for (const v of VARIANTS) {
      expect(validateRecipe(TEMPLATE_RECIPES[v]), v).toEqual([]);
    }
  });

  it('every recipe compiles to a main() shader with fragColor', () => {
    for (const v of VARIANTS) {
      const out = compile(TEMPLATE_RECIPES[v]);
      expect(out.glsl, v).toContain('void main()');
      expect(out.glsl, v).toContain('fragColor');
      // no unsubstituted placeholders leaked into the GLSL
      expect(out.glsl.includes('{{'), v).toBe(false);
    }
  });

  it('the raymarch recipe is a 3D recipe', () => {
    expect(TEMPLATE_RECIPES.raymarch.mode).toBe('3d');
  });
});
