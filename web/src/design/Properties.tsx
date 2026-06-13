// Properties panel — the right column below the preview.
//
// Wired to the real Recipe: when a TypedCard is selected, this renders that
// card's real params (min..max float ranges + color swatches) and pushes
// changes through useCardsStore.updateParamValue. When nothing is selected,
// shows the global panel (canvas aspect, export, share).

import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RgbColorPicker } from 'react-colorful';

// Right-bar motion + hover polish — injected once. Subtle, cinematic, and
// reduced-motion-aware (keeps the austere Gaea-ish restraint).
if (typeof document !== 'undefined' && !document.getElementById('rbx-style')) {
  const s = document.createElement('style');
  s.id = 'rbx-style';
  s.textContent = `
    .rbx-head { transition: background 130ms ease; }
    .rbx-head:hover { background: #2c2b27; }
    .rbx-body { display: grid; transition: grid-template-rows 210ms cubic-bezier(0.4,0,0.2,1); }
    .rbx-ibtn { transition: background 130ms ease, color 130ms ease, opacity 130ms ease; opacity: 0.62; }
    .rbx-ibtn:hover { background: #322f2a; opacity: 1; }
    .rbx-item { transition: background 110ms ease; }
    .rbx-item:hover { background: #2a2925; }
    .rbx-field { transition: border-color 130ms ease, background 130ms ease; }
    .rbx-field:hover { border-color: #4c4a44; background: #1a1916; }
    .rbx-pop { animation: rbxPop 170ms cubic-bezier(0.16,1,0.3,1); transform-origin: top right; }
    @keyframes rbxPop { from { opacity: 0; transform: translateY(-7px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (prefers-reduced-motion: reduce) {
      .rbx-body { transition: none; } .rbx-pop { animation: none; }
    }
  `;
  document.head.appendChild(s);
}

// The right bar / preview share the warm "instrument" panel ladder defined once
// in tokens (PANEL). Aliased as DK here so the existing DK.* call-sites are
// untouched and the whole dark chrome (top bar too) stays a single source.
export const DK = PANEL;

// Lighter category accents that read on the dark panel.
const DK_CAT: Record<string, string> = {
  [SHADE.catShape]: '#5B9ED2',
  [SHADE.catDistort]: '#D0688A',
  [SHADE.catColor]: '#AFC23E',
  [SHADE.catEffect]: '#9A7DE0',
};
const dkCat = (c: string): string => DK_CAT[c] ?? c;

import {
  ANIM_BLOCKS,
  BLEND_MODES,
  lookupCardDef,
  useCardsStore,
  resolveExportSize,
  type Animation,
  type AnimBlock,
  type BlendMode,
  type Card,
  type CardAttribute,
  type CardDef,
  type ColorRgb,
  type MediaSourceRef,
  type ShaderTemplate,
  type TypedCard,
  defaultFloatAnimation,
  defaultColorAnimation,
  reKeyAnimation,
} from '@/cards';

import { CATEGORIES, PANEL, SHADE, TYPE } from './tokens';
import type { CategoryKey } from './tokens';
import { Icon } from './icons';
import { MacroIcon } from './macro-icons';
import { PropSectionHeader, PropertySlider } from './components';
import { categoryToBlock, normalizedToParam, paramToNormalized } from './card-adapter';

export type RightTab = 'block' | 'canvas';

export type PropertiesPanelProps = {
  /** The currently-selected card, or null. */
  selectedCard: Card | null;
  /** Index of the selected card in recipe.cards (used for display only). */
  selectedIndex: number;
  /** All selected cards (desktop multi-select). When >1, a batch panel shows. */
  selectedCards?: Card[];
  /** A selected ANIMATION block (when the lone selection is one), edited in the
   *  same inspector as composer blocks. */
  selectedAnim?: { chainId: string; block: AnimBlock } | null;
  /** Controlled active tab. If omitted, the panel manages its own tab state. */
  tab?: RightTab;
  onTabChange?: (t: RightTab) => void;
  /** Live renderer FPS, polled by DesktopApp; shown in the Canvas tab footer. */
  fps?: number;
};

