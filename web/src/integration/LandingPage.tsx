// Landing page in playground-brutalist. Hero (live shader), benefits,
// how-it-works, template grid, final CTA. All routes go to onLaunch()
// which the top-level AppShell flips to the editor view.

import { useEffect, useRef, useState } from 'react';

import { createRenderer, type RendererAPI, TEMPLATES } from '@/renderer';
import { Glyph } from '@/cards/ui/icons';

import { Logo } from './Logo';

const HERO_SOURCE =
  (TEMPLATES.find((t) => t.id === 'plasma') ?? TEMPLATES[0])?.source?.trim() ?? '';

const BENEFITS = [
  {
    title: 'Drag-to-edit',
    description:
      'Change a number in the code, the canvas updates. Drag a visual handle, the GLSL reflects it back.',
    tone: 'bg-mustard',
  },
  {
    title: 'Zero friction',
    description:
      'Browser-only. No backend, no sign-up. Share via URL hash. Open on any device.',
    tone: 'bg-cobalt text-paper',
  },
  {
    title: 'Readable math',
    description:
      '12 templates. Each is 20–40 lines of real GLSL you can learn from and modify.',
    tone: 'bg-coral',
  },
] as const;

const STEPS = [
  {
    number: '01',
    title: 'Pick a shader',
    description: 'Start with one of 12 templates. Plasma. Checkerboard. Voronoi. All live.',
    tone: 'bg-mustard',
  },
  {
    number: '02',
    title: 'Drag or code',
    description: 'Drag a visual handle and watch the GLSL rewrite itself. Or type it directly.',
    tone: 'bg-mint',
  },
  {
    number: '03',
    title: 'Share a URL',
    description: 'Hit share. Your shader lives in the URL hash. Send it. It just works.',
    tone: 'bg-lavender',
  },
] as const;

