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
    title: 'Drag-to-edit',
    description: 'Change a number in the code, the canvas updates. Drag a visual handle, the GLSL reflects it back.',
    color: COLORS.accent1,
  },
  {
    title: 'Zero friction',
    description: 'Browser-only. No backend, no sign-up. Share via URL hash. Open on any device.',
    color: COLORS.accent2,
  },
  {
    title: 'Readable math',
    description: '12 templates. Each is 20–40 lines of real GLSL you can learn from and modify.',
    color: COLORS.accent3,
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
        <nav className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Shaddy</p>
            <p className="text-sm text-zinc-400">Drag. Code. Share. Learn shaders.</p>
          </div>
          <Link
            to="/view"
            className="inline-block rounded-full bg-white px-6 py-2.5 font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            Launch editor
          </Link>
        </nav>

        {/* Hero section with live preview */}
        <section className="mt-16 grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col space-y-6">
            <div>
              <h1 className="text-5xl font-bold tracking-tight leading-tight">
                Shaders should be as easy to learn as Scratch.
              </h1>
            </div>

            <p className="text-lg leading-relaxed text-zinc-300">
              Drag a circle on the canvas. The GLSL updates. Edit a number in the code. The circle moves. There is no abstraction layer between you and the math.
            </p>

            <ul className="space-y-4 pt-2">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-3">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: b.color }} />
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
                className="rounded-full bg-white px-6 py-2.5 font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Try it now
              </Link>
              <a
                href="#templates"
                className="rounded-full border border-zinc-700 px-6 py-2.5 font-semibold text-white transition hover:border-zinc-400 hover:bg-zinc-900/40"
              >
                Browse templates
              </a>
            </div>
          </div>

          {/* Live shader preview */}
          <div className="relative lg:row-span-2">
            <div
              className="absolute -inset-4 rounded-3xl blur-3xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent1}20, ${COLORS.accent2}20, ${COLORS.accent3}20)`,
              }}
            />
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl h-96 flex flex-col">
              <div className="flex-1 relative">
                {heroError ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-400">
                    {heroError}
                  </div>
                ) : (
                  <>
                    <div ref={hostRef} className={`w-full h-full transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-50'}`} />
                    {!loaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
                        <div className="text-center">
                          <div className="inline-block w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin mb-2" />
                          <div className="text-xs text-zinc-400">Loading shader...</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500 bg-zinc-950/40">
                Live WebGL2 / Move your cursor to interact
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-24 space-y-10">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">How it works</p>
            <h2 className="text-4xl font-bold tracking-tight">Three actions. That's it.</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-4">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg text-white"
                  style={{
                    background: COLORS.accent1,
                  }}
                >
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="mt-24 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Template library</p>
            <h2 className="text-4xl font-bold tracking-tight">Pick one of 12 templates.</h2>
            <p className="text-zinc-400 text-sm">Plasma. Checkerboard. Voronoi. Gradient noise. All ready to modify.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {templateNames.map((name) => (
              <Link
                key={name}
                to="/view"
                className="group rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-zinc-900/80 hover:text-white"
              >
                {name}
              </Link>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-24 py-12 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-950 text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Ready to make some shaders?</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">Pick a template, drag the math. Share via URL. That's all there is.</p>
          <div className="flex justify-center gap-3">
            <Link
              to="/view"
              className="inline-block rounded-full bg-white px-6 py-2.5 font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Launch the editor
            </Link>
            <a
              href="#templates"
              className="inline-block rounded-full border border-zinc-700 px-6 py-2.5 font-semibold text-white transition hover:border-zinc-400 hover:bg-zinc-900/40"
            >
              Browse templates
            </a>
          </div>
        </section>
      </div>

      {/* Simple footer */}
      <footer className="mt-16 border-t border-zinc-800 bg-zinc-950/50 py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-xs text-zinc-500">
          <p>Frontend-only. No backend. Built for a hackathon. Open source.</p>
        </div>
      </footer>
    </main>
  );
}
