import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCardsStore, getPassCards, rerouteDeclNames, lookupCardDef, ANIM_BLOCK_LIST } from '@/cards';
import type { MacroDef, TypedCard, ParamDef, ParameterValue, ColorRgb } from '@/cards';
import { BLOCK_LIB, CATEGORIES, PANEL, SHADE, TYPE } from './tokens';
import type { BlockDef } from './tokens';
import { Icon } from './icons';
import { Starfield } from './Starfield';
import { SignInButton } from '@/auth';
import { PhotoToCardsPopover } from './PhotoToCards';
import { tagsFor } from './block-tags';
import { getRecents, getFavorites, pushRecent, isFavorite, toggleFavorite, usePaletteVersion } from './palette-prefs';
import { getMacros, useMacroVersion, deleteMacro, renameMacro, saveMacro } from './macro-prefs';
import { MacroIcon, MACRO_ICON_KEYS } from './macro-icons';
import { recipeShareUrl, encodeRecipeToHash } from './recipe-url';

// DataTransfer mime for dragging a block from the palette onto the canvas.
// The canvas (Chain, in DesktopApp) reads this on drop to place the new card
// at the cursor. Carries the block id (= card type).
export const PALETTE_DND_MIME = 'application/x-shaddy-palette-block';

// ─── Macro editor modal ───────────────────────────────────────────────────
// Opens from the palette's Macros group (✎). Lets the user rename a saved
// macro, toggle byte-identical GLSL compression, reorder / remove its
// sub-blocks, and tweak each sub-block's params — then writes it back to the
// macro registry. Edits here re-flow to every place the macro is inserted next.

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const to255 = (n: number): number => Math.round(clamp01(n) * 255);
const rgbToHex = (c: ColorRgb): string =>
  `#${[c[0], c[1], c[2]].map((v) => to255(v).toString(16).padStart(2, '0')).join('')}`;
const hexToRgb = (hex: string): ColorRgb => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const MacroParamRow = ({
  def, value, onChange,
}: { def: ParamDef; value: ParameterValue; onChange: (v: ParameterValue) => void }) => {
  const labelStyle: CSSProperties = { font: `600 10px ${TYPE.bodyMono}`, color: SHADE.textDim, letterSpacing: '0.06em', minWidth: 78, flex: '0 0 auto' };
  if (def.kind === 'float') {
    const v = typeof value === 'number' ? value : def.default;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
        <span style={labelStyle}>{def.label}</span>
        <input type="range" min={def.min} max={def.max} step={def.step ?? 0.01} value={v}
          onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: SHADE.macro }} />
        <input type="number" min={def.min} max={def.max} step={def.step ?? 0.01} value={Number(v.toFixed(3))}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: 56, flex: '0 0 auto', background: SHADE.surface2, border: `1px solid ${SHADE.border}`, borderRadius: 4, color: SHADE.text, font: `500 11px ${TYPE.bodyMono}`, padding: '2px 5px' }} />
      </div>
    );
  }
  if (def.kind === 'color') {
    const v = Array.isArray(value) ? (value as ColorRgb) : def.default;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
        <span style={labelStyle}>{def.label}</span>
        <input type="color" value={rgbToHex(v)} onChange={(e) => onChange(hexToRgb(e.target.value))}
          style={{ width: 40, height: 22, flex: '0 0 auto', background: 'transparent', border: `1px solid ${SHADE.border}`, borderRadius: 4, cursor: 'pointer', padding: 0 }} />
        <span style={{ font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textFaint }}>{rgbToHex(v)}</span>
      </div>
    );
  }
  if (def.kind === 'select') {
    const v = typeof value === 'number' ? value : def.default;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
        <span style={labelStyle}>{def.label}</span>
        <select value={v} onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, minWidth: 0, background: SHADE.surface2, border: `1px solid ${SHADE.border}`, borderRadius: 4, color: SHADE.text, font: `500 11px ${TYPE.body}`, padding: '2px 5px' }}>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  // image / video / buffer / text params aren't editable inline in the macro
  // modal (they need live media / canvas context) — show them read-only.
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span style={labelStyle}>{def.label}</span>
      <span style={{ font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textFaint }}>({def.kind} — edit on canvas)</span>
    </div>
  );
};