export function LandingPage(props: { onLaunch: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof window !== 'undefined' && !('WebGL2RenderingContext' in window)) {
      setHeroError('WebGL2 is not available in this browser.');
      return;
    }

    const r = createRenderer();
    r.mount(host);
    r.compile(HERO_SOURCE);
    rendererRef.current = r;
    setLoaded(true);

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      r.resize(host.clientWidth * dpr, host.clientHeight * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    return () => {
      ro.disconnect();
      host.querySelectorAll('canvas').forEach((c) => c.remove());
      rendererRef.current = null;
    };
  }, []);

  return (
    <main className="min-h-dvh text-ink">
      {/* ── NAV ────────────────────────────────────────────────────── */}
      <nav className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={52} />
          <div className="leading-tight">
            <div className="font-display font-extrabold text-[24px] text-ink">
              Shaddy<span className="text-coral">!</span>
            </div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-mute">
              shader playground
            </div>
          </div>
        </div>
        <BigButton onClick={props.onLaunch} tone="ink">
          Open editor
          <Glyph.ArrowRight size={15} />
        </BigButton>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 mt-8 grid gap-10 lg:grid-cols-[1.05fr_1fr] items-start">
        <div className="space-y-7 pt-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-ink bg-mint text-ink text-[11px] uppercase tracking-[0.16em] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-ink dot-live" />
            now playable
          </span>
          <h1 className="font-display font-extrabold text-[56px] sm:text-[68px] leading-[0.95] tracking-tight">
            Shaders should be as <span className="text-coral">easy</span> as <span className="bg-mustard border-2 border-ink px-3 py-1 rounded-md inline-block -rotate-1">Scratch.</span>
          </h1>
          <p className="text-[17px] leading-relaxed text-ink/80 max-w-xl">
            Drag a circle on the canvas. The GLSL updates. Edit a number in the code.
            The circle moves. There is no abstraction layer between you and the math.
          </p>

          <ul className="space-y-3 pt-1">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-start gap-3">
                <span
                  className={`shrink-0 w-9 h-9 grid place-items-center rounded-md border-2 border-ink ${b.tone}`}
                  style={{ boxShadow: '2px 2px 0 0 var(--color-ink)' }}
                >
                  <Glyph.Sparkle size={15} />
                </span>
                <div>
                  <p className="font-semibold text-[15px] text-ink leading-tight">{b.title}</p>
                  <p className="text-[13.5px] text-mute mt-0.5">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 pt-3">
            <BigButton onClick={props.onLaunch} tone="coral">
              Try it now
              <Glyph.Play size={14} />
            </BigButton>
            <BigButton onClick={() => scrollTo('templates')} tone="paper">
              Browse templates
            </BigButton>
          </div>
        </div>

        {/* Live shader frame */}
        <div className="relative">
          <div className="absolute -inset-8 -z-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-mustard blur-3xl opacity-50" />
            <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-lavender blur-3xl opacity-40" />
          </div>
          <div
            className="relative rounded-2xl border-ink-thick bg-paper-2 overflow-hidden"
            style={{ boxShadow: '8px 8px 0 0 var(--color-ink)' }}
          >
            <div className="flex items-center justify-between px-4 h-10 border-b-2 border-ink bg-paper-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-ink bg-coral" />
                <span className="w-3 h-3 rounded-full border-2 border-ink bg-mustard" />
                <span className="w-3 h-3 rounded-full border-2 border-ink bg-mint" />
              </div>
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">
                plasma · live
              </span>
            </div>
            <div className="relative aspect-square">
              {heroError ? (
                <div className="absolute inset-0 grid place-items-center px-6 text-center text-[13px] text-mute font-mono">
                  {heroError}
                </div>
              ) : (
                <>
                  <div
                    ref={hostRef}
                    className={`absolute inset-0 canvas-inset transition-opacity duration-700 ${
                      loaded ? 'opacity-100' : 'opacity-30'
                    }`}
                  />
                  {!loaded && (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <div className="inline-block w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mb-2" />
                        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-mute">
                          warming up
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-4 py-2 border-t-2 border-ink bg-paper-3 flex items-center justify-between">
              <span className="font-mono text-[11px] text-mute">webgl2 · move your cursor</span>
              <span className="font-mono text-[11px] font-bold text-ink">u_mouse</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-6 mt-28">
        <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-mute mb-2">
              How it works
            </div>
            <h2 className="font-display font-extrabold text-[44px] leading-[0.95] tracking-tight">
              Three actions. That's it.
            </h2>
          </div>
          <span className="text-[12px] font-mono text-mute">no docs needed →</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`relative rounded-xl border-ink-thick p-5 ${step.tone}`}
              style={{ boxShadow: '6px 6px 0 0 var(--color-ink)' }}
            >
              <div className="font-mono font-bold text-[14px] tracking-[0.16em] text-ink mb-4">
                {step.number}
              </div>
              <h3 className="font-display font-extrabold text-[26px] leading-tight mb-2 text-ink">
                {step.title}
              </h3>
              <p className="text-[13.5px] text-ink/85 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TEMPLATES ─────────────────────────────────────────────── */}
      <section id="templates" className="mx-auto max-w-6xl px-6 mt-28">
        <div className="mb-10">
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-mute mb-2">
            Template library
          </div>
          <h2 className="font-display font-extrabold text-[44px] leading-[0.95] tracking-tight">
            Pick one of {TEMPLATES.length}.
          </h2>
          <p className="text-mute mt-2 text-[14px] max-w-xl">
            Plasma, checkerboard, voronoi, gradient noise — all ready to remix.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {TEMPLATES.map((tpl, i) => {
            const palette = ['bg-mustard', 'bg-mint', 'bg-coral', 'bg-lavender'] as const;
            const swatch = palette[i % palette.length];
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={props.onLaunch}
                className="group text-left rounded-xl border-ink bg-paper-2 hover:bg-paper-3 transition-all hover:-translate-y-[2px] active:translate-y-[1px] overflow-hidden"
                style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
              >
                <div className={`h-2.5 ${swatch} border-b-2 border-ink`} />
                <div className="px-3.5 py-3 flex items-center justify-between gap-2">
                  <span className="font-semibold text-[13.5px] text-ink truncate">{tpl.name}</span>
                  <Glyph.ArrowRight size={12} className="text-mute group-hover:text-ink" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 mt-28">
        <div
          className="relative rounded-2xl border-ink-thick bg-mustard p-10 sm:p-14 text-center overflow-hidden"
          style={{ boxShadow: '8px 8px 0 0 var(--color-ink)' }}
        >
          {/* Decoration */}
          <span
            aria-hidden
            className="absolute -top-4 -left-4 w-16 h-16 rounded-full border-ink-thick bg-coral"
          />
          <span
            aria-hidden
            className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full border-ink-thick bg-cobalt"
          />
          <h2 className="font-display font-extrabold text-[48px] sm:text-[60px] leading-[0.95] text-ink relative">
            Ready to make<br />some shaders?
          </h2>
          <p className="mt-4 text-ink/80 max-w-xl mx-auto text-[15px]">
            Pick a template, drag the math. Share via URL. That's all there is.
          </p>
          <div className="mt-7 flex justify-center gap-3 flex-wrap relative">
            <BigButton onClick={props.onLaunch} tone="ink">
              Open editor
              <Glyph.ArrowRight size={15} />
            </BigButton>
            <BigButton onClick={() => scrollTo('templates')} tone="paper">
              Browse templates
            </BigButton>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-6xl px-6 mt-20 mb-10">
        <div className="border-t-2 border-ink/30 pt-6 flex flex-wrap items-center justify-between gap-3 text-[12px] font-mono text-mute">
          <span>Frontend-only. No backend. Built for a hackathon. Open source.</span>
          <span className="font-bold uppercase tracking-[0.16em] text-ink">v0</span>
        </div>
      </footer>
    </main>
  );
}

// ─── BigButton ─────────────────────────────────────────────────────────
// One chunky primitive — used by hero, nav, and CTAs.

function BigButton(props: {
  onClick?: () => void;
  tone?: 'ink' | 'coral' | 'paper' | 'mustard' | 'mint';
  children: React.ReactNode;
}) {
  const tone = props.tone ?? 'ink';
  const palette = {
    ink: 'bg-ink text-paper hover:bg-ink-soft',
    coral: 'bg-coral text-ink hover:bg-coral-soft',
    paper: 'bg-paper-3 text-ink hover:bg-paper-2',
    mustard: 'bg-mustard text-ink hover:bg-mustard-soft',
    mint: 'bg-mint text-ink hover:bg-mint-soft',
  }[tone];
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 px-5 h-12 rounded-full border-ink-thick font-bold text-[13.5px] uppercase tracking-[0.1em] transition-all hover:-translate-y-[2px] active:translate-y-[1px] ${palette}`}
      style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
    >
      {props.children}
    </button>
  );
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
