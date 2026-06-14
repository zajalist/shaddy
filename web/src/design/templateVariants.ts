// The set of landing-page template variants. Kept in its own tiny module so
// both TemplatesShared (the renderer) and templateRecipes (the card recipes)
// can import the type without a circular dependency.

export type TemplateVariant =
  | 'terrain' | 'nebula' | 'dna' | 'ocean' | 'lava' | 'molecule'
  | 'galaxy' | 'aurora' | 'fire' | 'crystals' | 'wormhole' | 'raymarch';
