/**
 * Export the web app's CURATED_RECIPES to a JSON snapshot the Python seed reads.
 *
 *   npx tsx web/scripts/export-curated.ts
 *
 * Writes backend/scripts/curated_recipes.json. Re-run whenever the curated set
 * in src/design/pages/gallery/recipes.ts changes, then run the backend seed:
 *   docker compose run --rm api python -m scripts.seed_curated
 *
 * Note: this imports from src/ which uses the "@/..." path alias, so run it with
 * the web tsconfig (tsx picks up web/tsconfig.json when run from the web dir, or
 * pass --tsconfig web/tsconfig.json).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CURATED_RECIPES } from '../src/design/pages/gallery/recipes';

const here = dirname(fileURLToPath(import.meta.url));

const snapshot = CURATED_RECIPES.map((c) => ({
  id: c.id,
  title: c.title,
  description: null as string | null,
  recipe: c.recipe,
  featured: Boolean(c.featured),
  tags: [] as string[],
}));

const dest = resolve(here, '../../backend/scripts/curated_recipes.json');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(snapshot, null, 2));
console.log(`wrote ${snapshot.length} curated recipes -> ${dest}`);
