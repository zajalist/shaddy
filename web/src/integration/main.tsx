// App entrypoint + routes.
//
//   /              → Landing marketing page (RDHero + templates gallery)
//   /design        → DesignApp editor (warm-cream block composer wired to
//                    the real cards engine + WebGL2 renderer)
//   /mascot        → MascotDemo playground (kept for the mascot route the
//                    design system relies on)
//   /landing       → alias for / so external links keep working
//   /auth/callback → OIDC redirect target; exchanges ?code for tokens then
//                    bounces back to the page the user came from.
//
// The legacy AppShell at `/` and ShaderView at `/view` were removed once
// the design-route integration shipped.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MascotDemo } from '@/ux/Mascot';
import { DesignApp } from '@/design';
import { Landing } from '@/design/Landing';
import { AuthCallback } from '@/auth';
import { lazy, Suspense } from 'react';
import '@/index.css';

// Lazy-load the marketing/reference pages so the editor + landing routes
// don't carry their JS. They land as agents ship them; the Suspense fallback
// covers any in-flight ones.
// Each lazy import is wrapped so missing files (agents still building) fall
// back to a "coming soon" placeholder rather than crashing the whole app.
const lazyOrSoon = (loader: () => Promise<{ default: React.ComponentType }>) =>
  lazy(() => loader().catch(() => ({ default: ComingSoon })));

// Gallery default-exports `Gallery`; Library/Learn export both named and
// default; Docs may still be in-flight. All four go through lazyOrSoon so
// any missing/broken page falls back to ComingSoon rather than crashing.
const Library = lazyOrSoon(() => import('@/design/pages/Library'));
const Learn   = lazyOrSoon(() => import('@/design/pages/Learn').then(m => ({ default: (m as { default?: React.ComponentType; Learn?: React.ComponentType }).default ?? (m as { Learn: React.ComponentType }).Learn })));
const Gallery = lazyOrSoon(() => import('@/design/pages/Gallery'));
const Docs    = lazyOrSoon(() => import('@/design/pages/Docs'));

const ComingSoon = () => (
  <div style={{
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#e6e1d6', color: '#5a5040',
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
    flexDirection: 'column', gap: 8, padding: 24, textAlign: 'center',
  }}>
    <div style={{ font: '700 32px "Bricolage Grotesque", system-ui, sans-serif', color: '#1f1c14' }}>coming soon</div>
    <div style={{ font: '500 13px "Geist Mono", ui-monospace, monospace', opacity: 0.7 }}>
      this page is being built — refresh in a minute
    </div>
    <a href="/" style={{ marginTop: 12, color: '#966B17', textDecoration: 'underline' }}>back to landing</a>
  </div>
);

const PageFallback = () => (
  <div style={{
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#e6e1d6', color: '#5a5040', fontFamily: 'system-ui, sans-serif',
  }}>
    loading…
  </div>
);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/design" element={<DesignApp />} />
          <Route path="/library" element={<Library />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/mascot" element={<MascotDemo />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
