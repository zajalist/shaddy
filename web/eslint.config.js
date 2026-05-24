// Module-boundary enforcement for CONTRACTS.md "Dependency direction".
//
// Allowed direction:    integration → { ux, cards, compiler, editor, renderer, shared }
//                       ux → { renderer (entry), editor (entry), cards (entry), compiler (entry), shared }
//                       cards → { editor (entry), shared }
//                       renderer, editor, compiler, shared → ∅  (leaves)
//
// Anything pointing the wrong way is a bug. We enforce with core ESLint's
// `no-restricted-imports` against the `@/*` path aliases — no plugin install.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Patterns matching both the module's public entry and any deep import.
const entryAndDeep = (mod) => [`@/${mod}`, `@/${mod}/**`];
const deepOnly = (mod) => [`@/${mod}/**`];

const restrict = (groups) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: groups.map(({ group, message }) => ({ group, message })),
    },
  ],
});

const xModule = (mod, reason) => ({
  group: entryAndDeep(mod),
  message: `Cross-module import of @/${mod} forbidden — ${reason} (see CONTRACTS.md §dependency direction).`,
});

const deepSibling = (mod) => ({
  group: deepOnly(mod),
  message: `Deep import into @/${mod} forbidden — use the @/${mod} entry point only (see CONTRACTS.md §1/2).`,
});

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', '.vite', 'coverage'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
    },
    rules: {
      // The mock harness path uses `require`-shaped paths in JSDoc comments;
      // we don't actually use CommonJS in src.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // renderer/ — leaf. Must not import editor, ux, integration.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: restrict([
      xModule('editor', 'renderer is a leaf module'),
      xModule('ux', 'renderer is a leaf module'),
      xModule('integration', 'renderer is a leaf module'),
    ]),
  },

  // editor/ — leaf. Must not import renderer, ux, integration.
  {
    files: ['src/editor/**/*.{ts,tsx}'],
    rules: restrict([
      xModule('renderer', 'editor is a leaf module'),
      xModule('ux', 'editor is a leaf module'),
      xModule('integration', 'editor is a leaf module'),
    ]),
  },

  // shared/ — leaf. Must not import any application module.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: restrict([
      xModule('renderer', 'shared is a leaf module'),
      xModule('editor', 'shared is a leaf module'),
      xModule('ux', 'shared is a leaf module'),
      xModule('integration', 'shared is a leaf module'),
    ]),
  },

  // ux/ — composes renderer + editor + cards entry points, may not import integration.
  {
    files: ['src/ux/**/*.{ts,tsx}'],
    rules: restrict([
      xModule('integration', 'ux is consumed by integration, not the other way around'),
      deepSibling('renderer'),
      deepSibling('editor'),
      deepSibling('cards'),
      deepSibling('compiler'),
    ]),
  },

  // cards/ — may import @/editor (entry, for AST helpers); must not import
  // @/renderer / @/ux / @/integration. The renderer is consumed by the
  // integration layer; cards/ produces GLSL strings + uniform bindings as
  // pure data.
  {
    files: ['src/cards/**/*.{ts,tsx}'],
    rules: restrict([
      xModule('renderer', 'cards/ produces GLSL strings; renderer is consumed by integration/'),
      xModule('ux', 'cards is a leaf-side module to ux/'),
      xModule('integration', 'cards is a leaf-side module to integration/'),
      deepSibling('editor'),
    ]),
  },

  // compiler/ — leaf, owns its own contract. Must not import any other
  // application module. Consumers (cards/, ux/, integration/) may import
  // from @/compiler entry only.
  {
    files: ['src/compiler/**/*.{ts,tsx}'],
    rules: restrict([
      xModule('renderer', 'compiler is a pure-logic module; renderer consumes its output'),
      xModule('editor', 'compiler is a leaf'),
      xModule('cards', 'compiler is the replacement for cards/; no back-references'),
      xModule('ux', 'compiler is a leaf'),
      xModule('integration', 'compiler is a leaf'),
    ]),
  },

  // Note: each module block above already forbids @/integration. There is
  // intentionally no catch-all `src/**` block — that would override the more
  // specific per-module restrictions (flat-config "latter wins" for same-name
  // rules). All app code lives in one of the five module folders, so a
  // catch-all is also unnecessary.

  // Test files relax some hygiene rules but still respect module boundaries.
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
