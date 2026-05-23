// Cards-driven AppShell. Wires:
//   - useCardsStore (the Recipe)
//   - cards/compile (Recipe → GLSL + spans + uniforms)
//   - cards/reparse (code edit → Recipe delta)
//   - renderer (the WebGL2 canvas)
//   - CardStack (interactive editor of the Recipe)
//   - CodeView (live read-only / opt-in editable projection of the GLSL)
//
// Per Q5:
//   - Param value changes: setUniform per tick (no recompile).
//   - Structural recipe changes: recompile the renderer.
//   - Code edits: debounced reparse → apply the new Recipe.

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CardStack,
  CodeView,
  type CodeViewHandle,
  cloneRecipeWithFreshIds,
  compile,
  reparse,
  STARTER_RECIPES,
  useCardsStore,
} from '@/cards';
import type { CompiledShader } from '@/cards';
import {
  FRAGMENT_PREAMBLE,
  USER_LINE_OFFSET,
  createRenderer,
  type RendererAPI,
  type Uniform,
} from '@/renderer';

const CODE_EDIT_DEBOUNCE_MS = 250;
const DEFAULT_STARTER_ID = 'sunset';

export function AppShell() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);

  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);

  const [editMode, setEditMode] = useState(false);
  const [syntaxPending, setSyntaxPending] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const codeViewRef = useRef<CodeViewHandle>(null);

  // ── Load a starter recipe once on first mount ────────────────────────
  useEffect(() => {
    if (recipe.cards.length === 0) {
      const starter = STARTER_RECIPES.find((s) => s.id === DEFAULT_STARTER_ID) ?? STARTER_RECIPES[0];
      if (starter) setRecipe(cloneRecipeWithFreshIds(starter.recipe));
    }
    // Only runs once on mount; we deliberately ignore recipe/setRecipe in
    // the dep list so the starter only loads when the recipe is empty.
  }, []);

  // ── Compile recipe → CompiledShader (memoized — same recipe ref → same result) ──
  const compiled: CompiledShader = useMemo(() => compile(recipe), [recipe]);

  // ── Mount the renderer once, then drive it from compiled output ──────
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const r = createRenderer();
    r.mount(host);
    rendererRef.current = r;
    return () => {
      // The renderer cleans up its own RAF / DOM on the next mount call;
      // for the demo we don't bother detaching explicitly on unmount.
    };
  }, []);

  // Track the structural shape so we only call renderer.compile when the
  // GLSL would actually change (vs only the uniform values).
  const structuralKeyRef = useRef<string>('');

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const nextKey = structuralKey(compiled);
    if (nextKey !== structuralKeyRef.current) {
      const result = r.compile(compiled.glsl);
      structuralKeyRef.current = nextKey;
      if (!result.ok) {
        console.warn('[cards] renderer rejected compiled shader:', result.errors);
      }
    }
    for (const u of compiled.uniforms) {
      r.setUniform(u.name, toRendererUniform(u.value));
    }
  }, [compiled]);

  // ── Round-trip: code edit → reparse → setRecipe ──────────────────────
  // The code view shows the FULLY WRAPPED source (renderer preamble + body).
  // The reparser only cares about the body; we strip the preamble off the
  // edited source before passing it in.
  const wrappedSource = useMemo(
    () => `${FRAGMENT_PREAMBLE}\n${compiled.glsl}`,
    [compiled.glsl],
  );

  const debounceRef = useRef<number | null>(null);
  const compiledRef = useRef(compiled);
  const recipeRef = useRef(recipe);
  useEffect(() => {
    compiledRef.current = compiled;
    recipeRef.current = recipe;
  }, [compiled, recipe]);

  const handleCodeChange = (nextWrapped: string) => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const body = stripPreamble(nextWrapped, USER_LINE_OFFSET);
      const result = reparse(recipeRef.current, compiledRef.current, body);
      setSyntaxPending(result.syntaxPending);
      if (!result.syntaxPending && result.events.length > 0) {
        setRecipe(result.recipe);
      }
    }, CODE_EDIT_DEBOUNCE_MS);
  };

  const handleEditWildcardCode = (cardId: string) => {
    setShowCode(true);
    setEditMode(true);
    // Wait one frame so the CodeView is mounted / its source is up to date
    // before we ask it to scroll.
    window.requestAnimationFrame(() => {
      codeViewRef.current?.scrollToSpan(cardId);
    });
  };

  return (
    <div className="min-h-dvh w-full flex flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-900">
        <h1 className="text-xl font-semibold tracking-tight">Shaddy</h1>
        <div className="flex items-center gap-2">
          <StarterPicker
            onPick={(starterId) => {
              const s = STARTER_RECIPES.find((x) => x.id === starterId);
              if (s) {
                setRecipe(cloneRecipeWithFreshIds(s.recipe));
                structuralKeyRef.current = ''; // force recompile next tick
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowCode((s) => !s)}
            className={`px-3 py-1.5 text-xs rounded-md font-mono ${
              showCode
                ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {'</>'}
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 p-3 min-h-0">
        <div className="flex flex-col gap-3 min-h-0">
          <div
            ref={canvasHostRef}
            className="aspect-square w-full max-w-2xl mx-auto rounded-xl overflow-hidden ring-1 ring-neutral-800 shadow-2xl bg-black"
          />
          {showCode && (
            <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden ring-1 ring-neutral-800 flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 bg-neutral-950">
                <span className="text-xs uppercase tracking-wider text-neutral-500">code</span>
                <span className="flex-1" />
                <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editMode}
                    onChange={(e) => setEditMode(e.target.checked)}
                    className="accent-orange-500"
                  />
                  edit
                </label>
              </div>
              <div className="flex-1 min-h-0">
                <CodeView
                  ref={codeViewRef}
                  source={wrappedSource}
                  spans={compiled.spans}
                  preambleLineCount={USER_LINE_OFFSET}
                  editMode={editMode}
                  syntaxPending={syntaxPending}
                  onChange={handleCodeChange}
                />
              </div>
            </div>
          )}
        </div>

        <aside className="min-h-0 overflow-y-auto rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-900">
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2 px-1">recipe</div>
          <CardStack onEditCode={handleEditWildcardCode} />
        </aside>
      </main>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function StarterPicker(props: { onPick: (starterId: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 text-xs rounded-md bg-neutral-900 text-neutral-400 hover:text-neutral-200"
      >
        new ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-md ring-1 ring-neutral-800 bg-neutral-950 z-20 p-1 shadow-xl">
          {STARTER_RECIPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                props.onPick(s.id);
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-neutral-900"
            >
              <div className="text-neutral-200">{s.name}</div>
              <div className="text-[11px] text-neutral-500">{s.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function structuralKey(c: CompiledShader): string {
  // Anything that affects the GLSL beyond marker comments. Marker comments
  // contain param values which change at every tick — we strip them so a
  // param tick doesn't trigger a renderer recompile.
  return c.glsl.replace(/\{[^{}]*\}/g, '{}');
}

function stripPreamble(wrappedSource: string, preambleLines: number): string {
  const lines = wrappedSource.split('\n');
  return lines.slice(preambleLines).join('\n');
}

function toRendererUniform(value: number | readonly [number, number, number]): Uniform {
  if (Array.isArray(value)) {
    return { kind: 'vec3', value: [value[0], value[1], value[2]] };
  }
  return { kind: 'float', value: value as number };
}
