// Top-level shell — landing vs editor switch. Uses window.location.hash
// so a deep link like #/editor (or any non-empty hash) jumps straight
// to the editor and "Open editor" updates the hash too. Cheap state-router,
// no react-router-dom dependency.

import { useEffect, useState } from 'react';

import { Editor } from './Editor';
import { LandingPage } from './LandingPage';

type View = 'landing' | 'editor';

function readView(): View {
  if (typeof window === 'undefined') return 'landing';
  const h = window.location.hash.replace(/^#\/?/, '');
  return h.length > 0 ? 'editor' : 'landing';
}

export function AppShell() {
  const [view, setView] = useState<View>(readView);

  useEffect(() => {
    const onHashChange = () => setView(readView());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goEditor = () => {
    if (window.location.hash !== '#/editor') window.location.hash = '#/editor';
    setView('editor');
  };
  const goLanding = () => {
    if (window.location.hash !== '') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setView('landing');
  };

  if (view === 'editor') return <Editor onHome={goLanding} />;
  return <LandingPage onLaunch={goEditor} />;
}