const MacroEditModal = ({ name, onClose }: { name: string; onClose: () => void }) => {
  const original = useMemo(() => getMacros().find((m) => m.name === name) ?? null, [name]);
  const [draftName, setDraftName] = useState(name);
  const [compress, setCompress] = useState(original?.compress ?? false);
  const [icon, setIcon] = useState<string | undefined>(original?.icon);
  const [blocks, setBlocks] = useState<TypedCard[]>(() => original ? original.blocks.map((b) => ({ ...b, params: { ...b.params } })) : []);

  if (!original) return null;

  const move = (i: number, dir: -1 | 1): void => {
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const next = bs.slice();
      const a = next[i], b = next[j];
      if (!a || !b) return bs;
      next[i] = b; next[j] = a;
      return next;
    });
  };
  const remove = (i: number): void => setBlocks((bs) => bs.filter((_, k) => k !== i));
  const setParam = (i: number, key: string, value: ParameterValue): void => {
    setBlocks((bs) => bs.map((b, k) => k === i ? { ...b, params: { ...b.params, [key]: { value, animation: null } } } : b));
  };
  const save = (): void => {
    const finalName = draftName.trim() || name;
    const def: MacroDef = { name: finalName, blocks, compress, ...(icon ? { icon } : {}) };
    if (finalName !== name) deleteMacro(name);
    saveMacro(def);
    onClose();
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,12,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 460, maxHeight: '82vh', display: 'flex', flexDirection: 'column', background: SHADE.surface1, border: `1px solid ${SHADE.macro}`, borderRadius: 8, boxShadow: '0 18px 50px rgba(0,0,0,0.4)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${SHADE.border}` }}>
          <span style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }}><MacroIcon name={icon} size={20} color={SHADE.macro} /></span>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            style={{ flex: 1, background: SHADE.surface2, border: `1px solid ${SHADE.border}`, borderRadius: 4, color: SHADE.text, font: `700 13px ${TYPE.body}`, padding: '5px 8px', outline: 'none' }}
          />
          <button type="button" onClick={onClose} title="Close"
            style={{ width: 24, height: 24, border: 'none', borderRadius: 4, background: 'transparent', color: SHADE.textDim, cursor: 'pointer', font: `400 18px ${TYPE.body}`, lineHeight: 0 }}>×</button>
        </div>

        {/* Icon picker — 50 curated purple glyphs. */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${SHADE.border}` }}>
          <div style={{ font: `700 9px ${TYPE.bodyMono}`, color: SHADE.textFaint, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 7 }}>Icon</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, maxHeight: 132, overflowY: 'auto' }}>
            {MACRO_ICON_KEYS.map((k) => {
              const active = (icon ?? 'macro') === k;
              return (
                <button
                  key={k}
                  type="button"
                  title={k}
                  onClick={() => setIcon(k)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    aspectRatio: '1', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${active ? SHADE.macro : SHADE.border}`,
                    background: active ? `${SHADE.macro}22` : SHADE.surface2,
                  }}
                >
                  <MacroIcon name={k} size={18} color={SHADE.macro} />
                </button>
              );
            })}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${SHADE.border}`, cursor: 'pointer' }}>
          <input type="checkbox" checked={compress} onChange={(e) => setCompress(e.target.checked)} style={{ accentColor: SHADE.macro }} />
          <span style={{ font: `600 11.5px ${TYPE.body}`, color: SHADE.text }}>Compress GLSL</span>
          <span style={{ font: `400 10px ${TYPE.body}`, color: SHADE.textFaint }}>— byte-identical, strips ×1 / +0 noise</span>
        </label>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ font: `700 9px ${TYPE.bodyMono}`, color: SHADE.textFaint, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '2px 4px' }}>Blocks · {blocks.length}</div>
          {blocks.length === 0 && (
            <div style={{ font: `400 12px ${TYPE.body}`, color: SHADE.textDim, padding: '10px 4px' }}>This macro has no editable blocks.</div>
          )}
          {blocks.map((b, i) => {
            const def = lookupCardDef(b.type);
            const params = def ? Object.entries(def.params) : [];
            return (
              <div key={b.id} style={{ border: `1px solid ${SHADE.border}`, borderRadius: 6, background: SHADE.surface2, padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: params.length ? 6 : 0 }}>
                  <span style={{ font: `600 9px ${TYPE.bodyMono}`, color: SHADE.textFaint, flex: '0 0 auto' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ flex: 1, font: `700 12px ${TYPE.body}`, color: SHADE.text }}>{def?.friendlyName ?? b.type}</span>
                  <button type="button" title="Move up" onClick={() => move(i, -1)} disabled={i === 0}
                    style={{ width: 20, height: 20, border: 'none', borderRadius: 4, background: 'transparent', color: i === 0 ? SHADE.textFaint : SHADE.textDim, cursor: i === 0 ? 'default' : 'pointer', font: `700 11px ${TYPE.body}` }}>↑</button>
                  <button type="button" title="Move down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}
                    style={{ width: 20, height: 20, border: 'none', borderRadius: 4, background: 'transparent', color: i === blocks.length - 1 ? SHADE.textFaint : SHADE.textDim, cursor: i === blocks.length - 1 ? 'default' : 'pointer', font: `700 11px ${TYPE.body}` }}>↓</button>
                  <button type="button" title="Remove block" onClick={() => remove(i)}
                    style={{ width: 20, height: 20, border: 'none', borderRadius: 4, background: 'transparent', color: SHADE.textDim, cursor: 'pointer', font: `400 14px ${TYPE.body}`, lineHeight: 0 }}>×</button>
                </div>
                {params.map(([key, pdef]) => (
                  <MacroParamRow
                    key={key}
                    def={pdef}
                    value={b.params[key]?.value ?? (pdef.kind === 'float' || pdef.kind === 'select' ? pdef.default : pdef.kind === 'color' ? pdef.default : 0)}
                    onChange={(v) => setParam(i, key, v)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 16px', borderTop: `1px solid ${SHADE.border}` }}>
          <button type="button" onClick={onClose}
            style={{ padding: '7px 16px', border: `1px solid ${SHADE.border}`, borderRadius: 5, background: 'transparent', color: SHADE.textDim, cursor: 'pointer', font: `600 11.5px ${TYPE.body}` }}>Cancel</button>
          <button type="button" onClick={save}
            style={{ padding: '7px 18px', border: 'none', borderRadius: 5, background: SHADE.macro, color: '#fff', cursor: 'pointer', font: `700 11.5px ${TYPE.body}` }}>Save macro</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Count placed instances of a macro (by name) across the image + buffer passes
 *  — shown in the delete confirmation so the user knows what will be removed. */
function countMacroInstances(recipe: { cards: Array<{ kind: string; type?: string; macro?: MacroDef }>; passes?: Array<{ cards: Array<{ kind: string; type?: string; macro?: MacroDef }> }> }, name: string): number {
  const inPass = (cards: Array<{ kind: string; type?: string; macro?: MacroDef }>): number =>
    cards.filter((c) => c.kind === 'typed' && c.type === 'macro' && c.macro?.name === name).length;
  return inPass(recipe.cards) + (recipe.passes ?? []).reduce((n, p) => n + inPass(p.cards), 0);
}

const MacroDeleteConfirm = ({
  name, instanceCount, onCancel, onConfirm,
}: { name: string; instanceCount: number; onCancel: () => void; onConfirm: () => void }) => createPortal(
  <div
    onClick={onCancel}
    style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,12,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 210 }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ width: 360, background: SHADE.surface1, border: `1px solid ${SHADE.border}`, borderRadius: 8, boxShadow: '0 18px 50px rgba(0,0,0,0.4)', overflow: 'hidden' }}
    >
      <div style={{ padding: '16px 18px 12px' }}>
        <div style={{ font: `700 14px ${TYPE.body}`, color: SHADE.text, marginBottom: 6 }}>Delete macro “{name}”?</div>
        <div style={{ font: `400 12px ${TYPE.body}`, color: SHADE.textDim, lineHeight: 1.5 }}>
          This removes it from the palette{instanceCount > 0
            ? <> and deletes <b style={{ color: SHADE.text }}>{instanceCount} instance{instanceCount === 1 ? '' : 's'}</b> from the canvas.</>
            : '.'} This can’t be undone.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '10px 16px', borderTop: `1px solid ${SHADE.border}` }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '7px 16px', border: `1px solid ${SHADE.border}`, borderRadius: 5, background: 'transparent', color: SHADE.textDim, cursor: 'pointer', font: `600 11.5px ${TYPE.body}` }}>Cancel</button>
        <button type="button" onClick={onConfirm}
          style={{ padding: '7px 18px', border: 'none', borderRadius: 5, background: SHADE.catDistort, color: '#fff', cursor: 'pointer', font: `700 11.5px ${TYPE.body}` }}>Delete</button>
      </div>
    </div>
  </div>,
  document.body,
);

// ─── Text-only difference-blend toggle pill ───────────────────────────────
export const TogglePill = ({
  children, active = true, accent,
}: { children: ReactNode; active?: boolean; accent?: string }) => {
  const c = accent ?? '#fff';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        borderRadius: 4,
        border: `1px ${active ? 'solid' : 'dashed'} ${c}`,
        color: c,
        mixBlendMode: 'difference',
        font: `500 10.5px ${TYPE.bodyMono}`,
        letterSpacing: '0.04em',
        opacity: active ? 1 : 0.45,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {children}
    </span>
  );
};

// ─── Top bar — mirrors the landing nav so the editor frame feels continuous
// with the marketing site: mascot mark, starfield, dim links + gold underline,
// the shared SignInButton, and a gold-gradient CTA. Only real actions: Import
// (Photo→blocks) and Share (copies the recipe URL — recipes persist in the URL).
export const TopBar = () => {
  const photoBtnRef = useRef<HTMLButtonElement | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [photoAnchor, setPhotoAnchor] = useState<{ top: number; right: number }>({ top: 60, right: 24 });

  const openPhoto = () => {
    const btn = photoBtnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setPhotoAnchor({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setImportOpen(false);
    setPhotoOpen(true);
  };
  const [shareErr, setShareErr] = useState(false);
  const handleShare = async () => {
    // Build a link that actually restores the composition: the recipe rides in
    // the URL hash (#r=…). Update the address bar too, so a plain refresh keeps
    // the shared state.
    const recipe = useCardsStore.getState().recipe;
    const url = recipeShareUrl(recipe);
    try {
      window.history.replaceState(null, '', `#${encodeRecipeToHash(recipe)}`);
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1600);
    } catch {
      // Clipboard blocked (e.g. insecure context) — the URL is still in the bar.
      setShareErr(true);
      window.setTimeout(() => setShareErr(false), 2200);
    }
  };

  return (
    <div
      style={{
        height: 56, flex: '0 0 auto',
        display: 'flex', alignItems: 'center',
        padding: '0 20px',
        borderBottom: `1px solid ${SHADE.topbarBorder}`,
        background: SHADE.topbar,
        color: SHADE.topbarText,
        gap: 22,
        font: `500 12.5px ${TYPE.body}`,
        position: 'relative',
        // overflow visible so dropdowns (sign-in picker, import menu) that hang
        // below the bar aren't clipped; the Starfield is clipped by its wrapper.
        overflow: 'visible',
        zIndex: 30,
      }}
    >
      <span aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Starfield opts={{ density: 0.22, leftBias: 1.8 }} />
      </span>

      {/* centered cluster — mascot mark + nav links (mirrors the landing nav) */}
      <div
        style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 18, zIndex: 1,
        }}
      >
        <a
          href="/"
          title="Back to landing"
          aria-label="Shaddy home"
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', marginRight: 2 }}
        >
          <img src="/mascot.svg" alt="Shaddy" style={{ height: 30, width: 'auto', display: 'block' }} />
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NavLink href="/design" active>Compose</NavLink>
          <NavLink href="/library">Library</NavLink>
          <NavLink href="/learn">Learn</NavLink>
          <NavLink href="/gallery">Gallery</NavLink>
          <NavLink href="/docs">Docs</NavLink>
        </nav>
      </div>

      {/* right: Import · Share · Sign in — landing button language */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 12px', borderRadius: 6,
              background: importOpen ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
              border: `1px solid rgba(255,255,255,${importOpen ? 0.22 : 0.12})`,
              color: SHADE.topbarText, cursor: 'pointer',
              font: `600 12px ${TYPE.body}`, letterSpacing: '0.02em',
              transition: 'background 0.14s, border-color 0.14s',
            }}
            onMouseEnter={(e) => { if (!importOpen) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={(e) => { if (!importOpen) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            Import
            <span aria-hidden style={{ width: 0, height: 0, borderLeft: '3.5px solid transparent', borderRight: '3.5px solid transparent', borderTop: '4px solid rgba(232,226,212,0.55)', transform: importOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.16s' }} />
          </button>
          {importOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onMouseDown={() => setImportOpen(false)} />
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 41,
                  minWidth: 190, padding: 5,
                  background: SHADE.topbarSurface, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                  boxShadow: '0 16px 44px -12px rgba(0,0,0,0.6), 0 3px 10px rgba(0,0,0,0.4)',
                }}
              >
                <button
                  ref={photoBtnRef}
                  type="button"
                  onClick={openPhoto}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '8px 9px', borderRadius: 5, border: 'none', background: 'transparent',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon name="tb-photo" size={17} color={SHADE.topbarText} cream={SHADE.gold} />
                  <span style={{ font: `500 12.5px ${TYPE.body}`, color: SHADE.topbarText }}>Photo → blocks</span>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => { void handleShare(); }}
          title="Copy a link that restores this exact recipe (rides in the URL)"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            height: 34, padding: '0 14px', borderRadius: 6,
            background: `linear-gradient(180deg, ${SHADE.gold} 0%, ${SHADE.goldDeep} 100%)`,
            border: `1px solid ${SHADE.goldDeep}`,
            color: '#1a1208', cursor: 'pointer',
            font: `700 12px ${TYPE.body}`, letterSpacing: '0.03em',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 2px 6px rgba(0,0,0,0.35)',
          }}
        >
          {shared
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a1208" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 L10 17.5 L19 6.5" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a1208" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6.5" /><path d="M12 3.5v11" /><path d="M8 7.5l4-4 4 4" /></svg>}
          {shared ? 'Copied!' : shareErr ? 'URL updated' : 'Share'}
        </button>

        <SignInButton />
      </div>

      {photoOpen && (
        <PhotoToCardsPopover anchor={photoAnchor} onClose={() => setPhotoOpen(false)} />
      )}
      <CommandPalette />
    </div>
  );
};

