// Left nav for /docs — sticky search at top, collapsible groups below,
// active page bolded with a gold left bar. Owns no state beyond the
// per-group collapse map; selected page lives in the URL hash.

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { DOC, TYPE } from './theme';
import { GROUPS, ALL_PAGES } from './pages/registry';
import type { DocGroup, DocPage } from './pages/registry';

export type SidebarProps = {
  activeId: string;
  onNavigate: (id: string) => void;
};

export const Sidebar = ({ activeId, onNavigate }: SidebarProps) => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  // Live filter. Match on page title and group label. Empty query → no
  // filtering; results render the normal grouped tree.
  const filtered = useMemo<DocPage[] | null>(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return null;
    return ALL_PAGES.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.groupLabel.toLowerCase().includes(q) ||
      (p.lede ?? '').toLowerCase().includes(q),
    );
  }, [query]);

  const wrap: CSSProperties = {
    position: 'sticky',
    top: 0,
    height: '100vh',
    width: 264,
    flex: '0 0 264px',
    background: DOC.surface,
    borderRight: `1px solid ${DOC.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const header: CSSProperties = {
    padding: '20px 18px 14px',
    borderBottom: `1px solid ${DOC.border}`,
    flex: '0 0 auto',
  };

  const brand: CSSProperties = {
    font: `700 18px ${TYPE.display}`,
    color: DOC.textPrimary,
    letterSpacing: TYPE.trackTight,
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
    cursor: 'pointer',
  };

  const tagline: CSSProperties = {
    font: `400 11px ${TYPE.bodyMono}`,
    color: DOC.textFaint,
    letterSpacing: TYPE.trackEyebrow,
    textTransform: 'uppercase',
  };

  const searchWrap: CSSProperties = {
    padding: '12px 14px',
    borderBottom: `1px solid ${DOC.border}`,
  };
  const searchInput: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    background: DOC.surfaceRaised,
    border: `1px solid ${DOC.border}`,
    borderRadius: 6,
    font: `500 13px ${TYPE.body}`,
    color: DOC.textPrimary,
    letterSpacing: '-0.005em',
    outline: 'none',
  };

  const list: CSSProperties = {
    flex: '1 1 auto',
    overflowY: 'auto',
    padding: '14px 6px 32px 6px',
  };

  return (
    <nav style={wrap} aria-label="Documentation">
      <div style={header}>
        <div
          style={brand}
          onClick={() => navigate('/')}
          title="Shaddy home"
        >
          <span>Shaddy</span>
          <span style={{ color: DOC.accent, fontWeight: 700 }}>·</span>
          <span style={{ color: DOC.textSecondary, fontWeight: 500, fontSize: 14 }}>docs</span>
        </div>
        <div style={tagline}>composer · renderer · cards</div>
      </div>
      <div style={searchWrap}>
        <input
          type="text"
          placeholder="Search docs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInput}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div style={list}>
        {filtered ? (
          <SearchResults
            results={filtered}
            activeId={activeId}
            onPick={onNavigate}
          />
        ) : (
          GROUPS.map((g) => (
            <Group
              key={g.id}
              group={g}
              activeId={activeId}
              collapsed={!!collapsed[g.id]}
              onToggle={() =>
                setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))
              }
              onPick={onNavigate}
            />
          ))
        )}
      </div>
    </nav>
  );
};

// ─── group block ───────────────────────────────────────────────────────

const Group = ({
  group,
  activeId,
  collapsed,
  onToggle,
  onPick,
}: {
  group: DocGroup;
  activeId: string;
  collapsed: boolean;
  onToggle: () => void;
  onPick: (id: string) => void;
}) => {
  const head: CSSProperties = {
    padding: '10px 14px 6px 14px',
    font: `600 10.5px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    textTransform: 'uppercase',
    color: DOC.textFaint,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    userSelect: 'none',
  };
  return (
    <section style={{ marginBottom: 4 }}>
      <header style={head} onClick={onToggle}>
        <span>{group.label}</span>
        <span style={{ color: DOC.textFaint, fontSize: 9 }}>
          {collapsed ? '+' : '−'}
        </span>
      </header>
      {!collapsed && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '2px 0 6px 0',
          }}
        >
          {group.pages.map((p) => (
            <NavItem
              key={p.id}
              page={p}
              active={p.id === activeId}
              onPick={() => onPick(p.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

const NavItem = ({
  page,
  active,
  onPick,
}: {
  page: DocPage;
  active: boolean;
  onPick: () => void;
}) => {
  const link: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    minHeight: 36,
    padding: '8px 14px 8px 18px',
    margin: '0 6px',
    borderRadius: 6,
    color: active ? DOC.textPrimary : DOC.textBody,
    background: active ? DOC.accentSoft : 'transparent',
    font: `${active ? 600 : 500} 13.5px ${TYPE.body}`,
    letterSpacing: '-0.005em',
    cursor: 'pointer',
    position: 'relative',
    textDecoration: 'none',
    borderLeft: `3px solid ${active ? DOC.accent : 'transparent'}`,
    transition: 'background 120ms ease, color 120ms ease',
  };
  return (
    <li>
      <a
        href={`#${page.id}`}
        onClick={(e) => {
          e.preventDefault();
          onPick();
        }}
        style={link}
        className="doc-nav-item"
      >
        {page.title}
      </a>
    </li>
  );
};

// ─── search results list ───────────────────────────────────────────────

const SearchResults = ({
  results,
  activeId,
  onPick,
}: {
  results: DocPage[];
  activeId: string;
  onPick: (id: string) => void;
}) => {
  if (results.length === 0) {
    return (
      <div
        style={{
          padding: '14px 18px',
          font: `400 13px ${TYPE.body}`,
          color: DOC.textFaint,
        }}
      >
        No matches.
      </div>
    );
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
      {results.map((p) => (
        <li key={p.id}>
          <a
            href={`#${p.id}`}
            onClick={(e) => {
              e.preventDefault();
              onPick(p.id);
            }}
            style={{
              display: 'block',
              padding: '8px 18px',
              borderLeft: `3px solid ${p.id === activeId ? DOC.accent : 'transparent'}`,
              color: DOC.textBody,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                font: `600 13.5px ${TYPE.body}`,
                color: DOC.textPrimary,
                marginBottom: 2,
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                font: `400 11px ${TYPE.bodyMono}`,
                color: DOC.textFaint,
                letterSpacing: TYPE.trackEyebrow,
                textTransform: 'uppercase',
              }}
            >
              {p.groupLabel}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
};