// The right bar is two explicit tabs (nothing leaves the bar): the Block
// inspector for the selected card, and the Canvas tab for global recipe
// settings (2D/3D, output, tempo, share).
export const PropertiesPanel = ({ selectedCard, selectedIndex, selectedCards, selectedAnim, tab: tabProp, onTabChange, fps = 0 }: PropertiesPanelProps) => {
  const [tabLocal, setTabLocal] = useState<RightTab>('block');
  const tab = tabProp ?? tabLocal;
  const setTab = onTabChange ?? setTabLocal;
  const multi = (selectedCards?.length ?? 0) > 1;
  return (
    <div
      style={{
        flex: '1 1 auto',
        background: DK.panel,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: 0,
      }}
    >
      <PropTabs tab={tab} onTabChange={setTab} />
      <div style={{ flex: '1 1 auto', overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'block'
          ? (multi
              ? <MultiSelectProps cards={selectedCards!} />
              : selectedCard ? <SelectedCardProps card={selectedCard} index={selectedIndex} />
              : selectedAnim ? <AnimBlockProps chainId={selectedAnim.chainId} block={selectedAnim.block} />
              : <BlockEmptyState />)
          : <CanvasProps fps={fps} />}
      </div>
    </div>
  );
};

const PropTabs = ({ tab, onTabChange }: { tab: RightTab; onTabChange: (t: RightTab) => void }) => (
  <div style={{ padding: '10px 12px', borderBottom: `1px solid ${DK.divider}`, background: DK.panel }}>
    <div style={{ display: 'flex', background: DK.well, borderRadius: 6, padding: 3, border: `1px solid ${DK.border}`, gap: 3 }}>
      {(['block', 'canvas'] as const).map((t) => {
        const active = t === tab;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            style={{
              flex: 1, padding: '6px 8px', borderRadius: 4, border: 'none',
              background: active ? DK.gold : 'transparent',
              color: active ? '#1a1208' : DK.mid,
              font: `700 10.5px ${TYPE.body}`, letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background 130ms ease, color 130ms ease',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  </div>
);

const BlockEmptyState = () => (
  <div style={{ padding: '34px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, textAlign: 'center' }}>
    <div style={{ width: 44, height: 44, borderRadius: 11, background: DK.well, border: `1px solid ${DK.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="composer-blocks" size={22} color={DK.faint} />
    </div>
    <div style={{ font: `500 12.5px ${TYPE.body}`, color: DK.mid, lineHeight: 1.5, maxWidth: 210 }}>
      Select a block in the canvas to edit its parameters.
    </div>
    <div style={{ font: `600 10px ${TYPE.bodyMono}`, color: DK.faint, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
      double-click a block to focus here
    </div>
  </div>
);

const CanvasProps = ({ fps = 0 }: { fps?: number }) => (
  <>
    <ModePill />
    <GlobalProps fps={fps} />
  </>
);

// ─── Recipe mode pill (2D / 3D toggle) ────────────────────────────────
// Lives at the very top of the right column so it's visible regardless of
// whether a card is selected. Clicking toggles between '2d' and '3d' — the
// compiler dispatches on Recipe.mode and emits a different shader template.

const ModePill = () => {
  const mode: ShaderTemplate = useCardsStore((s) => s.recipe.mode ?? '2d');
  const setMode = useCardsStore((s) => s.setMode);
  const next: ShaderTemplate = mode === '3d' ? '2d' : '3d';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: `1px solid ${DK.border}`,
        background: DK.well,
      }}
    >
      <span
        style={{
          font: `700 9.5px ${TYPE.bodyMono}`,
          color: DK.faint,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}
      >
        Mode
      </span>
      <button
        type="button"
        onClick={() => setMode(next)}
        title={`Switch to ${next.toUpperCase()} pipeline`}
        style={{
          padding: '4px 12px',
          background: mode === '3d' ? SHADE.gold : DK.hover,
          border: `1.5px solid ${mode === '3d' ? SHADE.goldDeep : DK.border}`,
          borderRadius: 3,
          color: mode === '3d' ? '#1a1208' : DK.text,
          font: `700 11px ${TYPE.bodyMono}`,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {mode}
      </button>
      <span
        style={{
          marginLeft: 'auto',
          font: `500 10px ${TYPE.body}`,
          color: DK.mid, fontStyle: 'italic',
        }}
      >
        {mode === '3d' ? 'raymarched SDF' : 'fragment'}
      </span>
    </div>
  );
};

// ─── Dense-panel primitives (UE5-style collapsible sections) ───────────

const Tri = ({ open, color = DK.faint }: { open: boolean; color?: string }) => (
  <span
    style={{
      width: 0, height: 0, flex: '0 0 auto',
      borderLeft: `4px solid ${color}`,
      borderTop: '3.5px solid transparent', borderBottom: '3.5px solid transparent',
      transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s ease',
      marginRight: 3,
    }}
  />
);

const Collapsible = ({
  title, right, defaultOpen = true, children,
}: { title: string; right?: ReactNode; defaultOpen?: boolean; children: ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${DK.divider}` }}>
      <div
        className="rbx-head"
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 13px', cursor: 'pointer', background: DK.raised, userSelect: 'none' }}
      >
        <Tri open={open} />
        <span style={{ flex: 1, font: `700 10px ${TYPE.bodyMono}`, color: DK.dim, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{title}</span>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
      </div>
      <div className="rbx-body" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div style={{ padding: '11px 15px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

// Proper duplicate (copy) + trash glyphs, drawn inline so they're crisp at
// this size and match the dark panel — no tinted boxes, just bare marks.
const DupGlyph = ({ color = '#cfc7b8' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="8" width="11" height="11" rx="2.2" />
    <path d="M5 15 V6 a2 2 0 0 1 2 -2 h9" />
  </svg>
);
const TrashGlyph = ({ color = '#cfc7b8' }: { color?: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13" />
  </svg>
);
const EyeGlyph = ({ color = '#cfc7b8' }: { color?: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffGlyph = ({ color = '#8a8276' }: { color?: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l16 16 M9.5 5.3A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3 3.6 M6 7.4A16 16 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 3.6-.7 M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
const BareIcon = ({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    className="rbx-ibtn"
    onClick={onClick}
    title={title}
    style={{
      width: 29, height: 27, borderRadius: 6, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', border: 'none', cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

// ─── Attributes — scoped modifier cards attached to a block ─────────────
// v1 wires uv-transform distortions (compile.ts UV_TRANSFORM_ATTR_TYPES). The
// picker is curated to those so every attribute you can add actually applies.

const ATTR_DISTORTION_TYPES = [
  'translate', 'scale_uv', 'mirror_x', 'mirror_y', 'skew',
  'swirl', 'twirl', 'fisheye', 'polar_warp', 'wave_warp',
  'noise_warp', 'zoom_blur_uv', 'mirror_domain', 'mirror_repeat', 'polar_repeat',
];
const attrIconName = (type: string): string => `card-${type.replace(/_/g, '-')}`;

// A floating popover (portal'd to <body> so it escapes the panel's overflow
// and never pushes the sections below it). Anchored under the + button.
const AttributePopover = ({
  anchor, onPick, onClose,
}: { anchor: DOMRect; onPick: (type: string) => void; onClose: () => void }) => {
  const W = 234;
  const left = Math.max(8, anchor.right - W);
  const top = anchor.bottom + 7;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onMouseDown={onClose}>
      <div
        className="rbx-pop"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top, left, width: W, maxHeight: 340, overflowY: 'auto',
          background: '#262522', border: `1px solid ${DK.borderHi}`, borderRadius: 9,
          boxShadow: '0 18px 50px -10px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.35)',
          padding: 6,
        }}
      >
        <div style={{ font: `700 8.5px ${TYPE.bodyMono}`, color: DK.faint, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 7px 6px' }}>
          Distortions
        </div>
        {ATTR_DISTORTION_TYPES.map((type) => {
          const adef = lookupCardDef(type);
          if (!adef) return null;
          return (
            <button
              key={type}
              type="button"
              className="rbx-item"
              onClick={() => onPick(type)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 7px', borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              <Icon name={attrIconName(type)} size={17} color={dkCat(SHADE.catDistort)} />
              <span style={{ font: `500 12.5px ${TYPE.body}`, color: DK.text }}>{adef.friendlyName}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

const AttributeEditor = ({
  cardId, attr, onRemove,
}: { cardId: string; attr: CardAttribute; onRemove: () => void }) => {
  const updateAttributeParam = useCardsStore((s) => s.updateAttributeParam);
  const adef = lookupCardDef(attr.type);
  const [open, setOpen] = useState(true);
  if (!adef) return null;
  const floatEntries = Object.entries(adef.params).filter(([, p]) => p.kind === 'float');
  return (
    <div style={{ border: `1px solid ${DK.border}`, borderRadius: 6, background: DK.sub, overflow: 'hidden' }}>
      <div
        className="rbx-head"
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', cursor: 'pointer', userSelect: 'none' }}
      >
        <Tri open={open} />
        <Icon name={attrIconName(attr.type)} size={14} color={dkCat(SHADE.catDistort)} />
        <span style={{ flex: 1, font: `600 11.5px ${TYPE.body}`, color: DK.text }}>{adef.friendlyName}</span>
        <button
          type="button"
          className="rbx-ibtn"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove attribute"
          style={{ width: 20, height: 18, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={11} color={DK.faint} />
        </button>
      </div>
      {open && floatEntries.length > 0 && (
        <div style={{ padding: '5px 10px 9px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${DK.divider}` }}>
          {floatEntries.map(([key, p]) => {
            if (p.kind !== 'float') return null;
            const live = (attr.params[key]?.value as number) ?? (p.default as number);
            const norm = paramToNormalized(live, p);
            return (
              <FloatParamRow
                key={key}
                label={p.label}
                norm={norm}
                real={live}
                onChange={(n) => updateAttributeParam(cardId, attr.id, key, normalizedToParam(n, p))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const AttributesSection = ({ cardId, attributes }: { cardId: string; attributes: CardAttribute[] }) => {
  const addAttribute = useCardsStore((s) => s.addAttribute);
  const removeAttribute = useCardsStore((s) => s.removeAttribute);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <Collapsible
      title={`Attributes${attributes.length ? ` · ${attributes.length}` : ''}`}
      right={
        <button
          type="button"
          className="rbx-ibtn"
          title="Add attribute"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setAnchor((a) => (a ? null : rect));
          }}
          style={{
            width: 24, height: 22, borderRadius: 5, flex: '0 0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: anchor ? DK.hover : 'transparent', border: 'none',
          }}
        >
          <Icon name="plus" size={13} color={anchor ? DK.gold : '#cfc7b8'} />
        </button>
      }
    >
      {attributes.length === 0 && (
        <div style={{ font: `500 11.5px ${TYPE.body}`, color: DK.faint, lineHeight: 1.5 }}>
          None. Attach a transform, mirror, swirl… scoped to just this block.
        </div>
      )}
      {attributes.map((a) => (
        <AttributeEditor key={a.id} cardId={cardId} attr={a} onRemove={() => removeAttribute(cardId, a.id)} />
      ))}
      {anchor && (
        <AttributePopover
          anchor={anchor}
          onPick={(type) => { addAttribute(cardId, type); setAnchor(null); }}
          onClose={() => setAnchor(null)}
        />
      )}
    </Collapsible>
  );
};

// ─── Selected card props ───────────────────────────────────────────────

const SelectedCardProps = ({ card, index }: { card: Card; index: number }) => {
  if (card.kind === 'wildcard') {
    return <WildcardProps card={card} index={index} />;
  }
  if (card.kind === 'typed' && card.type === 'macro') {
    return <MacroProps card={card} index={index} />;
  }
  const def = lookupCardDef(card.type);
  if (!def) {
    return (
      <>
        <PropSectionHeader title="Unknown card" />
        <div style={{ padding: '0 14px 14px', color: DK.mid, font: `400 12px ${TYPE.body}` }}>
          Card type <code>{card.type}</code> not in library.
        </div>
      </>
    );
  }
  return <TypedCardProps card={card} def={def} index={index} />;
};

// ─── Macro ("function" block) inspector — rename, compress, sub-blocks, ungroup ──
const MacroProps = ({ card, index }: { card: Extract<Card, { kind: 'typed' }>; index: number }) => {
  const updateMacro = useCardsStore((s) => s.updateMacro);
  const ungroupMacro = useCardsStore((s) => s.ungroupMacro);
  const duplicateCard = useCardsStore((s) => s.duplicateCard);
  const removeCard = useCardsStore((s) => s.removeCard);
  const [confirmDel, setConfirmDel] = useState(false);
  const macro = card.macro;
  if (!macro) return null;
  const compress = !!macro.compress;
  const labelStyle = { width: 80, flex: '0 0 auto', font: `600 10px ${TYPE.bodyMono}`, color: DK.mid, letterSpacing: '0.12em', textTransform: 'uppercase' } as const;
  return (
    <>
      <div style={{ padding: '12px 13px', borderBottom: `1px solid ${DK.divider}`, display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 22, height: 22, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}><MacroIcon name={macro.icon} size={20} color={SHADE.macro} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `600 15.5px ${TYPE.body}`, color: DK.text, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{macro.name || 'Macro'}</div>
          <div style={{ font: `500 9px ${TYPE.bodyMono}`, marginTop: 3, color: DK.faint, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Macro · {String(index + 1).padStart(2, '0')} · {macro.blocks.length} blocks</div>
        </div>
        <div style={{ display: 'flex', gap: 1 }}>
          <BareIcon title="Duplicate macro" onClick={() => duplicateCard(card.id)}><DupGlyph /></BareIcon>
          <button
            type="button"
            className={confirmDel ? undefined : 'rbx-ibtn'}
            title={confirmDel ? 'Click again to delete' : 'Delete macro'}
            onClick={() => { if (confirmDel) { removeCard(card.id); setConfirmDel(false); } else { setConfirmDel(true); window.setTimeout(() => setConfirmDel(false), 2600); } }}
            style={{ width: 24, height: 22, borderRadius: 5, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: confirmDel ? '#5a2424' : 'transparent' }}
          >
            <TrashGlyph color={confirmDel ? '#f0a0a0' : DK.danger} />
          </button>
        </div>
      </div>
      <Collapsible title="Macro">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 18 }}>
          <span style={labelStyle}>name</span>
          {/* Read-only here: the macro registry (palette → Macros ▸ ✎) is the
              source of truth for a macro's name. Editing it on the placed block
              would desync this instance from the saved definition. */}
          <span
            title="Rename in the palette — Macros ▸ ✎ (source of truth)"
            style={{ flex: 1, minWidth: 0, padding: '5px 9px', border: `1px solid ${DK.border}`, borderRadius: 5, background: DK.well, color: DK.mid, font: `500 12px ${TYPE.body}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >{macro.name || 'Macro'}</span>
        </div>
        <div style={{ font: `500 9.5px ${TYPE.body}`, color: DK.faint, marginTop: -2 }}>Rename in the palette (Macros ▸ ✎).</div>
        <button
          type="button"
          title="Emit minimal byte-identical GLSL for this macro"
          onClick={() => updateMacro(card.id, { compress: !compress })}
          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', minHeight: 20, textAlign: 'left' }}
        >
          <span style={labelStyle}>compress</span>
          <span style={{ width: 34, height: 18, borderRadius: 9, flex: '0 0 auto', background: compress ? SHADE.macro : DK.well, border: `1px solid ${compress ? SHADE.macro : DK.border}`, position: 'relative', transition: 'background 140ms' }}>
            <span style={{ position: 'absolute', top: 2, left: compress ? 18 : 2, width: 12, height: 12, borderRadius: '50%', background: compress ? '#fff' : DK.mid, transition: 'left 140ms' }} />
          </span>
          <span style={{ font: `500 11px ${TYPE.body}`, color: DK.faint }}>byte-identical GLSL</span>
        </button>
        <div>
          <div style={{ font: `600 9px ${TYPE.bodyMono}`, color: DK.faint, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>contains</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {macro.blocks.map((b, i) => {
              const bdef = lookupCardDef(b.type);
              return (
                <div key={`${b.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, font: `500 11.5px ${TYPE.body}`, color: DK.text }}>
                  <span style={{ font: `600 9px ${TYPE.bodyMono}`, color: DK.faint, width: 14, flex: '0 0 auto' }}>{String(i + 1).padStart(2, '0')}</span>
                  {bdef?.friendlyName ?? b.type}
                </div>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          title="Expand this macro back into its blocks"
          onClick={() => ungroupMacro(card.id)}
          style={{ alignSelf: 'flex-start', padding: '5px 11px', borderRadius: 5, border: `1px solid ${DK.border}`, background: 'transparent', color: DK.mid, font: `600 10px ${TYPE.bodyMono}`, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Ungroup
        </button>
      </Collapsible>
    </>
  );
};

const CardHeader = ({
  cat, title, blockIdx, cardId,
}: {
  cat: CategoryKey;
  title: string;
  blockIdx: number;
  cardId: string;
}) => {
  const catInfo = CATEGORIES[cat];
  const duplicateCard = useCardsStore((s) => s.duplicateCard);
  const removeCard = useCardsStore((s) => s.removeCard);
  const toggleCardEnabled = useCardsStore((s) => s.toggleCardEnabled);
  const enabled = useCardsStore((s) => {
    const all = [...s.recipe.cards, ...(s.recipe.passes ?? []).flatMap((p) => p.cards)];
    return all.find((c) => c.id === cardId)?.enabled !== false;
  });
  const [confirmDel, setConfirmDel] = useState(false);
  const onDelete = () => {
    if (confirmDel) { removeCard(cardId); setConfirmDel(false); }
    else { setConfirmDel(true); window.setTimeout(() => setConfirmDel(false), 2600); }
  };
  return (
    <div
      style={{
        padding: '12px 13px',
        borderBottom: `1px solid ${DK.divider}`,
        display: 'flex', alignItems: 'center', gap: 9,
      }}
    >
      <div style={{ width: 22, height: 22, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={catInfo.icon} size={20} color={dkCat(catInfo.color)} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `600 15.5px ${TYPE.body}`, color: DK.text, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        <div
          style={{
            font: `500 9px ${TYPE.bodyMono}`, marginTop: 3,
            color: DK.faint, letterSpacing: '0.16em', textTransform: 'uppercase',
          }}
        >
          {catInfo.label.replace(/s$/, '')} · {String(blockIdx + 1).padStart(2, '0')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>
        <BareIcon title={enabled ? 'Mute block (keeps it in the chain, emits no GLSL)' : 'Unmute block'} onClick={() => toggleCardEnabled(cardId)}>
          {enabled ? <EyeGlyph /> : <EyeOffGlyph />}
        </BareIcon>
        <BareIcon title="Duplicate block" onClick={() => duplicateCard(cardId)}><DupGlyph /></BareIcon>
        <button
          type="button"
          className={confirmDel ? undefined : 'rbx-ibtn'}
          onClick={onDelete}
          title={confirmDel ? 'Click again to delete' : 'Delete block'}
          style={{
            width: 24, height: 22, borderRadius: 5, flex: '0 0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'background 130ms ease', border: 'none',
            background: confirmDel ? '#5a2424' : 'transparent',
          }}
        >
          <TrashGlyph color={confirmDel ? '#f0a0a0' : DK.danger} />
        </button>
      </div>
    </div>
  );
};

// ─── Composition controls (blend mode + opacity) ──────────────────────

const BLEND_LABELS: Record<BlendMode, string> = {
  normal: 'Normal', add: 'Add', multiply: 'Multiply',
  screen: 'Screen', lighten: 'Lighten', darken: 'Darken',
};

const CompositionBody = ({ card }: { card: Card }) => {
  const setAlpha = useCardsStore((s) => s.setAlpha);
  const setBlendMode = useCardsStore((s) => s.setBlendMode);
  const alpha = card.alpha ?? 1;
  const blend: BlendMode = card.blendMode ?? 'normal';
  return (
    <>
      <div>
        <div
          style={{
            font: `700 10px ${TYPE.bodyMono}`,
            color: DK.faint, letterSpacing: '0.16em',
            textTransform: 'uppercase', marginBottom: 6,
          }}
        >
          Blend
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {BLEND_MODES.map((mode) => {
            const active = mode === blend;
            return (
              <button
                key={mode}
                onClick={() => setBlendMode(card.id, mode)}
                style={{
                  padding: '6px 4px',
                  borderRadius: 4,
                  background: active ? DK.gold : DK.well,
                  color: active ? '#1a1208' : DK.mid,
                  border: `1px solid ${active ? DK.gold : DK.border}`,
                  font: `600 10px ${TYPE.bodyMono}`,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                {BLEND_LABELS[mode]}
              </button>
            );
          })}
        </div>
      </div>
      <FloatParamRow label="opacity" norm={alpha} real={alpha} onChange={(n) => setAlpha(card.id, n)} />
    </>
  );
};

const TypedCardProps = ({
  card, def, index,
}: { card: TypedCard; def: CardDef; index: number }) => {
  const updateParamValue = useCardsStore((s) => s.updateParamValue);
  const cat = categoryToBlock(def.category);
  const entries = Object.entries(def.params);

  return (
    <>
      <CardHeader cat={cat} title={def.friendlyName} blockIdx={index} cardId={card.id} />
      {entries.length > 0 && (
        <Collapsible title="Parameters">
          {entries.map(([key, p]) => {
            const live = card.params[key]?.value ?? p.default;
            if (p.kind === 'float') {
              const norm = paramToNormalized(live as number, p);
              return (
                <AnimatableParam
                  key={key}
                  cardId={card.id}
                  paramKey={key}
                  kind="float"
                  value={live as number}
                  range={{ lo: p.min, hi: p.max }}
                  anim={card.params[key]?.animation ?? null}
                >
                  <FloatParamRow
                    label={p.label}
                    norm={norm}
                    real={live as number}
                    onChange={(n) => updateParamValue(card.id, key, normalizedToParam(n, p))}
                  />
                </AnimatableParam>
              );
            }
            if (p.kind === 'select') {
              return (
                <SelectParamRow
                  key={key}
                  label={p.label}
                  value={live as number}
                  options={p.options}
                  onChange={(n) => updateParamValue(card.id, key, n)}
                />
              );
            }
            if (p.kind === 'image') {
              return (
                <ImageParamRow
                  key={key}
                  label={p.label}
                  cardId={card.id}
                  paramKey={key}
                  liveValue={(card.params[key]?.value as string | undefined) ?? ''}
                />
              );
            }
            if (p.kind === 'video') {
              return (
                <VideoParamRow
                  key={key}
                  label={p.label}
                  cardId={card.id}
                  paramKey={key}
                  liveValue={(card.params[key]?.value as string | undefined) ?? ''}
                />
              );
            }
            if (p.kind === 'text') {
              return (
                <TextParamRow
                  key={key}
                  label={p.label}
                  value={String(card.params[key]?.value ?? p.default ?? '')}
                  onChange={(v) => updateParamValue(card.id, key, v)}
                />
              );
            }
            return (
              <AnimatableParam
                key={key}
                cardId={card.id}
                paramKey={key}
                kind="color"
                value={live as ColorRgb}
                range={{ lo: 0, hi: 1 }}
                anim={card.params[key]?.animation ?? null}
              >
                <ColorParamRow
                  label={p.label}
                  value={live as ColorRgb}
                  onChange={(c) => updateParamValue(card.id, key, c)}
                />
              </AnimatableParam>
            );
          })}
        </Collapsible>
      )}
      <AttributesSection cardId={card.id} attributes={card.attributes ?? []} />
      <Collapsible title="Composition" defaultOpen={false}>
        <CompositionBody card={card} />
      </Collapsible>
    </>
  );
};

// ─── Float param — compact inline row (label · slider · real value) ─────

const fmtNum = (n: number): string => {
  if (!isFinite(n)) return '—';
  if (Number.isInteger(n)) return String(n);
  const a = Math.abs(n);
  if (a >= 100) return n.toFixed(0);
  if (a >= 10) return n.toFixed(1);
  return n.toFixed(2);
};

// Dark slider rail — gold fill, round glowing handle. Scoped to the dark panel
// (the shared SliderRail stays warm for the block cards).
const DarkRail = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => {
  const v = Math.max(0, Math.min(1, value));
  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };
  return (
    <div
      onPointerDown={onPointer}
      onPointerMove={(e) => (e.buttons & 1 ? onPointer(e) : undefined)}
      style={{ position: 'relative', height: 22, cursor: 'pointer', userSelect: 'none' }}
    >
      {/* recessed track */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 6, borderRadius: 2, background: DK.well, border: `1px solid ${DK.border}`, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.55)' }} />
      {/* tick notches — retro precision */}
      {[0.25, 0.5, 0.75].map((p) => (
        <div key={p} style={{ position: 'absolute', top: 6, left: `${p * 100}%`, width: 1, height: 10, background: '#3a3833' }} />
      ))}
      {/* gold fill — flat, no glow */}
      <div style={{ position: 'absolute', left: 1.5, top: 9.5, height: 3, width: `max(0px, calc(${v * 100}% - 3px))`, borderRadius: 2, background: `linear-gradient(90deg, ${DK.goldDeep}, ${DK.gold})` }} />
      {/* hardware fader cap */}
      <div style={{ position: 'absolute', left: `calc(${v * 100}% - 8px)`, top: 3, width: 16, height: 16, borderRadius: 3.5, background: 'linear-gradient(180deg, #34322d, #1f1e1b)', border: `1px solid ${DK.gold}`, boxShadow: '0 1px 3px rgba(0,0,0,0.55)' }} />
    </div>
  );
};

const FloatParamRow = ({
  label, norm, real, onChange,
}: { label: string; norm: number; real: number; onChange: (n: number) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 22 }}>
    <span
      style={{
        width: 86, flex: '0 0 auto',
        font: `600 10px ${TYPE.bodyMono}`, color: DK.mid,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {label}
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <DarkRail value={norm} onChange={onChange} />
    </div>
    <span
      style={{
        width: 48, flex: '0 0 auto', textAlign: 'right',
        font: `600 12px ${TYPE.bodyMono}`, color: DK.value,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {fmtNum(real)}
    </span>
  </div>
);

// ─── Per-param animation UI ────────────────────────────────────────────
// A small ～ toggle next to each animatable float/colour param, plus a compact
// editor (waveform kind + endpoint sliders) shown when the param is animated.

const WaveGlyph = ({ active }: { active: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? SHADE.gold : DK.mid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12q3-6 6 0t6 0 6 0" />
  </svg>
);

/** A slider over an arbitrary [lo,hi] range, reusing FloatParamRow's look. */
const RangedSlider = ({ label, value, lo, hi, onChange }: { label: string; value: number; lo: number; hi: number; onChange: (v: number) => void }) => {
  const norm = hi > lo ? Math.max(0, Math.min(1, (value - lo) / (hi - lo))) : 0;
  return <FloatParamRow label={label} norm={norm} real={value} onChange={(n) => onChange(lo + n * (hi - lo))} />;
};

/** Inspector for a selected ANIMATION block — reuses the same param rows as
 *  composer blocks. Edits bake into the chain's GLSL via updateAnimBlockParam. */
const AnimBlockProps = ({ chainId, block }: { chainId: string; block: AnimBlock }) => {
  const updateAnimBlockParam = useCardsStore((s) => s.updateAnimBlockParam);
  const removeAnimBlock = useCardsStore((s) => s.removeAnimBlock);
  const def = ANIM_BLOCKS[block.type];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px 10px' }}>
        <span style={{ width: 26, height: 26, borderRadius: 5, background: `${SHADE.anim}1c`, border: `1px solid ${SHADE.anim}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name={def?.icon ?? 'anim-osc'} size={15} color={SHADE.anim} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `700 13px ${TYPE.body}`, color: DK.text }}>{def?.label ?? block.type}</div>
          <div style={{ font: `600 9px ${TYPE.bodyMono}`, color: SHADE.anim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Animation block</div>
        </div>
        <button type="button" title="Remove block" onClick={() => removeAnimBlock(chainId, block.id)}
          style={{ width: 22, height: 22, border: 'none', borderRadius: 5, background: 'transparent', color: DK.mid, cursor: 'pointer', font: `400 17px ${TYPE.body}`, lineHeight: 0 }}>×</button>
      </div>
      <div style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {def ? Object.entries(def.params).map(([k, pd]) => {
          const raw = block.params[k]?.value;
          const value = typeof raw === 'number' ? raw : (pd as { default: number }).default;
          if (pd.kind === 'float') {
            return <RangedSlider key={k} label={pd.label} value={value} lo={pd.min} hi={pd.max} onChange={(v) => updateAnimBlockParam(chainId, block.id, k, v)} />;
          }
          if (pd.kind === 'select') {
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 54, flex: '0 0 auto', font: `600 11px ${TYPE.body}`, color: DK.mid }}>{pd.label}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {pd.options.map((o) => (
                    <button key={o.value} type="button" onClick={() => updateAnimBlockParam(chainId, block.id, k, o.value)}
                      style={{ padding: '3px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${value === o.value ? SHADE.anim : DK.border}`, background: value === o.value ? `${SHADE.anim}22` : 'transparent', color: value === o.value ? DK.text : DK.mid, font: `600 10px ${TYPE.body}` }}>{o.label}</button>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        }) : <div style={{ font: `400 12px ${TYPE.body}`, color: DK.mid }}>Unknown animation block.</div>}
      </div>
    </div>
  );
};

const KindPills = ({ value, options, onPick }: { value: string; options: ReadonlyArray<{ k: string; label: string }>; onPick: (k: string) => void }) => (
  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
    {options.map((o) => {
      const active = o.k === value;
      return (
        <button key={o.k} type="button" onClick={() => onPick(o.k)}
          style={{ padding: '3px 9px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${active ? SHADE.gold : DK.border}`, background: active ? `${SHADE.gold}22` : 'transparent', color: active ? DK.text : DK.mid, font: `600 10px ${TYPE.body}`, letterSpacing: '0.04em' }}>
          {o.label}
        </button>
      );
    })}
  </div>
);

const FLOAT_KIND_OPTS = [
  { k: 'sine', label: 'Sine' }, { k: 'pulse', label: 'Pulse' }, { k: 'noise', label: 'Noise' }, { k: 'mouse', label: 'Mouse' },
] as const;

const animEditorBox: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 7,
  padding: '9px 10px', marginTop: 2,
  background: DK.well, border: `1px solid ${SHADE.gold}44`, borderRadius: 6,
};

const FloatAnimEditor = ({ anim, lo, hi, value, onChange }: { anim: Extract<Animation, { type: 'sine' | 'pulse' | 'noise' | 'mouse' }>; lo: number; hi: number; value: number; onChange: (a: Animation) => void }) => (
  <div style={animEditorBox}>
    <KindPills value={anim.type} options={FLOAT_KIND_OPTS} onPick={(k) => onChange(reKeyAnimation(anim, k as Animation['type'], value, { min: lo, max: hi }))} />
    <RangedSlider label="min" value={anim.min} lo={lo} hi={hi} onChange={(v) => onChange({ ...anim, min: v })} />
    <RangedSlider label="max" value={anim.max} lo={lo} hi={hi} onChange={(v) => onChange({ ...anim, max: v })} />
    {anim.type !== 'mouse' && (
      <RangedSlider label="speed" value={anim.speed} lo={0} hi={8} onChange={(v) => onChange({ ...anim, speed: v })} />
    )}
    {anim.type === 'sine' && (
      <RangedSlider label="phase" value={anim.phase} lo={0} hi={6.2832} onChange={(v) => onChange({ ...anim, phase: v })} />
    )}
    {anim.type === 'pulse' && (
      <RangedSlider label="duty" value={anim.duty} lo={0} hi={1} onChange={(v) => onChange({ ...anim, duty: v })} />
    )}
    {anim.type === 'mouse' && (
      <KindPills value={anim.axis} options={[{ k: 'x', label: 'Mouse X' }, { k: 'y', label: 'Mouse Y' }]} onPick={(k) => onChange({ ...anim, axis: k as 'x' | 'y' })} />
    )}
  </div>
);

const ColorAnimEditor = ({ anim, onChange }: { anim: Extract<Animation, { type: 'color_cycle' }>; onChange: (a: Animation) => void }) => (
  <div style={animEditorBox}>
    <ColorParamRow label="from" value={anim.colorA} onChange={(c) => onChange({ ...anim, colorA: c })} />
    <ColorParamRow label="to" value={anim.colorB} onChange={(c) => onChange({ ...anim, colorB: c })} />
    <RangedSlider label="speed" value={anim.speed} lo={0} hi={4} onChange={(v) => onChange({ ...anim, speed: v })} />
  </div>
);

/** The animate (∼) dropdown — built-in waveforms, a "Custom" entry that drops a
 *  block-built animation chain on the canvas, and "Bind: ‹name›" rows to reuse
 *  an existing chain. Rendered through a portal anchored to the ∼ button so the
 *  scrolling inspector panel can't clip it. */
const AnimMenu = ({ anchor, kind, anim, chains, onBuiltin, onCustom, onBind, onStop, onClose }: {
  anchor: DOMRect;
  kind: 'float' | 'color';
  anim: Animation | null;
  chains: ReadonlyArray<{ id: string; name: string }>;
  onBuiltin: (k: string) => void;
  onCustom: () => void;
  onBind: (id: string) => void;
  onStop: () => void;
  onClose: () => void;
}) => {
  const W = 200;
  const left = Math.max(8, Math.min(anchor.right - W, window.innerWidth - W - 8));
  const top = Math.min(anchor.bottom + 5, window.innerHeight - 8);
  const item = (label: string, onClick: () => void, accent?: string) => (
    <button key={label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '6px 9px', border: 'none', background: 'transparent', cursor: 'pointer', font: `600 11px ${TYPE.body}`, color: accent ?? PANEL.text, borderRadius: 5 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = PANEL.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>{label}</button>
  );
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        style={{ position: 'fixed', top, left, width: W, maxHeight: 320, overflowY: 'auto', padding: 4, background: PANEL.panel, border: `1px solid ${PANEL.borderHi}`, borderRadius: 8, boxShadow: '0 18px 50px -10px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {anim && item('Stop animating', onStop, PANEL.faint)}
        {kind === 'float' ? (
          <>
            {FLOAT_KIND_OPTS.map((o) => item(o.label, () => onBuiltin(o.k)))}
            <div style={{ height: 1, background: PANEL.divider, margin: '3px 2px' }} />
            {item('✦ Custom — build on canvas', onCustom, SHADE.anim)}
            {chains.map((c) => item(`Bind: ${c.name}`, () => onBind(c.id), SHADE.anim))}
          </>
        ) : (
          item('Colour cycle', () => onBuiltin('color_cycle'))
        )}
      </div>
    </div>,
    document.body,
  );
};

/** Shown under a param driven by a custom chain — the chain is edited on the
 *  canvas, so the inspector just names it + offers an unbind. */
const CustomAnimIndicator = ({ name, onUnbind }: { name: string; onUnbind: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', marginTop: 2, background: `${SHADE.anim}14`, border: `1px solid ${SHADE.anim}55`, borderRadius: 6 }}>
    <WaveGlyph active />
    <div style={{ flex: 1, minWidth: 0, font: `600 11px ${TYPE.body}`, color: SHADE.anim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      driven by {name}
      <span style={{ color: PANEL.faint, fontWeight: 500 }}> · edit on canvas</span>
    </div>
    <button type="button" onClick={onUnbind} title="Unbind"
      style={{ flex: '0 0 auto', width: 18, height: 18, lineHeight: 0, border: 'none', borderRadius: 4, background: 'transparent', color: PANEL.mid, cursor: 'pointer', font: `400 15px ${TYPE.body}` }}>×</button>
  </div>
);

/** Wraps a float/colour param row with an animate menu + editor. */
const AnimatableParam = ({
  cardId, paramKey, kind, value, range, anim, children,
}: {
  cardId: string; paramKey: string; kind: 'float' | 'color';
  value: number | ColorRgb; range: { lo: number; hi: number };
  anim: Animation | null; children: React.ReactNode;
}) => {
  const setParamAnimation = useCardsStore((s) => s.setParamAnimation);
  const createCustomAnimation = useCardsStore((s) => s.createCustomAnimation);
  const bindParamToAnimation = useCardsStore((s) => s.bindParamToAnimation);
  const chains = useCardsStore((s) => s.recipe.animations);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const colorVal: ColorRgb = Array.isArray(value) ? (value as ColorRgb) : [0, 0, 0];
  const floatVal = typeof value === 'number' ? value : 0;
  const allChains = chains ?? [];
  const customName = anim?.type === 'custom'
    ? (allChains.find((c) => c.id === anim.ref)?.name ?? 'animation')
    : null;

  const close = () => setAnchor(null);
  const pickBuiltin = (k: string) => {
    const seed = kind === 'color'
      ? defaultColorAnimation(colorVal)
      : defaultFloatAnimation(floatVal, { min: range.lo, max: range.hi });
    setParamAnimation(cardId, paramKey, k === 'color_cycle'
      ? seed
      : reKeyAnimation(seed, k as Animation['type'], floatVal, { min: range.lo, max: range.hi }));
    close();
  };
  const pickCustom = () => { createCustomAnimation(cardId, paramKey); close(); };
  const pickBind = (id: string) => { bindParamToAnimation(cardId, paramKey, id); close(); };
  const stop = () => { setParamAnimation(cardId, paramKey, null); close(); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        <button ref={btnRef} type="button" className="rbx-ibtn"
          onClick={() => setAnchor((a) => (a ? null : btnRef.current?.getBoundingClientRect() ?? null))}
          title="Animate this parameter"
          style={{ flex: '0 0 auto', width: 24, height: 22, borderRadius: 5, border: 'none', background: anim ? (anim.type === 'custom' ? `${SHADE.anim}26` : `${SHADE.gold}1f`) : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WaveGlyph active={!!anim} />
        </button>
      </div>
      {anchor && (
        <AnimMenu anchor={anchor} kind={kind} anim={anim} chains={allChains}
          onBuiltin={pickBuiltin} onCustom={pickCustom} onBind={pickBind} onStop={stop} onClose={close} />
      )}
      {anim && anim.type === 'color_cycle' && (
        <ColorAnimEditor anim={anim} onChange={(a) => setParamAnimation(cardId, paramKey, a)} />
      )}
      {anim && anim.type !== 'color_cycle' && anim.type !== 'custom' && (
        <FloatAnimEditor anim={anim} lo={range.lo} hi={range.hi} value={floatVal} onChange={(a) => setParamAnimation(cardId, paramKey, a)} />
      )}
      {anim && anim.type === 'custom' && customName && (
        <CustomAnimIndicator name={customName} onUnbind={() => setParamAnimation(cardId, paramKey, null)} />
      )}
    </div>
  );
};

// ─── Select param dropdown ─────────────────────────────────────────────

const SelectMenu = ({
  anchor, options, value, onPick, onClose,
}: {
  anchor: DOMRect;
  options: ReadonlyArray<{ value: number; label: string }>;
  value: number;
  onPick: (v: number) => void;
  onClose: () => void;
}) => {
  const W = Math.max(150, anchor.width);
  const left = Math.min(anchor.left, window.innerWidth - W - 8);
  const top = anchor.bottom + 5;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onMouseDown={onClose}>
      <div
        className="rbx-pop"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top, left, minWidth: W, maxHeight: 300, overflowY: 'auto',
          background: '#262522', border: `1px solid ${DK.borderHi}`, borderRadius: 8,
          boxShadow: '0 18px 50px -10px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.35)', padding: 5,
        }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              className="rbx-item"
              onClick={() => onPick(o.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: active ? DK.gold : 'transparent', border: active ? 'none' : `1px solid ${DK.faint}` }} />
              <span style={{ font: `500 12.5px ${TYPE.body}`, color: active ? DK.text : DK.mid }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

const SelectParamRow = ({
  label, value, options, onChange,
}: {
  label: string;
  value: number;
  options: ReadonlyArray<{ value: number; label: string }>;
  onChange: (v: number) => void;
}) => {
  const current = options.find((o) => o.value === value);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 18 }}>
      <span style={{ width: 80, flex: '0 0 auto', font: `600 10px ${TYPE.bodyMono}`, color: DK.mid, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      <button
        type="button"
        className="rbx-field"
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAnchor((a) => (a ? null : r)); }}
        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '5px 9px', border: `1px solid ${anchor ? DK.borderHi : DK.border}`, borderRadius: 5, background: DK.well, cursor: 'pointer' }}
      >
        <span style={{ font: `500 12px ${TYPE.body}`, color: DK.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {current?.label ?? String(value)}
        </span>
        <span style={{ width: 0, height: 0, flex: '0 0 auto', borderTop: `4px solid ${DK.mid}`, borderLeft: '3.5px solid transparent', borderRight: '3.5px solid transparent' }} />
      </button>
      {anchor && (
        <SelectMenu
          anchor={anchor}
          options={options}
          value={value}
          onPick={(v) => { onChange(v); setAnchor(null); }}
          onClose={() => setAnchor(null)}
        />
      )}
    </div>
  );
};

// ─── Text param — a plain editable field (e.g. a named-reroute label) ───
const TextParamRow = ({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 18 }}>
    <span style={{ width: 80, flex: '0 0 auto', font: `600 10px ${TYPE.bodyMono}`, color: DK.mid, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {label}
    </span>
    <input
      className="rbx-field"
      type="text"
      value={value}
      spellCheck={false}
      placeholder="name…"
      onChange={(e) => onChange(e.target.value)}
      style={{ flex: 1, minWidth: 0, padding: '5px 9px', border: `1px solid ${DK.border}`, borderRadius: 5, background: DK.well, color: DK.text, font: `500 12px ${TYPE.body}`, outline: 'none' }}
    />
  </div>
);

const ActionButton = ({
  onClick, title, tint, children,
}: {
  onClick: () => void;
  title: string;
  tint?: 'danger';
  children: ReactNode;
}) => {
  const isDanger = tint === 'danger';
  const fg = isDanger ? '#8a2222' : DK.mid;
  const border = isDanger ? '#8a222255' : DK.border;
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 9px',
        borderRadius: 3,
        background: 'transparent',
        border: `1px solid ${border}`,
        color: fg,
        font: `600 10px ${TYPE.bodyMono}`,
        letterSpacing: '0.10em', textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
};

// ─── Image / video param rows ──────────────────────────────────────────
//
// Image: click "Choose…" → file picker → decode to <img> → push as
// sourceRef on the Parameter so RecipeCanvas's per-frame texture pusher
// uploads it. The data URL doubles as the serialised Recipe value so the
// upload survives a Recipe round-trip (e.g. share URLs once we have them).
//
// Video: click "Start camera" → getUserMedia → bind <video> sourceRef.
// Click "Stop" to release the stream. The video element is kept alive
// (off-DOM) so subsequent frames keep flowing into the renderer.

const ImageParamRow = ({
  label, cardId, paramKey, liveValue,
}: {
  label: string;
  cardId: string;
  paramKey: string;
  liveValue: string;
}) => {
  const setParamSource = useCardsStore((s) => s.setParamSource);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [thumb, setThumb] = useState<string | null>(liveValue || null);
  useEffect(() => { setThumb(liveValue || null); }, [liveValue]);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const ref: MediaSourceRef = { kind: 'image', element: img };
        setParamSource(cardId, paramKey, dataUrl, ref);
        setThumb(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          font: `600 10px ${TYPE.bodyMono}`, color: DK.mid,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{ font: `500 11px ${TYPE.bodyMono}`, color: DK.faint }}>
          {thumb ? 'loaded' : 'empty'}
        </span>
      </div>
      {thumb && (
        <img
          src={thumb}
          alt={label}
          style={{
            width: '100%', aspectRatio: '1 / 1', objectFit: 'cover',
            borderRadius: 3, border: `1px solid ${DK.border}`, marginBottom: 8,
          }}
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        style={{
          width: '100%', padding: '8px 10px',
          background: DK.well, border: `1px solid ${DK.border}`,
          color: DK.text, borderRadius: 3,
          font: `600 11px ${TYPE.body}`,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {thumb ? 'Replace image' : 'Choose image…'}
      </button>
    </div>
  );
};

const VideoParamRow = ({
  label, cardId, paramKey, liveValue,
}: {
  label: string;
  cardId: string;
  paramKey: string;
  liveValue: string;
}) => {
  const setParamSource = useCardsStore((s) => s.setParamSource);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const active = liveValue === 'webcam';

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;
      streamRef.current = stream;
      const ref: MediaSourceRef = { kind: 'video', element: video };
      setParamSource(cardId, paramKey, 'webcam', ref);
    } catch (e) {
      console.warn('[webcam] getUserMedia failed:', e);
    }
  };

  const stop = () => {
    const s = streamRef.current;
    if (s) for (const t of s.getTracks()) t.stop();
    streamRef.current = null;
    videoRef.current = null;
    setParamSource(cardId, paramKey, '', null);
  };

  // Stop the stream when the row unmounts so we don't keep the camera LED on
  // after the user navigates away from this card.
  useEffect(() => () => {
    const s = streamRef.current;
    if (s) for (const t of s.getTracks()) t.stop();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          font: `600 10px ${TYPE.bodyMono}`, color: DK.mid,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          font: `500 11px ${TYPE.bodyMono}`,
          color: active ? SHADE.gold : DK.faint,
        }}>
          {active ? 'live' : 'stopped'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => (active ? stop() : void start())}
        style={{
          width: '100%', padding: '8px 10px',
          background: active ? SHADE.gold : DK.well,
          border: `1px solid ${active ? SHADE.goldDeep : DK.border}`,
          color: active ? '#1a1208' : DK.text, borderRadius: 3,
          font: `700 11px ${TYPE.body}`,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {active ? 'Stop camera' : 'Start camera'}
      </button>
    </div>
  );
};

const ColorParamRow = ({
  label, value, onChange,
}: { label: string; value: ColorRgb; onChange: (c: ColorRgb) => void }) => {
  const [open, setOpen] = useState(false);
  const r = Math.round(value[0] * 255);
  const g = Math.round(value[1] * 255);
  const b = Math.round(value[2] * 255);
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 20 }}>
        <span
          style={{
            flex: 1, minWidth: 0,
            font: `600 10px ${TYPE.bodyMono}`, color: DK.mid,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
        <span style={{ font: `500 11.5px ${TYPE.bodyMono}`, color: DK.faint }}>{hex}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: 28, height: 16, borderRadius: 3, flex: '0 0 auto',
            background: hex, border: `1.5px solid ${DK.border}`, cursor: 'pointer',
          }}
          aria-label={`${label} colour`}
        />
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          <RgbColorPicker
            color={{ r, g, b }}
            onChange={(c) => onChange([c.r / 255, c.g / 255, c.b / 255] as unknown as ColorRgb)}
          />
        </div>
      )}
    </div>
  );
};

const WildcardProps = ({
  card, index,
}: {
  card: Extract<Card, { kind: 'wildcard' }>;
  index: number;
}) => {
  const setRecipe = useCardsStore((s) => s.setRecipe);
  const recipe = useCardsStore((s) => s.recipe);

  const onSourceChange = (next: string) => {
    setRecipe({
      ...recipe,
      cards: recipe.cards.map((c) => (c.id === card.id && c.kind === 'wildcard'
        ? { ...c, rawSource: next }
        : c)),
    });
  };

  return (
    <>
      <CardHeader cat="effect" title={card.displayName ?? 'Custom code'} blockIdx={index} cardId={card.id} />
      <Collapsible title="Custom GLSL">
        <textarea
          value={card.rawSource}
          onChange={(e) => onSourceChange(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%', minHeight: 180, resize: 'vertical',
            font: `500 12px ${TYPE.bodyMono}`,
            color: SHADE.cream, background: SHADE.surface4,
            border: `1px solid ${DK.border}`, borderRadius: 3,
            padding: '10px 12px', lineHeight: 1.5,
          }}
        />
      </Collapsible>
      <Collapsible title="Composition" defaultOpen={false}>
        <CompositionBody card={card} />
      </Collapsible>
    </>
  );
};

// ─── Multi-select batch panel ──────────────────────────────────────────
// Shown when >1 block is selected: edit shared composition (blend / opacity)
// across the whole selection, or duplicate / delete them all at once.

const MultiSelectProps = ({ cards }: { cards: Card[] }) => {
  const setAlpha = useCardsStore((s) => s.setAlpha);
  const setBlendMode = useCardsStore((s) => s.setBlendMode);
  const duplicateCard = useCardsStore((s) => s.duplicateCard);
  const removeCard = useCardsStore((s) => s.removeCard);
  const [confirmDel, setConfirmDel] = useState(false);

  const alphas = cards.map((c) => c.alpha ?? 1);
  const sameAlpha = alphas.every((a) => a === alphas[0]);
  const avgAlpha = alphas.reduce((s, a) => s + a, 0) / Math.max(1, alphas.length);
  const blends = cards.map((c) => c.blendMode ?? 'normal');
  const sharedBlend: BlendMode | null = blends.every((b) => b === blends[0]) ? blends[0]! : null;

  const delAll = () => {
    if (confirmDel) { cards.forEach((c) => removeCard(c.id)); setConfirmDel(false); }
    else { setConfirmDel(true); window.setTimeout(() => setConfirmDel(false), 2600); }
  };

  return (
    <>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${DK.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, flex: '0 0 auto', background: `${SHADE.gold}22`, border: `1px solid ${SHADE.gold}66`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="composer-blocks" size={16} color={SHADE.goldDeep} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `600 13px ${TYPE.body}`, color: DK.text, letterSpacing: '-0.01em' }}>
            {cards.length} blocks
          </div>
          <div style={{ font: `500 9px ${TYPE.bodyMono}`, color: DK.mid, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Multi-select
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${DK.border}` }}>
        <ActionButton onClick={() => cards.forEach((c) => duplicateCard(c.id))} title="Duplicate all selected">
          <DupGlyph color={DK.mid} />
          <span>Duplicate all</span>
        </ActionButton>
        <div style={{ flex: 1 }} />
        {confirmDel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ font: `600 10px ${TYPE.bodyMono}`, color: '#8a2222', letterSpacing: '0.10em', textTransform: 'uppercase', marginRight: 4 }}>delete {cards.length}?</span>
            <ActionButton onClick={delAll} tint="danger" title="Confirm delete"><span>Yes</span></ActionButton>
            <ActionButton onClick={() => setConfirmDel(false)} title="Cancel"><span>No</span></ActionButton>
          </div>
        ) : (
          <ActionButton onClick={delAll} tint="danger" title="Delete all selected">
            <Icon name="trash" size={13} color="#8a2222" />
            <span>Delete all</span>
          </ActionButton>
        )}
      </div>

      <div style={{ padding: '9px 14px 12px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ font: `700 10px ${TYPE.bodyMono}`, color: DK.mid, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Apply to all {cards.length}
        </div>
        <div>
          <div style={{ font: `700 10px ${TYPE.bodyMono}`, color: DK.faint, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Blend</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {BLEND_MODES.map((mode) => {
              const active = mode === sharedBlend;
              return (
                <button
                  key={mode}
                  onClick={() => cards.forEach((c) => setBlendMode(c.id, mode))}
                  style={{ padding: '6px 4px', borderRadius: 3, background: active ? SHADE.gold : 'transparent', color: active ? '#1a1208' : DK.mid, border: `1px solid ${active ? SHADE.goldDeep : DK.border}`, font: `600 10px ${TYPE.bodyMono}`, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  {BLEND_LABELS[mode]}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 20 }}>
          <span style={{ width: 80, flex: '0 0 auto', font: `600 10px ${TYPE.bodyMono}`, color: DK.mid, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Opacity</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DarkRail value={avgAlpha} onChange={(n) => cards.forEach((c) => setAlpha(c.id, n))} />
          </div>
          <span style={{ width: 42, flex: '0 0 auto', textAlign: 'right', font: `500 11.5px ${TYPE.bodyMono}`, color: sameAlpha ? DK.text : DK.faint }}>
            {sameAlpha ? avgAlpha.toFixed(2) : `~${avgAlpha.toFixed(2)}`}
          </span>
        </div>
      </div>
    </>
  );
};

// ─── Global panel (no selection) ───────────────────────────────────────

const ASPECTS: Array<{ key: 'square' | 'portrait' | 'landscape'; label: string }> = [
  { key: 'landscape', label: '1920×1080' },
  { key: 'square',    label: '1080×1080' },
  { key: 'portrait',  label: '1080×1920' },
];

const GlobalProps = ({ fps = 0 }: { fps?: number }) => {
  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);
  const canvas = useCardsStore((s) => s.canvas);
  const setCanvas = useCardsStore((s) => s.setCanvas);
  const exportSize = resolveExportSize(recipe.canvasAspect, canvas.exportLongEdge);
  const [bgOpen, setBgOpen] = useState(false);
  return (
    <>
      <PropSectionHeader title="Recipe" />
      <div style={{ padding: '0 14px 14px', font: `500 12px ${TYPE.bodyMono}`, color: DK.text }}>
        {recipe.cards.length} card{recipe.cards.length === 1 ? '' : 's'}
        <span style={{ color: DK.mid, marginLeft: 8 }}>· {recipe.canvasAspect}</span>
      </div>
      <div style={{ borderTop: `1px solid ${DK.border}` }} />
      <PropSectionHeader title="Output" />
      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {ASPECTS.map((a) => {
            const active = recipe.canvasAspect === a.key;
            return (
              <button
                key={a.key}
                onClick={() => setRecipe({ ...recipe, canvasAspect: a.key })}
                style={{
                  background: active ? DK.hover : DK.well,
                  border: `1px solid ${active ? DK.borderHi : DK.border}`,
                  borderRadius: 7, padding: '9px 10px',
                  font: `500 11px ${TYPE.bodyMono}`,
                  color: active ? DK.text : DK.mid,
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: `600 10.5px ${TYPE.body}`, color: DK.mid, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Export resolution
            </span>
            <span style={{ font: `500 11px ${TYPE.bodyMono}`, color: DK.faint }}>
              {exportSize.width} × {exportSize.height}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
            {([1080, 1440, 2160, 4320] as const).map((edge) => {
              const active = canvas.exportLongEdge === edge;
              const label = edge === 1080 ? '1080p' : edge === 1440 ? '1440p' : edge === 2160 ? '4K' : '8K';
              return (
                <button
                  key={edge}
                  type="button"
                  onClick={() => setCanvas({ exportLongEdge: edge })}
                  style={{
                    background: active ? DK.hover : DK.well,
                    border: `1px solid ${active ? DK.borderHi : DK.border}`,
                    borderRadius: 7,
                    padding: '8px 10px',
                    font: `500 11px ${TYPE.bodyMono}`,
                    color: active ? DK.text : DK.mid,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${DK.border}` }} />
      <PropSectionHeader title="Background" />
      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CanvasSwatch value={canvas.background} open={bgOpen} onToggle={() => setBgOpen((v) => !v)} onChange={(background) => setCanvas({ background })} />
        <PropertySlider
          label="Background alpha"
          value={canvas.backgroundAlpha}
          onChange={(backgroundAlpha) => setCanvas({ backgroundAlpha })}
        />
        <button
          type="button"
          onClick={() => setCanvas({ transparentExport: !canvas.transparentExport })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, padding: '9px 10px',
            background: canvas.transparentExport ? DK.hover : DK.well,
            border: `1px solid ${canvas.transparentExport ? DK.borderHi : DK.border}`,
            borderRadius: 7,
            color: canvas.transparentExport ? DK.text : DK.mid,
            cursor: 'pointer',
            font: `600 11px ${TYPE.bodyMono}`,
          }}
        >
          <span>Export with transparency</span>
          <span>{canvas.transparentExport ? 'On' : 'Off'}</span>
        </button>
      </div>
      <div style={{ borderTop: `1px solid ${DK.border}` }} />
      <PropSectionHeader title="Performance" />
      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ font: `600 10.5px ${TYPE.body}`, color: DK.mid, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            FPS cap
          </span>
          <span style={{ font: `500 11px ${TYPE.bodyMono}`, color: DK.faint }}>
            {canvas.fpsCap === 0 ? 'Uncapped' : `${canvas.fpsCap} FPS`}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {([0, 60, 30] as const).map((fpsCap) => {
            const active = canvas.fpsCap === fpsCap;
            const label = fpsCap === 0 ? 'Uncapped' : String(fpsCap);
            return (
              <button
                key={label}
                type="button"
                onClick={() => setCanvas({ fpsCap })}
                style={{
                  background: active ? DK.hover : DK.well,
                  border: `1px solid ${active ? DK.borderHi : DK.border}`,
                  borderRadius: 7,
                  padding: '8px 10px',
                  font: `500 11px ${TYPE.bodyMono}`,
                  color: active ? DK.text : DK.mid,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ font: `600 10.5px ${TYPE.body}`, color: DK.mid, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Render scale
          </span>
          <span style={{ font: `500 11px ${TYPE.bodyMono}`, color: DK.faint }}>
            {Math.round(canvas.renderScale * 100)}%
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          {([1, 0.75, 0.5, 0.25] as const).map((renderScale) => {
            const active = canvas.renderScale === renderScale;
            return (
              <button
                key={renderScale}
                type="button"
                onClick={() => setCanvas({ renderScale })}
                style={{
                  background: active ? DK.hover : DK.well,
                  border: `1px solid ${active ? DK.borderHi : DK.border}`,
                  borderRadius: 7,
                  padding: '8px 10px',
                  font: `500 11px ${TYPE.bodyMono}`,
                  color: active ? DK.text : DK.mid,
                  cursor: 'pointer',
                }}
              >
                {Math.round(renderScale * 100)}%
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${DK.border}` }} />
      <PropSectionHeader title="Share" />
      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          style={{
            background: SHADE.gold, color: '#1a1208',
            border: `1px solid ${SHADE.goldDeep}`, borderRadius: 3, padding: '11px 12px',
            font: `700 11.5px ${TYPE.body}`,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}
        >
          <Icon name="share" size={13} color="#1a1208" /> Publish to gallery
        </button>
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          borderTop: `1px solid ${DK.border}`,
          padding: '10px 14px',
          font: `500 9.5px ${TYPE.bodyMono}`,
          color: DK.faint, letterSpacing: '0.14em',
          display: 'flex', justifyContent: 'space-between',
        }}
      >
        <span>WEBGL2 · {Math.max(0, Math.round(fps))} FPS</span>
        <span>{canvas.transparentExport ? 'TRANSPARENT' : 'OPAQUE'}</span>
      </div>
    </>
  );
};

const CanvasSwatch = ({
  value,
  open,
  onToggle,
  onChange,
}: {
  value: ColorRgb;
  open: boolean;
  onToggle: () => void;
  onChange: (next: ColorRgb) => void;
}) => {
  const r = Math.round(value[0] * 255);
  const g = Math.round(value[1] * 255);
  const b = Math.round(value[2] * 255);
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', height: 34, borderRadius: 7,
          background: hex,
          border: `1.5px solid ${SHADE.inkLine}`,
          cursor: 'pointer', display: 'block',
        }}
        aria-label="Canvas colour"
      />
      {open && (
        <div style={{ marginTop: 10 }}>
          <RgbColorPicker
            color={{ r, g, b }}
            onChange={(c) => onChange([c.r / 255, c.g / 255, c.b / 255] as unknown as ColorRgb)}
          />
        </div>
      )}
    </div>
  );
};

// Helpers — small re-exports for backward compat with other design/ files
// that may still import these.
export const PropertyRow = ({
  label, value, animated, unit, children,
}: { label: string; value: number; animated?: boolean; unit?: string; children?: ReactNode }) => (
  <div>
    <PropertySlider label={label} value={value} animated={animated} unit={unit} />
    {children}
  </div>
);

// (intentionally left blank — formerly a void-reference shim for unused
// imports, but CSSProperties is a type-only import and can't be `void`-ed.)