const NavLink = ({ children, active = false, href = '#' }: { children: ReactNode; active?: boolean; href?: string }) => (
  <a
    href={href}
    style={{
      position: 'relative',
      color: active ? SHADE.topbarText : 'rgba(232,226,212,0.7)',
      textDecoration: 'none',
      font: `500 12.5px ${TYPE.body}`,
      letterSpacing: '0.01em',
      padding: '18px 14px',
      transition: 'color 0.18s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = SHADE.topbarText;
      (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'scaleX(1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = active ? SHADE.topbarText : 'rgba(232,226,212,0.7)';
      (e.currentTarget.firstElementChild as HTMLElement).style.transform = active ? 'scaleX(1)' : 'scaleX(0)';
    }}
  >
    <span
      aria-hidden
      style={{
        position: 'absolute', left: 14, right: 14, bottom: 14,
        height: 1.5,
        background: SHADE.gold,
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'center',
        transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
        display: 'block', borderRadius: 1,
      }}
    />
    {children}
  </a>
);

// ─── Palette item — flat, no glow ────────────────────────────────────────
const PaletteItem = ({ block }: { block: BlockDef }) => {
  const cat = CATEGORIES[block.cat];
  const insertTypedCard = useCardsStore((s) => s.insertTypedCard);
  const [hover, setHover] = useState(false);
  const fav = isFavorite(block.id);
  const add = (): void => { insertTypedCard(block.id); pushRecent(block.id); };
  // Drag onto the canvas to place it where you drop; the click path still
  // appends it. The canvas (Chain) reads PALETTE_DND_MIME on drop.
  const onDragStart = (e: DragEvent<HTMLDivElement>): void => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData(PALETTE_DND_MIME, block.id);
      e.dataTransfer.setData('text/plain', block.id);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onClick={add}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          add();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Add ${block.name}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 10px 8px 14px',
        borderRadius: 4,
        background: hover ? SHADE.surface3 : SHADE.surface1,
        border: `1px solid ${hover ? SHADE.borderHi : SHADE.border}`,
        cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'background 0.12s, border-color 0.12s',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: cat.color }} />
      <Icon name={block.icon} size={15} color={cat.color} />
      <span
        style={{
          font: `500 12px ${TYPE.body}`, color: SHADE.text,
          letterSpacing: '0.04em',
        }}
      >
        {block.name}
      </span>
      {(hover || fav) && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
          <button
            type="button"
            title={fav ? 'Remove favorite' : 'Add favorite'}
            onClick={(e) => { e.stopPropagation(); toggleFavorite(block.id); }}
            style={{ display: 'flex', padding: 1, border: 'none', background: 'transparent', cursor: 'pointer', lineHeight: 0 }}
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24"
              fill={fav ? SHADE.gold : 'none'}
              stroke={fav ? SHADE.goldDeep : SHADE.textFaint}
              strokeWidth="1.8" strokeLinejoin="round"
            >
              <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.9l-5.2 2.62.99-5.8-4.21-4.1 5.82-.85z" />
            </svg>
          </button>
          {hover && <span style={{ font: `700 13px ${TYPE.body}`, color: SHADE.textDim }}>+</span>}
        </div>
      )}
    </div>
  );
};

const PaletteSubgroupHeader = ({ label, count }: { label: string; count: number }) => (
  <div
    style={{
      display: 'flex', alignItems: 'baseline', gap: 6,
      margin: '6px 8px 4px 8px',
      padding: '2px 0',
      font: `600 9.5px ${TYPE.bodyMono}`,
      color: SHADE.textFaint,
      letterSpacing: '0.18em', textTransform: 'uppercase',
    }}
  >
    <span>{label}</span>
    <span style={{ flex: 1, height: 1, background: SHADE.border, opacity: 0.6 }} />
    <span style={{ opacity: 0.7 }}>{count}</span>
  </div>
);

// ─── Nested collapsible tree rows (Outliner-style navigation) ─────────────
const Caret = ({ open, color }: { open: boolean; color: string }) => (
  <span
    aria-hidden
    style={{
      width: 0, height: 0, flex: '0 0 auto',
      borderLeft: `4px solid ${color}`,
      borderTop: '3.5px solid transparent', borderBottom: '3.5px solid transparent',
      transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease',
    }}
  />
);

