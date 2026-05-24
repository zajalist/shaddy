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
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/design" element={<DesignApp />} />
        <Route path="/mascot" element={<MascotDemo />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
