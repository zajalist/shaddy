// The Docs route is a single React component (Docs.tsx) that picks one
// page from this registry based on the URL hash. Each page is a default-
// exported `DocPage` from a file in this folder. The registry also drives
// the left nav (group → page order) and the live-search index.
//
// Adding a page is content work — drop a .tsx file in this folder, default-
// export `{ id, title, lede?, body }`, then add it to GROUPS below in the
// right group.

import type { ReactNode } from 'react';

import GettingStartedIntro from './01-introduction';
import GettingStartedQuickStart from './02-quick-start';
import GettingStartedConcepts from './03-concepts';

import RecipeSchema from './10-recipe-schema';
import RecipeCards from './11-cards-typed-vs-wildcard';
import RecipeParameters from './12-parameters';
import RecipeBlending from './13-blending-alpha';
import RecipeModes from './14-modes-2d-3d';

import CompilerPipeline from './20-pipeline-overview';
import Compiler2DTemplate from './21-2d-shader-template';
import Compiler3DTemplate from './22-3d-raymarching-template';
import CompilerHelpers from './23-glsl-helpers-reference';

import RendererSurface from './30-renderer-public-surface';
import RendererUniforms from './31-uniforms';
import RendererCamera from './32-camera-3d';

import CardsCategories from './40-categories';
import CardsCatalogue from './41-card-catalogue';
import CardsBuildYourOwn from './42-building-your-own-card';
import CardsHelpers from './43-helpers';

import IntegrationShortcuts from './50-keyboard-shortcuts';
import IntegrationAi from './51-ask-claude';
import IntegrationOauth from './52-oauth';
import IntegrationShare from './53-share-export';

import TutorialSunset from './60-tutorial-sunset-gradient';
import TutorialAnimate from './61-tutorial-animate-with-time';
import TutorialMouse from './62-tutorial-react-to-mouse';
import TutorialFirst3D from './63-tutorial-first-3d-scene';

export type DocPage = {
  /** Hash slug — the route is `/docs#<id>`. Stable for permalinks. */
  id: string;
  title: string;
  /** Hint shown above the H1 — repeats the group label so the page reads
   *  well even when deep-linked without the sidebar in view. */
  groupLabel: string;
  /** Optional one-liner under the H1. */
  lede?: string;
  /** Full body JSX — heavy lifting lives in each page file. */
  body: ReactNode;
};

export type DocGroup = {
  id: string;
  label: string;
  pages: DocPage[];
};

// One source of truth for both the nav order and the page resolver.
export const GROUPS: DocGroup[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    pages: [GettingStartedIntro, GettingStartedQuickStart, GettingStartedConcepts],
  },
  {
    id: 'recipe',
    label: 'The Recipe model',
    pages: [RecipeSchema, RecipeCards, RecipeParameters, RecipeBlending, RecipeModes],
  },
  {
    id: 'compiler',
    label: 'The compiler',
    pages: [CompilerPipeline, Compiler2DTemplate, Compiler3DTemplate, CompilerHelpers],
  },
  {
    id: 'renderer',
    label: 'The renderer',
    pages: [RendererSurface, RendererUniforms, RendererCamera],
  },
  {
    id: 'cards',
    label: 'Cards reference',
    pages: [CardsCategories, CardsCatalogue, CardsBuildYourOwn, CardsHelpers],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    pages: [IntegrationShortcuts, IntegrationAi, IntegrationOauth, IntegrationShare],
  },
  {
    id: 'tutorials',
    label: 'Tutorials',
    pages: [TutorialSunset, TutorialAnimate, TutorialMouse, TutorialFirst3D],
  },
];

// Flat list for the resolver + search index.
export const ALL_PAGES: DocPage[] = GROUPS.flatMap((g) => g.pages);

// Stable default — first page in the first group.
export const DEFAULT_PAGE_ID = ALL_PAGES[0]!.id;

export function findPage(id: string | null | undefined): DocPage {
  if (!id) return ALL_PAGES[0]!;
  return ALL_PAGES.find((p) => p.id === id) ?? ALL_PAGES[0]!;
}

export function groupForPage(id: string): DocGroup | null {
  for (const g of GROUPS) {
    if (g.pages.some((p) => p.id === id)) return g;
  }
  return null;
}