// One collapsible group header in the palette tree. depth 0 = category (colored,
// uppercase, with its glyph); depth 1 = sub-group (dim). Minimal — no boxes.
const TreeGroupRow = ({
  depth, open, onToggle, label, count, color, glyph,
}: {
  depth: 0 | 1;
  open: boolean;
  onToggle: () => void;
  label: string;
  count: number;
  color: string;
  glyph?: ReactNode;
}) => {
  const [hover, setHover] = useState(false);
  const top = depth === 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-expanded={open}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: `${top ? 7 : 5}px 9px ${top ? 7 : 5}px ${8 + depth * 16}px`,
        background: hover ? SHADE.surface3 : 'transparent',
        border: 'none', borderRadius: 5, cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.12s',
      }}
    >
      <Caret open={open} color={top ? color : SHADE.textFaint} />
      {glyph}
      <span
        style={{
          flex: 1,
          font: top ? `700 11px ${TYPE.body}` : `600 11px ${TYPE.body}`,
          color: top ? color : SHADE.textDim,
          letterSpacing: top ? '0.09em' : '0.01em',
          textTransform: top ? 'uppercase' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <span style={{ font: `500 9.5px ${TYPE.bodyMono}`, color: SHADE.textFaint, flex: '0 0 auto' }}>{count}</span>
    </button>
  );
};

// ─── Sub-group taxonomy ──────────────────────────────────────────────────
// Derived from the comment groupings in cards/library/index.ts. The order
// here matches the visual rendering order inside each category. Cards not
// matched by any subgroup fall into "Other" at the bottom.
type SubgroupDef = { label: string; ids: readonly string[] };
const SUBGROUPS: Record<keyof typeof CATEGORIES, SubgroupDef[]> = {
  shape: [
    { label: 'Primitives', ids: [
      'radial_gradient', 'ring', 'square', 'rectangle', 'rounded_box', 'triangle',
      'pentagon', 'hexagon', 'star', 'heart', 'cross', 'arc', 'ellipse',
      'capsule', 'segment', 'trapezoid', 'parallelogram', 'vesica',
      'pie_slice', 'horseshoe',
    ] },
    { label: 'Patterns', ids: [
      'stripes', 'wavy_stripes', 'radial_stripes', 'cross_hatch', 'moire',
    ] },
    { label: 'Tiling / Islamic', ids: [
      'hex_grid', 'triangle_grid', 'triangular_tiles', 'brick_wall', 'random_squares',
      'truchet', 'truchet_tris', 'islamic_8pt_star', 'islamic_6pt_star',
      'islamic_12pt_rosette', 'zellige_grid', 'kufic_grid', 'arabesque_curls',
    ] },
    { label: 'Noise', ids: [
      'noise_field', 'fbm', 'ridged', 'turbulence', 'domain_warp',
      'voronoi_cells', 'worley_edges',
    ] },
    { label: 'Math / Waves', ids: [
      'sin_field', 'plasma', 'interference', 'caustics', 'metaballs',
    ] },
    { label: 'Fractals', ids: [
      'julia', 'mandelbrot', 'mandelbulb_2d', 'burning_ship',
      'newton', 'sierpinski', 'orbit_trap_circle',
    ] },
    { label: 'Polar / Radial', ids: [
      'concentric', 'sunburst', 'rose_curve', 'rose_petals', 'cardioid_shape',
      'lemniscate', 'polar_grid', 'sector', 'spiral_arms',
    ] },
    { label: 'Gradients', ids: [
      'gradient_linear', 'gradient_conic',
    ] },
  ],
  distort: [
    { label: 'UV Transforms', ids: [
      'translate', 'scale_uv', 'mirror_x', 'mirror_y', 'skew',
      'polar_warp', 'fisheye', 'zoom_blur_uv',
    ] },
    { label: 'Domain Repetition', ids: [
      'repeat', 'polar_repeat', 'mirror_domain', 'mirror_repeat',
    ] },
    { label: 'Noise-driven', ids: [
      'swirl', 'twirl', 'noise_warp', 'wave_warp',
    ] },
    { label: 'Scalar Transforms', ids: [
      'ripple', 'threshold_d', 'invert_d', 'power_curve', 'bands', 'contour',
      'sin_wave_d', 'onion', 'antialiased_step', 'remap', 'cubic_smoothstep',
      'sigmoid_curve', 'smooth_min_d', 'smooth_min_to_circle', 'smooth_intersection',
    ] },
  ],
  color: [
    { label: 'Generic', ids: [
      'palette', 'triple_gradient', 'four_gradient', 'duotone',
      'cosine_palette', 'rainbow_d', 'hue_cycle', 'd_as_rgb',
      'solid_color', 'tritone', 'split_tone',
    ] },
    { label: 'Themed', ids: [
      'palette_themed',
    ] },
    { label: 'Adjustments', ids: [
      'hue_shift', 'saturate', 'grayscale', 'sepia',
    ] },
  ],
  effect: [
    { label: 'Lens / Atmospheric', ids: [
      'vignette', 'glow', 'bloom', 'god_rays', 'radial_blur_fake',
      'fog', 'fog_exp', 'sphere_ao', 'rim_light', 'chromatic_aberration',
    ] },
    { label: 'Lighting', ids: [
      'fresnel', 'blinn_phong', 'ambient_occlusion', 'soft_shadow',
    ] },
    { label: 'Tonal', ids: [
      'contrast', 'exposure', 'gamma', 'dim', 'tint',
    ] },
    { label: 'Tonemapping', ids: [
      'reinhard_tonemap', 'aces_tonemap', 'filmic_tonemap', 'linear_to_srgb',
    ] },
    { label: 'Stylize', ids: [
      'halftone', 'sketch', 'ascii', 'dither', 'edge_detect', 'overlay_noise',
    ] },
    { label: 'Texture / Noise', ids: [
      'grain', 'film_grain_color',
    ] },
    { label: 'Retro', ids: [
      'crt_curvature', 'vhs_glitch',
    ] },
    { label: 'Time-driven', ids: [
      'pulse_brightness', 'pulse_hue',
    ] },
  ],
};

// Resolve sub-group buckets for a given category from the live BLOCK_LIB,
// honoring SUBGROUPS order. Unknown ids land in "Other" so the palette is
// never lossy if the library grows.
function bucketize(cat: keyof typeof CATEGORIES, blocks: BlockDef[]): Array<{ label: string; blocks: BlockDef[] }> {
  const subs = SUBGROUPS[cat];
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const used = new Set<string>();
  const out: Array<{ label: string; blocks: BlockDef[] }> = [];
  for (const { label, ids } of subs) {
    const picks: BlockDef[] = [];
    for (const id of ids) {
      const b = byId.get(id);
      if (b) {
        picks.push(b);
        used.add(id);
      }
    }
    if (picks.length > 0) out.push({ label, blocks: picks });
  }
  const leftover = blocks.filter((b) => !used.has(b.id));
  if (leftover.length > 0) out.push({ label: 'Other', blocks: leftover });
  return out;
}

// Tiny fuzzy match: tokenize query on whitespace, then require each token
// to appear as a substring in order against the haystack. Returns a score
// (lower is better — earlier matches rank higher) or -1 for no match.
// fzf-ish ranker: every query token must match the block SOMEWHERE (name, the
// spaced id, or a tag), and the best match per token scores higher for exact /
// word-start / tag hits, with a subsequence fallback for typos & acronyms.
// Returns a score where HIGHER = better, or -1 if any token can't match.
function isSubsequence(t: string, hay: string): boolean {
  let i = 0;
  for (let j = 0; j < hay.length && i < t.length; j++) {
    if (hay[j] === t[i]) i += 1;
  }
  return i === t.length;
}

