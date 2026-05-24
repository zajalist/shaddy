// Integrations — Keyboard shortcuts.

import type { DocPage } from './registry';
import { H2, P, KvTable } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd
    style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 4,
      background: '#1c2029',
      border: '1px solid #2e3440',
      color: '#e8e2d4',
      font: '500 12px "Geist Mono", ui-monospace, monospace',
      lineHeight: 1.4,
      margin: '0 2px',
    }}
  >
    {children}
  </kbd>
);

const Combo = ({ children }: { children: React.ReactNode }) => (
  <span>{children}</span>
);

const page: DocPage = {
  id: 'keyboard-shortcuts',
  title: 'Keyboard shortcuts',
  groupLabel: 'Integrations',
  lede: 'Editor bindings, recipe ops, navigation, and 3D camera. Mac uses ⌘; Windows / Linux use Ctrl.',
  body: (
    <>
      <P>
        Bindings are scoped to the composer at <Code>/design</Code> unless
        noted. Modifier names use the platform's primary modifier — Mac{' '}
        <Key>⌘</Key> ≡ Windows/Linux <Key>Ctrl</Key>.
      </P>

      <H2>Recipe ops</H2>
      <KvTable
        headers={['shortcut', 'action']}
        rows={[
          { key: <Combo><Key>⌘</Key> <Key>S</Key></Combo>, value: 'Copy a share URL with the current recipe to clipboard.' },
          { key: <Combo><Key>⌘</Key> <Key>Z</Key></Combo>, value: 'Undo last recipe mutation.' },
          { key: <Combo><Key>⇧</Key> <Key>⌘</Key> <Key>Z</Key></Combo>, value: 'Redo.' },
          { key: <Combo><Key>⌘</Key> <Key>D</Key></Combo>, value: 'Duplicate the selected card directly below it.' },
          { key: <Combo><Key>Del</Key></Combo>, value: 'Remove the selected card.' },
          { key: <Combo><Key>Space</Key></Combo>, value: 'Toggle the selected card enabled / disabled.' },
        ]}
      />

      <H2>Navigation</H2>
      <KvTable
        headers={['shortcut', 'action']}
        rows={[
          { key: <Combo><Key>↑</Key> / <Key>↓</Key></Combo>, value: 'Select previous / next card in the stack.' },
          { key: <Combo><Key>⌥</Key> <Key>↑</Key> / <Key>⌥</Key> <Key>↓</Key></Combo>, value: 'Reorder selected card up / down.' },
          { key: <Combo><Key>⌘</Key> <Key>K</Key></Combo>, value: 'Open the add-card picker.' },
          { key: <Combo><Key>/</Key></Combo>, value: 'Focus the picker search field.' },
          { key: <Combo><Key>Esc</Key></Combo>, value: 'Close any open popover (picker, AI panel, share toast).' },
        ]}
      />

      <H2>Code drawer (editor focused)</H2>
      <KvTable
        headers={['shortcut', 'action']}
        rows={[
          { key: <Combo><Key>⌘</Key> <Key>/</Key></Combo>, value: 'Toggle line comment for current selection.' },
          { key: <Combo><Key>Tab</Key></Combo>, value: 'Indent (or auto-complete known identifier).' },
          { key: <Combo><Key>⇧</Key> <Key>Tab</Key></Combo>, value: 'Outdent.' },
          { key: <Combo><Key>⌘</Key> <Key>Enter</Key></Combo>, value: 'Force recompile from the current editor state.' },
        ]}
      />

      <H2>3D camera (canvas focused, 3D mode)</H2>
      <KvTable
        headers={['shortcut', 'action']}
        rows={[
          { key: <Combo><Key>W</Key> / <Key>S</Key></Combo>, value: 'Fly forward / backward along view direction.' },
          { key: <Combo><Key>A</Key> / <Key>D</Key></Combo>, value: 'Strafe left / right.' },
          { key: <Combo><Key>Q</Key> / <Key>E</Key></Combo>, value: 'Fly down / up along world up.' },
          { key: <Combo><Key>R</Key></Combo>, value: 'Reset camera to its default position.' },
          { key: 'drag (LMB)', value: 'Orbit around the look target.' },
          { key: 'drag (RMB)', value: 'Pan — slides eye and target together.' },
          { key: 'scroll wheel', value: 'Dolly — move eye toward / away from target.' },
        ]}
      />

      <H2>Global (works on any route)</H2>
      <KvTable
        headers={['shortcut', 'action']}
        rows={[
          { key: <Combo><Key>?</Key></Combo>, value: 'Open this shortcuts reference.' },
          { key: <Combo><Key>g</Key> <Key>l</Key></Combo>, value: 'Go to /library.' },
          { key: <Combo><Key>g</Key> <Key>d</Key></Combo>, value: 'Go to /design.' },
          { key: <Combo><Key>g</Key> <Key>h</Key></Combo>, value: 'Go to /docs (this site).' },
        ]}
      />
    </>
  ),
};

export default page;
