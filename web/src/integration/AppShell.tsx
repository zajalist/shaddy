import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createRenderer, type RendererAPI, TEMPLATES } from '@/renderer';

// Palette extracted from plasma shader output
const COLORS = {
  accent1: '#d926ef', // magenta
  accent2: '#0ea5e9', // cyan
  accent3: '#facc15', // yellow
};

const BENEFITS = [
  {
    icon: '⟳',
    title: 'Drag-to-edit',
    description: 'Change a number in the code, the canvas updates. Drag a visual handle, the GLSL reflects it back.',
  },
  {
    icon: '⌘',
    title: 'Zero friction',
    description: 'Browser-only. No backend, no sign-up, no secrets. Share via URL hash—open on any device.',
  },
  {
    icon: '◾',
    title: 'Readable math',
    description: '12 templates from circles to raymarching. Each is 20–40 lines of real GLSL you can learn from.',
  },
];

const STEPS = [
  {
    number: '1',
    title: 'Pick a shader',
    description: 'Start with one of 12 templates. Plasma. Checkerboard. Voronoi. Gradient noise. All live.',
  },
  {
    number: '2',
    title: 'Drag or code',
    description: 'Drag a visual handle on the canvas and watch the GLSL rewrite itself. Or type directly.',
  },
  {
    number: '3',
    title: 'Share a URL',
    description: 'Hit share. Your shader lives in the URL hash. Send it to anyone. It just works.',
  },
];

const HERO_SOURCE = (TEMPLATES.find((t) => t.id === 'plasma') ?? TEMPLATES[0])?.source?.trim() ?? '';

export function AppShell() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const templateNames = TEMPLATES.map((t) => t.name);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof window !== 'undefined' && !('WebGL2RenderingContext' in window)) {
      setHeroError('WebGL2 is not available in this browser.');
      return;
    }

    const renderer = createRenderer();
    renderer.mount(host);
    renderer.compile(HERO_SOURCE);
    rendererRef.current = renderer;
    setLoaded(true);

    const resize = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      renderer.resize(host.clientWidth * dpr, host.clientHeight * dpr);
    };

    resize();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(host);
    }
    window.addEventListener('resize', resize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <main className="min-h-dvh bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Compact nav */}
        <nav className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Shaddy</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Shaders should be as easy to learn as Scratch.</h1>
          </div>
          <Link
            to="/view"
            className="inline-block rounded-full bg-white px-6 py-2.5 font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            Launch editor
          </Link>
        </nav>

        {/* Hero section with live preview */}
        <section className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col justify-start space-y-5">
            <div className="inline-block w-fit rounded-full border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Built 36 hours / Frontend-only
            </div>

            <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Code and canvas are one surface.
            </h2>

            <p className="max-w-prose text-lg leading-relaxed text-zinc-300">
              Drag a circle on the canvas. The GLSL updates. Edit a number in the code. The circle moves. There is no abstraction layer between you and the math.
            </p>

            <ul className="space-y-3 pt-2">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-3">
                  <span className="flex-shrink-0 text-xl text-zinc-400">{b.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{b.title}</p>
                    <p className="text-sm text-zinc-400">{b.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/view"
                className="rounded-full bg-white px-5 py-2 font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Open the editor
              </Link>
              <a
                href="#how"
                className="rounded-full border border-zinc-700 px-5 py-2 font-semibold text-white transition hover:border-zinc-400"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Live shader preview */}
          <div className="relative">
            <div
              className="absolute -inset-4 rounded-3xl blur-3xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent1}20, ${COLORS.accent2}20, ${COLORS.accent3}20)`,
              }}
            />
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl">
              {heroError ? (
                <div className="flex h-80 items-center justify-center px-6 text-center text-sm text-zinc-400">
                  {heroError}
                </div>
              ) : (
                <>
                  <div ref={hostRef} className={`h-80 w-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
                  {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-pulse text-xs text-zinc-400">Loading shader...</div>
                    </div>
                  )}
                </>
              )}
              <div className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
                Live WebGL2 preview / Move your cursor
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-20 space-y-10">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight">Three actions. That's it.</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-3">
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full font-bold"
                  style={{
                    background: COLORS.accent1,
                    color: 'white',
                  }}
                >
                  {step.number}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="max-w-prose text-sm leading-relaxed text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="mt-20 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Template library</p>
            <h2 className="text-3xl font-bold tracking-tight">Start from a shader that already looks good.</h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {templateNames.map((name) => (
              <Link
                key={name}
                to="/view"
                className="group rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900/60"
              >
                {name}
              </Link>
            ))}
          </div>
        </section>

        {/* Tech credibility */}
        <section className="mt-20 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Stack</p>
              <p className="text-sm text-zinc-300">React + Vite + TypeScript. WebGL2 (works everywhere).</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Performance</p>
              <p className="text-sm text-zinc-300">60 fps target on mid-range phones. Adaptive resolution on slow hardware.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Scope</p>
              <p className="text-sm text-zinc-300">Frontend only. Share via URL hash. No backend, no server needed.</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to drag some math?</h2>
          <p className="mt-3 text-zinc-400">Open the editor and pick a template. 30 seconds to your first live shader.</p>
          <Link
            to="/view"
            className="mt-6 inline-block rounded-full bg-white px-6 py-2.5 font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            Let's go
          </Link>
        </section>
      </div>
    </main>
  );
}
