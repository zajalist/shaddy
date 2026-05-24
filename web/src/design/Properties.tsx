// Properties panel — the right column below the preview.
//
// Wired to the real Recipe: when a TypedCard is selected, this renders that
// card's real params (min..max float ranges + color swatches) and pushes
// changes through useCardsStore.updateParamValue. When nothing is selected,
// shows the global panel (canvas aspect, tempo, share).

import { useState } from 'react';
import type { ReactNode } from 'react';
import { RgbColorPicker } from 'react-colorful';

import {
  BLEND_MODES,
  lookupCardDef,
  useCardsStore,
  type BlendMode,
  type Card,
  type CardDef,
  type ColorRgb,
  type TypedCard,
} from '@/cards';

import { CATEGORIES, SHADE, TYPE } from './tokens';
import type { CategoryKey } from './tokens';
import { Icon } from './icons';
import { PropSectionHeader, PropertySlider } from './components';
import { categoryToBlock, normalizedToParam, paramToNormalized } from './card-adapter';

export type PropertiesPanelProps = {
  /** The currently-selected card, or null for the global panel. */
  selectedCard: Card | null;
  /** Index of the selected card in recipe.cards (used for display only). */
  selectedIndex: number;
};

export const PropertiesPanel = ({ selectedCard, selectedIndex }: PropertiesPanelProps) => (
  <div
    style={{
      flex: '1 1 auto',
      background: SHADE.surface2,
      display: 'flex', flexDirection: 'column',
      overflow: 'auto', minHeight: 0,
    }}
  >
    {selectedCard ? (
      <SelectedCardProps card={selectedCard} index={selectedIndex} />
    ) : (
      <GlobalProps />
    )}
  </div>
);

// ─── Selected card props ───────────────────────────────────────────────

const SelectedCardProps = ({ card, index }: { card: Card; index: number }) => {
  if (card.kind === 'wildcard') {
    return <WildcardProps card={card} index={index} />;
  }
  const def = lookupCardDef(card.type);
  if (!def) {
    return (
      <>
        <PropSectionHeader title="Unknown card" />
        <div style={{ padding: '0 14px 14px', color: SHADE.textDim, font: `400 12px ${TYPE.body}` }}>
          Card type <code>{card.type}</code> not in library.
        </div>
      </>
    );
  }
  return <TypedCardProps card={card} def={def} index={index} />;
};

