// The editor — preview top-left, code bottom-left, recipe right.
// Wires the cards store → compile → renderer + reparse round-trip.

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
import { Glyph } from '@/cards/ui/icons';

import { Logo } from './Logo';
import {
  FRAGMENT_PREAMBLE,
  USER_LINE_OFFSET,
  createRenderer,
  type RendererAPI,
  type Uniform,
} from '@/renderer';

const CODE_EDIT_DEBOUNCE_MS = 250;
const DEFAULT_STARTER_ID = 'sunset';

export function Editor(props: { onHome?: () => void }) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);

  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);

  const [editMode, setEditMode] = useState(false);
  const [syntaxPending, setSyntaxPending] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const [activeStarterId, setActiveStarterId] = useState<string>(DEFAULT_STARTER_ID);
  const [fps, setFps] = useState<number>(60);
  const [bufferSize, setBufferSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const codeViewRef = useRef<CodeViewHandle>(null);

  useEffect(() => {
    if (recipe.cards.length === 0) {
      const starter = STARTER_RECIPES.find((s) => s.id === DEFAULT_STARTER_ID) ?? STARTER_RECIPES[0];
      if (starter) setRecipe(cloneRecipeWithFreshIds(starter.recipe));
    }
  }, []);

  const compiled: CompiledShader = useMemo(() => compile(recipe), [recipe]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const r = createRenderer();
    r.mount(host);
    rendererRef.current = r;

    const dpr = window.devicePixelRatio || 1;
    const applySize = () => {
      const cw = host.clientWidth;
      const ch = host.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      const w = Math.floor(cw * dpr);
      const h = Math.floor(ch * dpr);
      r.resize(w, h);
      setBufferSize({ w, h });
    };
    applySize();

    const ro = new ResizeObserver(() => applySize());
    ro.observe(host);

    const fpsTimer = window.setInterval(() => {
      const v = r.getFps();
      if (typeof v === 'number' && !Number.isNaN(v)) setFps(Math.round(v));
    }, 500);

    return () => {
      ro.disconnect();
      window.clearInterval(fpsTimer);
      host.querySelectorAll('canvas').forEach((c) => c.remove());
      rendererRef.current = null;
    };
  }, []);

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
    window.requestAnimationFrame(() => {
      codeViewRef.current?.scrollToSpan(cardId);
    });
  };

  const cardCount = recipe.cards.length;
  const lineCount = compiled.glsl.split('\n').length;

  return (
    <div className="min-h-dvh h-dvh w-full flex flex-col text-ink overflow-hidden">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 h-14 border-b-2 border-ink bg-paper-2 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <Wordmark onClick={props.onHome} />
          <span className="hidden md:inline-block mx-2 h-5 w-px bg-ink/30" />
          <span className="hidden md:inline-block text-[11px] tracking-[0.18em] uppercase font-mono font-bold text-mute">
            shader playground
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill label="cards" value={String(cardCount).padStart(2, '0')} />
          <StatusPill label="lines" value={String(lineCount).padStart(3, '0')} />
          <StatusPill
            label="fps"
            value={String(fps)}
            tone={fps >= 50 ? 'mint' : fps >= 30 ? 'mustard' : 'coral'}
          />
          <span className="mx-1 h-5 w-px bg-ink/30" />
          <StarterPicker
            active={activeStarterId}
            onPick={(starterId) => {
              const s = STARTER_RECIPES.find((x) => x.id === starterId);
              if (s) {
                setRecipe(cloneRecipeWithFreshIds(s.recipe));
                setActiveStarterId(starterId);
                structuralKeyRef.current = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowCode((s) => !s)}
            className={`h-9 px-3 rounded-md border-2 border-ink text-[12px] font-bold uppercase tracking-[0.1em] transition-all hover:-translate-y-[1px] active:translate-y-[1px] flex items-center gap-1.5 ${
              showCode ? 'bg-mustard text-ink' : 'bg-paper-3 text-ink'
            }`}
            style={{ boxShadow: '2px 2px 0 0 var(--color-ink)' }}
            title="Toggle code panel"
          >
            <Glyph.Code size={14} />
            <span className="hidden sm:inline">code</span>
          </button>
        </div>
      </header>

      {/* ── MAIN GRID ───────────────────────────────────────────────── */}
      {/* 50/50 split on desktop — Canva-style: left = preview + code,
          right = recipe board. Stacks on small screens. */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Left column: preview (top) + code (bottom) */}
        <section className="flex flex-col gap-4 min-h-0">
          {/* PREVIEW */}
          <div
            className={`relative flex flex-col rounded-xl border-ink bg-paper-2 overflow-hidden ${
              showCode ? 'flex-[3]' : 'flex-1'
            } min-h-0`}
            style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
          >
            <PanelHeader
              label="Preview"
              kicker={
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-mint border border-ink dot-live" />
                  live
                </span>
              }
              right={
                <div className="flex items-center gap-3 text-[11px] font-mono text-mute tabular-nums">
                  {bufferSize.w > 0 && (
                    <span>
                      {bufferSize.w}<span className="text-mute-soft">×</span>{bufferSize.h}
                    </span>
                  )}
                  <span className="uppercase font-bold tracking-[0.1em] text-ink">
                    {recipe.canvasAspect}
                  </span>
                </div>
              }
            />
            <CanvasStage hostRef={canvasHostRef} />
          </div>

          {/* CODE */}
          {showCode && (
            <div
              className="relative flex flex-col rounded-xl border-ink bg-paper-2 overflow-hidden flex-[2] min-h-[200px] rise-in"
              style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
            >
              <PanelHeader
                label="Source"
                kicker={<span className="lowercase">glsl · fragment</span>}
                right={
                  <label className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] font-mono font-bold text-ink cursor-pointer select-none">
                    <span
                      className={`relative inline-flex w-9 h-4.5 rounded-full border-2 border-ink transition-colors ${
                        editMode ? 'bg-mustard' : 'bg-paper'
                      }`}
                      style={{ width: '36px', height: '18px' }}
                    >
                      <input
                        type="checkbox"
                        checked={editMode}
                        onChange={(e) => setEditMode(e.target.checked)}
                        className="sr-only"
                      />
                      <span
                        className={`absolute top-[1px] w-3.5 h-3.5 rounded-full bg-ink transition-transform ${
                          editMode ? 'translate-x-[18px]' : 'translate-x-[1px]'
                        }`}
                      />
                    </span>
                    <span>{editMode ? 'editing' : 'read-only'}</span>
                  </label>
                }
              />
              <div className="flex-1 min-h-0 bg-inkwell border-t-2 border-ink">
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
        </section>

        {/* Right column: RECIPE — the main editing surface */}
        <aside
          className="min-h-0 flex flex-col rounded-xl border-ink bg-paper-2 overflow-hidden"
          style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
        >
          {/* Big Canva-style header */}
          <div className="border-b-2 border-ink bg-paper-3 shrink-0">
            <div className="flex items-end justify-between px-5 pt-4 pb-3 gap-4">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display font-extrabold text-[28px] leading-none text-ink">
                    Recipe
                  </h2>
                  <span className="text-[11px] font-mono font-bold text-mute uppercase tracking-[0.16em]">
                    your blocks
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-mute font-medium">
                  Stack cards top → bottom. Each card paints onto the canvas in order.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CountChip tone="mustard" label="cards" value={String(cardCount).padStart(2, '0')} />
                <CountChip tone="mint" label="flow" value="↓" />
              </div>
            </div>
            <div className="px-5 pb-3 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-mute">
              <span className="w-1.5 h-1.5 rounded-full bg-mint border border-ink" />
              <span>auto-saves to the canvas</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scroll-chunk p-5">
            <CardStack onEditCode={handleEditWildcardCode} />
          </div>
        </aside>
      </main>
    </div>
  );
}

// ─── CanvasStage ───────────────────────────────────────────────────────

function CanvasStage(props: { hostRef: React.RefObject<HTMLDivElement | null> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const recompute = () => {
      const r = stage.getBoundingClientRect();
      const s = Math.max(0, Math.floor(Math.min(r.width, r.height)));
      setSide(s);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="flex-1 min-h-0 grid place-items-center p-5">
      <div className="relative" style={{ width: side, height: side }}>
        <div
          ref={props.hostRef}
          className="absolute inset-0 canvas-inset border-ink-thick rounded-md overflow-hidden"
          style={{ boxShadow: '6px 6px 0 0 var(--color-ink)' }}
        />
        <CornerTicks />
      </div>
    </div>
  );
}

// ─── Panel chrome ──────────────────────────────────────────────────────

function PanelHeader(props: {
  label: string;
  kicker?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 h-10 border-b-2 border-ink bg-paper-3 shrink-0">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="font-display font-extrabold text-[15px] text-ink leading-none">
          {props.label}
        </span>
        {props.kicker && (
          <span className="text-[11px] font-mono text-mute font-medium truncate">
            · {props.kicker}
          </span>
        )}
      </div>
      {props.right}
    </div>
  );
}

function CornerTicks() {
  return (
    <>
      <Cross className="-top-3 -left-3" />
      <Cross className="-top-3 -right-3" />
      <Cross className="-bottom-3 -left-3" />
      <Cross className="-bottom-3 -right-3" />
    </>
  );
}

function Cross(props: { className?: string }) {
  return (
    <svg
      className={`absolute pointer-events-none text-ink ${props.className ?? ''}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

function CountChip(props: { tone: 'mustard' | 'mint' | 'coral'; label: string; value: string }) {
  const bg = props.tone === 'coral' ? 'bg-coral' : props.tone === 'mint' ? 'bg-mint' : 'bg-mustard';
  return (
    <div
      className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-md border-2 border-ink ${bg}`}
      style={{ boxShadow: '2px 2px 0 0 var(--color-ink)' }}
    >
      <span className="font-mono font-bold tabular-nums text-[16px] leading-none text-ink">
        {props.value}
      </span>
      <span className="font-mono text-[8.5px] tracking-[0.18em] uppercase font-bold text-ink/80 mt-0.5">
        {props.label}
      </span>
    </div>
  );
}

function StatusPill(props: {
  label: string;
  value: string;
  tone?: 'mint' | 'mustard' | 'coral';
}) {
  const toneBg =
    props.tone === 'coral'
      ? 'bg-coral'
      : props.tone === 'mustard'
        ? 'bg-mustard'
        : props.tone === 'mint'
          ? 'bg-mint'
          : 'bg-paper-3';
  return (
    <span
      className={`hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border-2 border-ink ${toneBg}`}
    >
      <span className="text-[9.5px] uppercase tracking-[0.18em] font-mono font-bold text-ink">
        {props.label}
      </span>
      <span className="text-[12px] tabular-nums font-mono font-bold text-ink">{props.value}</span>
    </span>
  );
}

function Wordmark(props: { onClick?: () => void }) {
  const Inner = (
    <div className="flex items-center gap-2.5 select-none">
      <Logo size={40} />
      <span className="font-display font-extrabold text-[28px] leading-none text-ink">
        Shaddy<span className="text-coral">!</span>
      </span>
    </div>
  );
  if (props.onClick) {
    return (
      <button type="button" onClick={props.onClick} className="hover-wiggle">
        {Inner}
      </button>
    );
  }
  return Inner;
}

// ─── Starter picker ────────────────────────────────────────────────────

function StarterPicker(props: { active: string; onPick: (starterId: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 rounded-md border-2 border-ink bg-paper-3 text-ink hover:bg-paper transition-all hover:-translate-y-[1px] active:translate-y-[1px] flex items-center gap-1.5"
        style={{ boxShadow: '2px 2px 0 0 var(--color-ink)' }}
      >
        <Glyph.Sparkle size={14} />
        <span className="text-[12px] tracking-[0.08em] font-bold uppercase">presets</span>
        <Glyph.ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-80 rounded-lg border-ink bg-paper-3 z-30 p-2 pop-in"
            style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
          >
            <div className="px-2 py-1.5 text-[10.5px] uppercase tracking-[0.18em] font-mono font-bold text-mute">
              Starters
            </div>
            <div className="space-y-1">
              {STARTER_RECIPES.map((s) => {
                const isActive = s.id === props.active;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      props.onPick(s.id);
                      setOpen(false);
                    }}
                    className={`group w-full text-left p-2.5 rounded-md border-2 transition-all hover:-translate-y-[1px] active:translate-y-[1px] flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-mustard border-ink'
                        : 'bg-paper-2 border-ink hover:bg-paper'
                    }`}
                    style={isActive ? { boxShadow: '2px 2px 0 0 var(--color-ink)' } : undefined}
                  >
                    <span
                      className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 border-2 border-ink ${
                        isActive ? 'bg-ink' : 'bg-paper-3'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] truncate font-semibold text-ink">{s.name}</div>
                      <div className="text-[11px] text-mute truncate font-mono">{s.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function structuralKey(c: CompiledShader): string {
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