function scoreBlock(block: BlockDef, tokens: string[]): number {
  const name = block.name.toLowerCase();
  const idText = block.id.toLowerCase().replace(/_/g, ' ');
  const tags = tagsFor(block.id);
  let total = 0;
  for (const t of tokens) {
    let best = -1;
    const ni = name.indexOf(t);
    if (ni >= 0) best = Math.max(best, 100 - ni + (ni === 0 || name[ni - 1] === ' ' ? 35 : 0));
    const ii = idText.indexOf(t);
    if (ii >= 0) best = Math.max(best, 80 - ii + (ii === 0 || idText[ii - 1] === ' ' ? 25 : 0));
    for (const tag of tags) {
      if (tag === t) best = Math.max(best, 95);
      else if (tag.startsWith(t)) best = Math.max(best, 72);
      else if (tag.includes(t)) best = Math.max(best, 48);
    }
    if (best < 0 && isSubsequence(t, name)) best = 18;
    if (best < 0) return -1;
    total += best;
  }
  return total;
}

// The REAL 3D cards — these contribute to the raymarched SDF scene when the
// recipe is in 3D mode. Inserting any of them auto-flips the recipe to 3D
// (see cards/state.ts.insertTypedCard).
const REAL_3D_IDS: readonly string[] = [
  'sphere_3d',
  'box_3d',
  'torus_3d',
  'ground_3d',
  'repeat_3d',
  'smooth_union_3d',
  'material_color_3d',
];

// Hybrid cards — existing 2D cards that already produce a 3D-looking result.
// Shown below the real cards on the 3D tab as "Hybrid (fake 3D)" — they're
// 2D under the hood so inserting them does NOT flip the recipe.
const HYBRID_3D_IDS: readonly string[] = [
  'mandelbulb_2d',
  'julia',
  'sphere_ao',
  'fresnel',
  'domain_warp',
  'rim_light',
];

type PaletteTab = '2d' | '3d' | 'anim';

// Single tab button — matches the topbar NavLink idiom (animated underline,
// dim → cream on active) but at a smaller size to fit the sidebar.
const PaletteTabButton = ({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      flex: 1,
      position: 'relative',
      padding: '11px 0 10px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: active ? SHADE.text : SHADE.textFaint,
      font: `700 11px ${TYPE.body}`,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      transition: 'color 0.18s, background 0.18s',
    }}
    onMouseEnter={(e) => {
      if (active) return;
      e.currentTarget.style.background = SHADE.surface1;
      e.currentTarget.style.color = SHADE.textDim;
    }}
    onMouseLeave={(e) => {
      if (active) return;
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = SHADE.textFaint;
    }}
    aria-pressed={active}
  >
    {label}
    <span
      aria-hidden
      style={{
        position: 'absolute', left: 10, right: 10, bottom: 0,
        height: 3,
        background: SHADE.gold,
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'center',
        transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1)',
        display: 'block',
        borderRadius: 1.5,
      }}
    />
  </button>
);