const CardHeader = ({
  cat, title, blockIdx,
}: {
  cat: CategoryKey;
  title: string;
  blockIdx: number;
}) => {
  const catInfo = CATEGORIES[cat];
  return (
    <div
      style={{
        padding: '14px 14px',
        borderBottom: `1px solid ${SHADE.border}`,
        display: 'flex', alignItems: 'center', gap: 11,
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${catInfo.color}1f`,
          border: `1px solid ${catInfo.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={catInfo.icon} size={20} color={catInfo.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `600 15px ${TYPE.body}`, color: SHADE.text, letterSpacing: '-0.01em' }}>
          {title}
        </div>
        <div
          style={{
            font: `500 10px ${TYPE.bodyMono}`,
            color: SHADE.textDim, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >
          {catInfo.label.replace(/s$/, '')} · block {String(blockIdx + 1).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

// ─── Composition controls (blend mode + opacity) ──────────────────────

const BLEND_LABELS: Record<BlendMode, string> = {
  normal: 'Normal', add: 'Add', multiply: 'Multiply',
  screen: 'Screen', lighten: 'Lighten', darken: 'Darken',
};

const CompositionControls = ({ card }: { card: Card }) => {
  const setAlpha = useCardsStore((s) => s.setAlpha);
  const setBlendMode = useCardsStore((s) => s.setBlendMode);
  const alpha = card.alpha ?? 1;
  const blend: BlendMode = card.blendMode ?? 'normal';
  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${SHADE.border}`,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div>
        <div
          style={{
            font: `700 10px ${TYPE.body}`,
            color: SHADE.textDim, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 7,
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
                  borderRadius: 3,
                  background: active ? SHADE.gold : 'transparent',
                  color: active ? '#1a1208' : SHADE.textDim,
                  border: `1px solid ${active ? SHADE.goldDeep : SHADE.border}`,
                  font: `600 10px ${TYPE.bodyMono}`,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {BLEND_LABELS[mode]}
              </button>
            );
          })}
        </div>
      </div>
      <PropertySlider
        label="opacity"
        value={alpha}
        onChange={(n) => setAlpha(card.id, n)}
      />
    </div>
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
      <CardHeader cat={cat} title={def.friendlyName} blockIdx={index} />
      <CardActions cardId={card.id} />
      <CompositionControls card={card} />
      <div style={{ padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {entries.length === 0 ? (
          <div style={{ color: SHADE.textDim, font: `400 12px ${TYPE.body}` }}>
            No parameters.
          </div>
        ) : (
          entries.map(([key, p]) => {
            const live = card.params[key]?.value ?? p.default;
            if (p.kind === 'float') {
              const norm = paramToNormalized(live as number, p);
              return (
                <PropertySlider
                  key={key}
                  label={p.label}
                  value={norm}
                  // The PropertySlider shows the 0..1 normalized number; for the
                  // typed-param feel, we override the display to show the real
                  // range value via a wrapping div. Simpler: use the existing
                  // slider but pass a custom unit that includes the real value
                  // breakdown — instead, we just trust the SliderRail and
                  // recompute when the user drags.
                  onChange={(n) => {
                    const next = normalizedToParam(n, p);
                    updateParamValue(card.id, key, next);
                  }}
                />
              );
            }
            if (p.kind === 'select') {
              const liveNum = live as number;
              return (
                <SelectParamRow
                  key={key}
                  label={p.label}
                  value={liveNum}
                  options={p.options}
                  onChange={(n) => updateParamValue(card.id, key, n)}
                />
              );
            }
            // color
            const v = live as ColorRgb;
            return (
              <ColorParamRow
                key={key}
                label={p.label}
                value={v}
                onChange={(c) => updateParamValue(card.id, key, c)}
              />
            );
          })
        )}
      </div>
    </>
  );
};

// ─── Select param dropdown ─────────────────────────────────────────────

const SelectParamRow = ({
  label, value, options, onChange,
}: {
  label: string;
  value: number;
  options: ReadonlyArray<{ value: number; label: string }>;
  onChange: (v: number) => void;
}) => {
  const current = options.find((o) => o.value === value);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span
          style={{
            font: `600 10.5px ${TYPE.body}`, color: SHADE.textDim,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span style={{ font: `500 12px ${TYPE.bodyMono}`, color: SHADE.text }}>
          {current?.label ?? String(value)}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          background: SHADE.surface1,
          border: `1.5px solid ${SHADE.inkLine}`,
          borderRadius: 3,
        }}
      >
        <select
          value={String(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            background: 'transparent',
            border: 'none',
            color: SHADE.text,
            font: `500 12.5px ${TYPE.bodyMono}`,
            padding: '8px 28px 8px 10px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
        {/* Chevron — purely visual, the native <select> handles input. */}
        <span
          aria-hidden
          style={{
            position: 'absolute', right: 8, top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            width: 6, height: 6,
            borderRight: `1.5px solid ${SHADE.textDim}`,
            borderBottom: `1.5px solid ${SHADE.textDim}`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

// ─── Card actions row (duplicate + delete) ─────────────────────────────

const CardActions = ({ cardId }: { cardId: string }) => {
  const duplicateCard = useCardsStore((s) => s.duplicateCard);
  const removeCard = useCardsStore((s) => s.removeCard);
  const [confirmDel, setConfirmDel] = useState(false);

  const onDuplicate = () => duplicateCard(cardId);
  const onDeleteClick = () => {
    if (confirmDel) {
      removeCard(cardId);
      setConfirmDel(false);
    } else {
      setConfirmDel(true);
      // Auto-cancel after a short window so a stale "armed" state can't
      // surprise the user later.
      window.setTimeout(() => setConfirmDel(false), 2600);
    }
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderBottom: `1px solid ${SHADE.border}`,
      }}
    >
      <ActionButton onClick={onDuplicate} title="Duplicate card">
        <Icon name="b-feedback" size={13} color={SHADE.textDim} />
        <span>Duplicate</span>
      </ActionButton>
      <div style={{ flex: 1 }} />
      {confirmDel ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            font: `600 10px ${TYPE.bodyMono}`, color: '#8a2222',
            letterSpacing: '0.10em', textTransform: 'uppercase', marginRight: 4,
          }}>
            delete?
          </span>
          <ActionButton onClick={onDeleteClick} tint="danger" title="Confirm delete">
            <span>Yes</span>
          </ActionButton>
          <ActionButton onClick={() => setConfirmDel(false)} title="Cancel">
            <span>No</span>
          </ActionButton>
        </div>
      ) : (
        <ActionButton onClick={onDeleteClick} tint="danger" title="Delete card">
          <Icon name="trash" size={13} color="#8a2222" />
          <span>Delete</span>
        </ActionButton>
      )}
    </div>
  );
};

const ActionButton = ({
  onClick, title, tint, children,
}: {
  onClick: () => void;
  title: string;
  tint?: 'danger';
  children: ReactNode;
}) => {
  const isDanger = tint === 'danger';
  const fg = isDanger ? '#8a2222' : SHADE.textDim;
  const border = isDanger ? '#8a222255' : SHADE.border;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span
          style={{
            font: `600 10.5px ${TYPE.body}`, color: SHADE.textDim,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span style={{ font: `500 12px ${TYPE.bodyMono}`, color: SHADE.text }}>{hex}</span>
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', height: 32, borderRadius: 3,
          background: hex,
          border: `1.5px solid ${SHADE.inkLine}`,
          cursor: 'pointer', display: 'block',
        }}
        aria-label={`${label} colour`}
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
      <CardHeader cat="effect" title={card.displayName ?? 'Custom code'} blockIdx={index} />
      <CardActions cardId={card.id} />
      <CompositionControls card={card} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div
          style={{
            font: `700 10px ${TYPE.bodyMono}`,
            color: SHADE.textDim, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 8,
          }}
        >
          Custom GLSL
        </div>
        <textarea
          value={card.rawSource}
          onChange={(e) => onSourceChange(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%', minHeight: 180, resize: 'vertical',
            font: `500 12px ${TYPE.bodyMono}`,
            color: SHADE.cream, background: SHADE.surface4,
            border: `1px solid ${SHADE.border}`, borderRadius: 3,
            padding: '10px 12px', lineHeight: 1.5,
          }}
        />
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

const GlobalProps = () => {
  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);
  return (
    <>
      <PropSectionHeader title="Properties" />
      <div style={{ padding: '2px 14px 14px', font: `400 12px ${TYPE.body}`, color: SHADE.textDim, lineHeight: 1.55 }}>
        Select a block in the canvas to edit it. Or set global tempo + output below.
      </div>
      <div style={{ borderTop: `1px solid ${SHADE.border}` }} />
      <PropSectionHeader title="Recipe" />
      <div style={{ padding: '0 14px 14px', font: `500 12px ${TYPE.bodyMono}`, color: SHADE.text }}>
        {recipe.cards.length} card{recipe.cards.length === 1 ? '' : 's'}
        <span style={{ color: SHADE.textDim, marginLeft: 8 }}>· {recipe.canvasAspect}</span>
      </div>
      <div style={{ borderTop: `1px solid ${SHADE.border}` }} />
      <PropSectionHeader title="Tempo" />
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ font: `600 38px ${TYPE.display}`, color: SHADE.text, lineHeight: 1, letterSpacing: TYPE.trackTighter }}>
            120
            <span style={{ color: SHADE.textDim, fontSize: 14, marginLeft: 8, fontWeight: 500, letterSpacing: 0 }}>bpm</span>
          </span>
          <button
            style={{
              background: SHADE.surface1, color: SHADE.text,
              border: `1px solid ${SHADE.border}`, borderRadius: 6,
              padding: '7px 12px', font: `500 11px ${TYPE.bodyMono}`,
              letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            tap
          </button>
        </div>
        <PropertySlider label="Tempo" value={0.5} />
      </div>
      <div style={{ borderTop: `1px solid ${SHADE.border}` }} />
      <PropSectionHeader title="Output" />
      <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {ASPECTS.map((a) => {
          const active = recipe.canvasAspect === a.key;
          return (
            <button
              key={a.key}
              onClick={() => setRecipe({ ...recipe, canvasAspect: a.key })}
              style={{
                background: active ? SHADE.surface3 : SHADE.surface1,
                border: `1px solid ${active ? SHADE.borderHi : SHADE.border}`,
                borderRadius: 7, padding: '9px 10px',
                font: `500 11px ${TYPE.bodyMono}`,
                color: active ? SHADE.text : SHADE.textDim,
                textAlign: 'left', cursor: 'pointer',
              }}
            >
              {a.label}
            </button>
          );
        })}
        <div
          style={{
            background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
            borderRadius: 7, padding: '9px 10px',
            font: `500 11px ${TYPE.bodyMono}`, color: SHADE.textFaint,
            textAlign: 'left',
          }}
        >
          3840×2160
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${SHADE.border}` }} />
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
          borderTop: `1px solid ${SHADE.border}`,
          padding: '10px 14px',
          font: `500 9.5px ${TYPE.bodyMono}`,
          color: SHADE.textFaint, letterSpacing: '0.14em',
          display: 'flex', justifyContent: 'space-between',
        }}
      >
        <span>WEBGL · OK</span>
        <span>v0.4.2</span>
      </div>
    </>
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