// ⌘K command palette — keyboard-first add. Opens on Cmd/Ctrl+K (or a
// 'shaddy:cmdk' window event from the palette hint). Type to rank blocks via the
// same scorer, or run an action. ↑/↓ navigate, ↵ run, Esc close. Dark spotlight
// (PANEL) floating over the warm workspace — the familiar Raycast/Linear idiom.
type CmdItem = { key: string; label: string; hint: string; color: string; icon?: string; run: () => void };

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const insertTypedCard = useCardsStore((s) => s.insertTypedCard);
  const insertRerouteUse = useCardsStore((s) => s.insertRerouteUse);
  const setMode = useCardsStore((s) => s.setMode);
  const recipe = useCardsStore((s) => s.recipe);
  const activePassId = useCardsStore((s) => s.activePassId);
  const rerouteNames = rerouteDeclNames(getPassCards(recipe, activePassId));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvt = (): void => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('shaddy:cmdk', onEvt);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('shaddy:cmdk', onEvt);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setSel(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const blockItem = (b: BlockDef): CmdItem => ({
    key: `blk-${b.id}`,
    label: b.name,
    hint: CATEGORIES[b.cat].label,
    color: CATEGORIES[b.cat].color,
    icon: b.icon,
    run: () => { insertTypedCard(b.id); pushRecent(b.id); },
  });
  const rerouteItem = (name: string): CmdItem => ({
    key: `rr-${name}`,
    label: name,
    hint: 'Reroute',
    color: SHADE.reroute,
    run: () => { insertRerouteUse(name); },
  });
  const rerouteItems = rerouteNames.map(rerouteItem);
  const actions: CmdItem[] = [
    { key: 'act-2d', label: 'Switch to 2D pipeline', hint: 'Mode', color: SHADE.gold, run: () => setMode('2d') },
    { key: 'act-3d', label: 'Switch to 3D pipeline', hint: 'Mode', color: SHADE.gold, run: () => setMode('3d') },
  ];
  const items: CmdItem[] = (() => {
    if (tokens.length === 0) {
      const recents = getRecents()
        .map((id) => BLOCK_LIB.find((b) => b.id === id))
        .filter((b): b is BlockDef => b != null)
        .map(blockItem);
      // Reroutes first — they're the user's own named taps, most relevant.
      return [...rerouteItems, ...actions, ...recents].slice(0, 30);
    }
    const matchAct = actions.filter((a) => tokens.every((t) => a.label.toLowerCase().includes(t)));
    const matchRr = rerouteItems.filter((it) => tokens.every((t) => it.label.toLowerCase().includes(t)));
    const scored: Array<{ b: BlockDef; s: number }> = [];
    for (const b of BLOCK_LIB) {
      const s = scoreBlock(b, tokens);
      if (s >= 0) scored.push({ b, s });
    }
    scored.sort((a, b) => b.s - a.s);
    return [...matchRr, ...matchAct, ...scored.slice(0, 40).map((x) => blockItem(x.b))];
  })();
  const clampedSel = Math.min(sel, Math.max(0, items.length - 1));
  const run = (i: number): void => {
    const it = items[i];
    if (it) { it.run(); setOpen(false); }
  };

  if (!open) return null;
  return createPortal(
    <div
      onMouseDown={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(8,8,10,0.5)', backdropFilter: 'blur(3px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh',
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); run(clampedSel); }
          else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
        }}
        style={{
          width: 560, maxWidth: '92vw', maxHeight: '64vh',
          display: 'flex', flexDirection: 'column',
          background: PANEL.panel, border: `1px solid ${PANEL.borderHi}`, borderRadius: 12,
          boxShadow: '0 28px 80px -16px rgba(0,0,0,0.7), 0 6px 20px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderBottom: `1px solid ${PANEL.divider}` }}>
          <Icon name="search" size={16} color={PANEL.dim} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSel(0); }}
            placeholder="Type a block or command…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: PANEL.text, font: `500 14.5px ${TYPE.body}`, minWidth: 0 }}
          />
          <span style={{ font: `600 9.5px ${TYPE.bodyMono}`, color: PANEL.faint, border: `1px solid ${PANEL.border}`, borderRadius: 3, padding: '2px 6px' }}>ESC</span>
        </div>
        <div style={{ overflowY: 'auto', padding: 6 }}>
          {items.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: PANEL.faint, font: `500 13px ${TYPE.body}` }}>No matches.</div>
          ) : items.map((it, i) => {
            const on = i === clampedSel;
            return (
              <div
                key={it.key}
                onMouseEnter={() => setSel(i)}
                onClick={() => run(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 11px', borderRadius: 7, cursor: 'pointer',
                  background: on ? PANEL.hover : 'transparent', position: 'relative',
                }}
              >
                {on && <div style={{ position: 'absolute', left: 0, top: 7, bottom: 7, width: 3, borderRadius: 2, background: PANEL.gold }} />}
                {it.icon
                  ? <Icon name={it.icon} size={16} color={it.color} />
                  : <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}><span style={{ width: 7, height: 7, borderRadius: 2, background: it.color }} /></span>}
                <span style={{ flex: 1, font: `500 13.5px ${TYPE.body}`, color: PANEL.text }}>{it.label}</span>
                <span style={{ font: `600 9px ${TYPE.bodyMono}`, color: PANEL.faint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{it.hint}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, padding: '8px 15px', borderTop: `1px solid ${PANEL.divider}`, font: `500 10px ${TYPE.bodyMono}`, color: PANEL.faint }}>
          <span>↑↓ navigate</span><span>↵ add</span><span>esc close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const Palette = ({ width = 240 }: { width?: number }) => {
  const [tab, setTab] = useState<PaletteTab>('2d');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const tokens = useMemo(() => (q.length === 0 ? [] : q.split(/\s+/).filter(Boolean)), [q]);

  // Per-category collapse state — expanded by default so first-time users
  // see everything. Keyed by category id.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Per-subgroup open state (nested tree). Categories use `collapsed` above;
  // subgroups default closed so the resting view is a compact taxonomy overview.
  const [subOpen, setSubOpen] = useState<Record<string, boolean>>({});
  const [showFavs, setShowFavs] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  usePaletteVersion();
  const insertTypedCard = useCardsStore((s) => s.insertTypedCard);
  const insertRerouteUse = useCardsStore((s) => s.insertRerouteUse);
  const recipe = useCardsStore((s) => s.recipe);
  const activePassId = useCardsStore((s) => s.activePassId);
  const rerouteNames = rerouteDeclNames(getPassCards(recipe, activePassId));
  const [showReroutes, setShowReroutes] = useState(true);
  const insertMacro = useCardsStore((s) => s.insertMacro);
  useMacroVersion();
  const macros = getMacros();
  const [showMacros, setShowMacros] = useState(true);
  const [editMacro, setEditMacro] = useState<string | null>(null);
  const [confirmDelMacro, setConfirmDelMacro] = useState<string | null>(null);
  const removeMacrosByName = useCardsStore((s) => s.removeMacrosByName);

  // Active pool depends on the selected tab. 3D tab merges the REAL 3D card
  // set with the hybrid "looks 3D in 2D maths" set so search hits both, but
  // they're visually grouped under separate subgroup headers below.
  const blocksById = useMemo(() => new Map(BLOCK_LIB.map((b) => [b.id, b])), []);
  const real3dBlocks = useMemo(
    () => REAL_3D_IDS.map((id) => blocksById.get(id)).filter((b): b is BlockDef => b != null),
    [blocksById],
  );
  const hybrid3dBlocks = useMemo(
    () => HYBRID_3D_IDS.map((id) => blocksById.get(id)).filter((b): b is BlockDef => b != null),
    [blocksById],
  );
  const activeBlocks = useMemo(() => {
    if (tab === '2d') return BLOCK_LIB;
    return [...real3dBlocks, ...hybrid3dBlocks];
  }, [tab, real3dBlocks, hybrid3dBlocks]);

  // Flat list shown when searching OR a tag chip is active; otherwise null and
  // the hierarchical view (recents/favorites + categories) renders instead.
  // Recomputed each render (cheap for ~170 blocks) so favorite/recency boosts
  // stay live. Tag-only keeps pool order; a query ranks via scoreBlock.
  const flatList: BlockDef[] | null = (() => {
    if (tokens.length === 0) return null;
    const pool = activeBlocks;
    const favs = new Set(getFavorites());
    const scored: Array<{ b: BlockDef; s: number }> = [];
    for (const b of pool) {
      let s = scoreBlock(b, tokens);
      if (s < 0) continue;
      if (favs.has(b.id)) s += 8;
      scored.push({ b, s });
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.b);
  })();
  // Enter in the search field appends the top result (keyboard-first add).
  const addTop = (): void => {
    const top = flatList?.[0];
    if (top) { insertTypedCard(top.id); pushRecent(top.id); }
  };

  const grouped = useMemo(() => (
    (Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((k) => ({
      k,
      buckets: bucketize(k, BLOCK_LIB.filter((b) => b.cat === k)),
      count: BLOCK_LIB.filter((b) => b.cat === k).length,
    }))
  ), []);

  const resultCount = flatList?.length ?? 0;
  const blocksById2 = blocksById; // alias for fav/recent lookups in the tree
  const favBlocks = getFavorites().map((id) => blocksById2.get(id)).filter((b): b is BlockDef => b != null);
  const recentBlocks = getRecents().map((id) => blocksById2.get(id)).filter((b): b is BlockDef => b != null);

  return (
    <div
      style={{
        width, flex: '0 0 auto',
        background: SHADE.bg,
        borderRight: `1px solid ${SHADE.border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top-level dimension tabs — sit above the search field, full width. */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${SHADE.border}`,
          background: SHADE.bg,
        }}
      >
        <PaletteTabButton label="2D" active={tab === '2d'} onClick={() => setTab('2d')} />
        <PaletteTabButton label="3D" active={tab === '3d'} onClick={() => setTab('3d')} />
        <PaletteTabButton label="Anim" active={tab === 'anim'} onClick={() => setTab('anim')} />
      </div>

      <div style={{ padding: '14px 12px 10px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
            borderRadius: 4, padding: '8px 11px',
          }}
        >
          <Icon name="search" size={14} color={SHADE.textDim} />
          <input
            type="text" placeholder="search blocks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addTop(); }
              else if (e.key === 'Escape') { setQuery(''); }
            }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: SHADE.text,
              font: `500 12.5px ${TYPE.body}`,
              minWidth: 0,
            }}
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Clear"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: SHADE.textFaint, font: `500 9.5px ${TYPE.bodyMono}`,
                padding: '2px 4px',
              }}
            >
              ×
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('shaddy:cmdk'))}
              title="Open command palette (⌘K)"
              style={{
                font: `500 9.5px ${TYPE.bodyMono}`, color: SHADE.textFaint,
                padding: '2px 5px', border: `1px solid ${SHADE.border}`, borderRadius: 2,
                background: 'transparent', cursor: 'pointer',
              }}
            >
              ⌘K
            </button>
          )}
        </div>
        {query.length > 0 && (
          <div
            style={{
              marginTop: 6, padding: '0 2px',
              font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textDim,
              letterSpacing: '0.06em',
            }}
          >
            {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </div>
        )}
      </div>
      <div style={{ padding: '2px 8px 16px', overflowY: 'auto', flex: 1 }}>
        {/* Search flat list */}
        {flatList != null && (
          flatList.length === 0 ? (
            <div
              style={{
                padding: '14px 12px',
                font: `400 12px ${TYPE.body}`, color: SHADE.textDim,
                textAlign: 'center',
              }}
            >
              No blocks match “{query}”.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 2, paddingTop: 4 }}>
              {flatList.map((block) => <PaletteItem key={block.id} block={block} />)}
            </div>
          )
        )}

        {/* Animation tab — the building blocks for custom animations. Drag one
            onto the canvas to start a chain; existing chains are listed below. */}
        {flatList == null && tab === 'anim' && (
          <div style={{ paddingTop: 6 }}>
            <div style={{ font: `400 11px ${TYPE.body}`, color: SHADE.textDim, padding: '2px 4px 11px', lineHeight: 1.5 }}>
              Drag a block onto the canvas to start a signal, chain more after it, then drag its output dot onto a slider — or pick <b style={{ color: SHADE.anim }}>✦ Custom</b> from any slider's ∼ menu.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ANIM_BLOCK_LIST.map((d) => (
                <button
                  key={d.type}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData(PALETTE_DND_MIME, `anim:${d.type}`);
                    e.dataTransfer.setData('text/plain', d.label);
                  }}
                  title={d.description}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '7px 9px', borderRadius: 6, cursor: 'grab', background: SHADE.surface1, border: `1px solid ${SHADE.anim}55` }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', lineHeight: 0, flex: '0 0 auto' }}><Icon name={d.icon} size={15} color={SHADE.anim} /></span>
                  <span style={{ font: `700 11.5px ${TYPE.body}`, color: SHADE.anim, flex: '0 0 auto' }}>{d.label}</span>
                  <span style={{ marginLeft: 'auto', font: `400 10px ${TYPE.body}`, color: SHADE.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</span>
                </button>
              ))}
            </div>
            {(recipe.animations ?? []).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ font: `700 9px ${TYPE.bodyMono}`, color: SHADE.textDim, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 4px 7px' }}>On canvas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(recipe.animations ?? []).map((ch) => (
                    <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', borderRadius: 6, background: SHADE.surface1, border: `1px solid ${SHADE.anim}44` }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={SHADE.anim} strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M3 12q3-6 6 0t6 0 6 0" /></svg>
                      <span style={{ flex: 1, minWidth: 0, font: `700 11.5px ${TYPE.body}`, color: SHADE.anim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
                      <span style={{ font: `600 8px ${TYPE.bodyMono}`, color: SHADE.textFaint, flex: '0 0 auto' }}>{ch.blocks.length}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resting view — nested collapsible tree: Favorites / Recent groups,
            then the category → subgroup → block taxonomy (Outliner-style). */}
        {flatList == null && tab === '2d' && (
          <div style={{ paddingTop: 2 }}>
            {favBlocks.length > 0 && (
              <div>
                <TreeGroupRow
                  depth={0} open={showFavs} onToggle={() => setShowFavs((v) => !v)}
                  label="Favorites" count={favBlocks.length} color={SHADE.gold}
                  glyph={<svg width="12" height="12" viewBox="0 0 24 24" fill={SHADE.gold} stroke={SHADE.goldDeep} strokeWidth="1.5" strokeLinejoin="round"><path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.9l-5.2 2.62.99-5.8-4.21-4.1 5.82-.85z" /></svg>}
                />
                {showFavs && (
                  <div style={{ paddingLeft: 14, paddingBottom: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {favBlocks.map((b) => <PaletteItem key={`fav-${b.id}`} block={b} />)}
                  </div>
                )}
              </div>
            )}
            {recentBlocks.length > 0 && (
              <div>
                <TreeGroupRow
                  depth={0} open={showRecent} onToggle={() => setShowRecent((v) => !v)}
                  label="Recent" count={recentBlocks.length} color={SHADE.textDim}
                  glyph={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SHADE.textDim} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>}
                />
                {showRecent && (
                  <div style={{ paddingLeft: 14, paddingBottom: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {recentBlocks.map((b) => <PaletteItem key={`rec-${b.id}`} block={b} />)}
                  </div>
                )}
              </div>
            )}
            {rerouteNames.length > 0 && (
              <div>
                <TreeGroupRow
                  depth={0} open={showReroutes} onToggle={() => setShowReroutes((v) => !v)}
                  label="Reroutes" count={rerouteNames.length} color={SHADE.reroute}
                  glyph={<span style={{ font: `700 13px ${TYPE.body}`, color: SHADE.reroute, lineHeight: 1 }}>⤻</span>}
                />
                {showReroutes && (
                  <div style={{ paddingLeft: 14, paddingBottom: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {rerouteNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'copy';
                          e.dataTransfer.setData(PALETTE_DND_MIME, `reroute:${name}`);
                          e.dataTransfer.setData('text/plain', name);
                        }}
                        onClick={() => insertRerouteUse(name)}
                        title={`Insert a usage of reroute “${name}” (drag onto canvas to place)`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                          padding: '6px 9px', borderRadius: 6, cursor: 'pointer',
                          background: SHADE.surface1, border: `1px solid ${SHADE.reroute}55`,
                        }}
                      >
                        <span style={{ font: `700 12px ${TYPE.body}`, color: SHADE.reroute, lineHeight: 1, flex: '0 0 auto' }}>⤻</span>
                        <span style={{ font: `700 11.5px ${TYPE.body}`, color: SHADE.rerouteDeep, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                        <span style={{ marginLeft: 'auto', font: `600 8px ${TYPE.bodyMono}`, color: SHADE.textFaint, letterSpacing: '0.14em', textTransform: 'uppercase', flex: '0 0 auto' }}>use</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {macros.length > 0 && (
              <div>
                <TreeGroupRow
                  depth={0} open={showMacros} onToggle={() => setShowMacros((v) => !v)}
                  label="Macros" count={macros.length} color={SHADE.macro}
                  glyph={<span style={{ font: `700 12px ${TYPE.body}`, color: SHADE.macro, lineHeight: 1 }}>▣</span>}
                />
                {showMacros && (
                  <div style={{ paddingLeft: 14, paddingBottom: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {macros.map((m) => (
                      <div
                        key={m.name}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 5px 5px 8px', borderRadius: 6, background: SHADE.surface1, border: `1px solid ${SHADE.macro}55` }}
                      >
                        <span
                          draggable
                          title="Drag onto the canvas to place this macro"
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData(PALETTE_DND_MIME, `macro:${m.name}`);
                            e.dataTransfer.setData('text/plain', m.name);
                          }}
                          style={{ display: 'flex', alignItems: 'center', lineHeight: 0, flex: '0 0 auto', cursor: 'grab' }}
                        ><MacroIcon name={m.icon} size={15} color={SHADE.macro} /></span>
                        <input
                          defaultValue={m.name}
                          title="Rename macro (blur to save)"
                          onBlur={(e) => renameMacro(m.name, e.target.value)}
                          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', font: `700 11.5px ${TYPE.body}`, color: SHADE.macroDeep, letterSpacing: '0.02em' }}
                        />
                        <span style={{ font: `600 8px ${TYPE.bodyMono}`, color: SHADE.textFaint, flex: '0 0 auto' }}>{m.blocks.length}</span>
                        <button type="button" title={`Edit ${m.name}`} onClick={() => setEditMacro(m.name)}
                          style={{ flex: '0 0 auto', width: 18, height: 18, border: 'none', borderRadius: 4, background: 'transparent', color: SHADE.macroDeep, cursor: 'pointer', font: `600 12px ${TYPE.body}`, lineHeight: 0 }}>✎</button>
                        <button type="button" title={`Insert ${m.name}`} onClick={() => { insertMacro(m); pushRecent(`macro:${m.name}`); }}
                          style={{ flex: '0 0 auto', width: 18, height: 18, border: 'none', borderRadius: 4, background: 'transparent', color: SHADE.macro, cursor: 'pointer', font: `700 14px ${TYPE.body}`, lineHeight: 0 }}>＋</button>
                        <button type="button" title="Delete macro" onClick={() => setConfirmDelMacro(m.name)}
                          style={{ flex: '0 0 auto', width: 18, height: 18, border: 'none', borderRadius: 4, background: 'transparent', color: SHADE.textDim, cursor: 'pointer', font: `400 15px ${TYPE.body}`, lineHeight: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {editMacro && (
              <MacroEditModal
                name={editMacro}
                onClose={() => setEditMacro(null)}
              />
            )}
            {confirmDelMacro && (
              <MacroDeleteConfirm
                name={confirmDelMacro}
                instanceCount={countMacroInstances(recipe, confirmDelMacro)}
                onCancel={() => setConfirmDelMacro(null)}
                onConfirm={() => {
                  removeMacrosByName(confirmDelMacro);
                  deleteMacro(confirmDelMacro);
                  setConfirmDelMacro(null);
                }}
              />
            )}
            {(favBlocks.length > 0 || recentBlocks.length > 0 || rerouteNames.length > 0 || macros.length > 0) && (
              <div style={{ height: 1, background: SHADE.border, opacity: 0.5, margin: '7px 9px 5px' }} />
            )}
            {grouped.map(({ k, buckets, count }) => {
              const catOpen = !(collapsed[k] ?? false);
              const cat = CATEGORIES[k];
              return (
                <div key={k}>
                  <TreeGroupRow
                    depth={0} open={catOpen} color={cat.color}
                    label={cat.label} count={count}
                    glyph={<Icon name={cat.icon} size={13} color={cat.color} />}
                    onToggle={() => setCollapsed((prev) => ({ ...prev, [k]: catOpen }))}
                  />
                  {catOpen && buckets.map(({ label, blocks }) => {
                    const subKey = `${k}::${label}`;
                    const subO = subOpen[subKey] ?? false;
                    return (
                      <div key={label}>
                        <TreeGroupRow
                          depth={1} open={subO} color={cat.color}
                          label={label} count={blocks.length}
                          onToggle={() => setSubOpen((prev) => ({ ...prev, [subKey]: !subO }))}
                        />
                        {subO && (
                          <div style={{ paddingLeft: 30, paddingBottom: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {blocks.map((b) => <PaletteItem key={b.id} block={b} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* 3D tab — real raymarched SDF cards on top, the existing 2D
            "looks 3D" cards still visible below for compatibility. */}
        {flatList == null && tab === '3d' && (
          <div style={{ padding: '4px 4px 0' }}>
            <div
              style={{
                margin: '4px 4px 10px',
                padding: '2px 0',
                font: `700 11px ${TYPE.body}`,
                color: SHADE.text,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              3D raymarching
            </div>
            <PaletteSubgroupHeader label="SDF scene cards" count={real3dBlocks.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
              {real3dBlocks.map((b) => <PaletteItem key={b.id} block={b} />)}
            </div>

            {hybrid3dBlocks.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <PaletteSubgroupHeader
                  label="Hybrid cards that fake 3D"
                  count={hybrid3dBlocks.length}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
                  {hybrid3dBlocks.map((b) => <PaletteItem key={b.id} block={b} />)}
                </div>
              </div>
            )}

            {/* Soft-info panel — quiet, not loud. */}
            <div
              style={{
                marginTop: 18,
                padding: '11px 12px',
                background: SHADE.surface1,
                border: `1px dashed ${SHADE.border}`,
                borderRadius: 4,
                color: SHADE.textDim,
                font: `500 11px ${TYPE.body}`,
                lineHeight: 1.45,
                letterSpacing: '0.01em',
              }}
            >
              <div
                style={{
                  font: `700 9.5px ${TYPE.bodyMono}`,
                  color: SHADE.textFaint,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Heads up
              </div>
              Inserting an SDF card auto-flips the recipe to 3D mode. Toggle back via
              the mode pill in the Properties panel.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Charismatic slider — chunky square handle + tick marks, no glow ────
export const PropertySlider = ({
  label, value, unit = '', animated = false, onChange,
}: {
  label: string; value: number; unit?: string; animated?: boolean;
  onChange?: (v: number) => void;
}) => {
  const [t, setT] = useState(value);
  useEffect(() => {
    if (!animated) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const dt = (performance.now() - start) / 1000;
      setT(0.5 + 0.4 * Math.sin(dt * 1.6));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  useEffect(() => { if (!animated) setT(value); }, [value, animated]);
  const v = animated ? t : value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span
          style={{
            font: `600 9px ${TYPE.bodyMono}`, color: SHADE.textDim,
            letterSpacing: '0.16em', textTransform: 'uppercase',
          }}
        >
          {label}
          {animated && (
            <span style={{ marginLeft: 8, color: SHADE.ember, font: `500 9px ${TYPE.bodyMono}`, letterSpacing: '0.18em' }}>
              ANIM
            </span>
          )}
        </span>
        <span style={{ font: `500 11px ${TYPE.bodyMono}`, color: animated ? SHADE.ember : SHADE.text }}>
          {v.toFixed(3)}{unit}
        </span>
      </div>
      <SliderRail value={v} animated={animated} onChange={onChange} />
    </div>
  );
};

// The slider rail itself — extracted so blocks/mobile/editor share the look.
export const SliderRail = ({
  value, animated = false, onChange, height = 6,
}: { value: number; animated?: boolean; onChange?: (v: number) => void; height?: number }) => {
  const v = Math.max(0, Math.min(1, value));
  const handleSize = 16;
  const draggingRef = useRef(false);
  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onChange(Math.max(0, Math.min(1, x)));
  };
  return (
    <div
      onPointerDown={(e) => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onPointer(e);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        onPointer(e);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={(e) => {
        draggingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      style={{
        position: 'relative', height: handleSize + 4,
        cursor: onChange ? 'pointer' : 'default',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* rail base */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0,
          top: (handleSize + 4 - height) / 2,
          height,
          background: SHADE.surface3,
          border: `1px solid ${SHADE.border}`,
          borderRadius: 1,
        }}
      />
      {/* tick marks at 0/25/50/75/100 */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <div
          key={p}
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `calc(${p * 100}% - 0.5px)`,
            width: 1, background: p === 0.5 ? SHADE.textDim : SHADE.border,
            opacity: p === 0 || p === 1 ? 0 : 0.55,
          }}
        />
      ))}
      {/* filled portion */}
      <div
        style={{
          position: 'absolute', left: 0,
          top: (handleSize + 4 - height) / 2,
          height,
          width: `${v * 100}%`,
          background: animated
            ? `repeating-linear-gradient(45deg, ${SHADE.ember} 0 4px, ${SHADE.goldDeep} 4px 8px)`
            : SHADE.inkLine,
          borderTopLeftRadius: 1, borderBottomLeftRadius: 1,
        }}
      />
      {/* chunky handle — square with rounded corners, no glow */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${v * 100}% - ${handleSize / 2}px)`,
          top: 2,
          width: handleSize, height: handleSize,
          background: SHADE.surface1,
          border: `1.5px solid ${animated ? SHADE.ember : SHADE.inkLine}`,
          borderRadius: 3,
        }}
      >
        {/* grip lines for tactile feel */}
        <span style={{ position: 'absolute', left: 4, right: 4, top: 5,  height: 1, background: SHADE.textDim, opacity: 0.6 }} />
        <span style={{ position: 'absolute', left: 4, right: 4, top: 8,  height: 1, background: SHADE.textDim, opacity: 0.6 }} />
        <span style={{ position: 'absolute', left: 4, right: 4, top: 11, height: 1, background: SHADE.textDim, opacity: 0.6 }} />
      </div>
    </div>
  );
};

export const PropSectionHeader = ({ title, right }: { title: string; right?: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 7px' }}>
    <span
      style={{
        font: `700 9px ${TYPE.bodyMono}`,
        color: SHADE.textDim,
        letterSpacing: '0.16em', textTransform: 'uppercase',
      }}
    >
      {title}
    </span>
    {right}
  </div>
);

// ─── Workspace bg — graph-paper instead of dot grid for a hand-drawn feel ─
export const DotGridBg = () => (
  <div
    style={{
      position: 'absolute', inset: 0,
      background: `
        linear-gradient(${SHADE.border} 1px, transparent 1px),
        linear-gradient(90deg, ${SHADE.border} 1px, transparent 1px)
      `,
      backgroundSize: '32px 32px, 32px 32px',
      backgroundPosition: '-1px -1px, -1px -1px',
      opacity: 0.35,
      pointerEvents: 'none',
    }}
  />
);

export const CanvasToolBtn = ({ icon, title }: { icon: string; title: string }) => (
  <button
    title={title}
    style={{
      width: 28, height: 28, borderRadius: 3,
      background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
      color: SHADE.textDim, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <Icon name={icon} size={14} color={SHADE.textDim} />
  </button>
);

export const fullscreenBtnStyle: CSSProperties = {
  width: 24, height: 24, borderRadius: 3,
  border: `1px solid ${SHADE.border}`,
  background: 'transparent', color: SHADE.textDim, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
