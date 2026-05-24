// BlockEditor — modal opened by double-clicking a chain block.
//
// Edits the REAL TypedCard (or WildcardCard) params via the cards store.
// Float params use the existing SliderRail (0..1 normalized) wrapped with a
// real-range mapping; color params get a click-to-pick swatch (react-colorful);
// wildcard cards get a textarea for their raw GLSL.

import { useEffect, useMemo, useRef, useState } from 'react';
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
  type MediaSourceRef,
  type ParamDef,
  type TypedCard,
  type WildcardCard,
} from '@/cards';

import { CATEGORIES, SHADE, TYPE } from './tokens';
import type { CategoryKey } from './tokens';
import { Icon } from './icons';
import { SliderRail } from './components';
import { categoryToBlock, normalizedToParam, paramToNormalized } from './card-adapter';
import { useIsMobile } from './useIsMobile';

export type BlockEditorProps = {
  card: Card;
  onClose: () => void;
};

export const BlockEditor = ({ card, onClose }: BlockEditorProps) => {
  if (card.kind === 'wildcard') {
    return <WildcardEditor card={card} onClose={onClose} />;
  }
  const def = lookupCardDef(card.type);
  if (!def) {
    return (
      <Modal onClose={onClose}>
        <div style={{ padding: 24, color: SHADE.text }}>
          Unknown card type: <code>{card.type}</code>
        </div>
      </Modal>
    );
  }
  return <TypedEditor card={card} def={def} onClose={onClose} />;
};

const Modal = ({ onClose, children }: { onClose: () => void; children: ReactNode }) => {
  const isMobile = useIsMobile();
  return (
    <div
      role="dialog"
      style={{
        position: 'absolute', inset: 0,
        background: isMobile ? SHADE.bg : 'rgba(15, 18, 26, 0.45)',
        backdropFilter: isMobile ? undefined : 'blur(4px)',
        display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 32, zIndex: 30,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : 'min(920px, 96%)',
          maxHeight: isMobile ? '100%' : '92%',
          height: isMobile ? '100%' : 'auto',
          background: SHADE.bg,
          border: isMobile ? 'none' : `1px solid ${SHADE.inkLine}`,
          borderRadius: isMobile ? 0 : 4,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Header = ({
  cat, title, paramCount, onReset, onClose, cardId,
}: {
  cat: CategoryKey;
  title: string;
  paramCount: number;
  onReset?: () => void;
  onClose: () => void;
  /** When provided, renders Duplicate + Delete buttons that mutate the
   *  store. Delete uses a tiny double-click "delete? · yes · no" pattern. */
  cardId?: string;
}) => {
  const catInfo = CATEGORIES[cat];
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${SHADE.border}`,
        background: SHADE.surface2,
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: catInfo.color }} />
      <div
        style={{
          width: 42, height: 42, borderRadius: 4,
          background: `${catInfo.color}1c`, border: `1px solid ${catInfo.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={catInfo.icon} size={22} color={catInfo.color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ font: `700 20px ${TYPE.display}`, color: SHADE.text, letterSpacing: TYPE.trackTight }}>
          {title}
        </div>
        <div
          style={{
            font: `600 10px ${TYPE.bodyMono}`, color: SHADE.textDim,
            letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4,
          }}
        >
          {catInfo.label} · {paramCount} param{paramCount === 1 ? '' : 's'}
        </div>
      </div>
      {cardId && <EditorCardActions cardId={cardId} onClose={onClose} />}
      {onReset && (
        <button
          onClick={onReset}
          style={{
            padding: '7px 12px', borderRadius: 3,
            background: 'transparent', border: `1px solid ${SHADE.border}`,
            color: SHADE.textDim, cursor: 'pointer',
            font: `500 11px ${TYPE.bodyMono}`,
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}
        >
          Reset
        </button>
      )}
      <button
        onClick={onClose}
        style={{
          width: 34, height: 34, borderRadius: 3,
          background: 'transparent', border: `1px solid ${SHADE.border}`,
          color: SHADE.textDim, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="close" size={14} color={SHADE.textDim} />
      </button>
    </div>
  );
};

// ─── Editor card-actions (duplicate + delete) ─────────────────────────

const EditorCardActions = ({
  cardId, onClose,
}: { cardId: string; onClose: () => void }) => {
  const duplicateCard = useCardsStore((s) => s.duplicateCard);
  const removeCard = useCardsStore((s) => s.removeCard);
  const [confirmDel, setConfirmDel] = useState(false);

  const onDuplicate = () => {
    duplicateCard(cardId);
    // Keep the modal open on the original card — duplicating is a "make me
    // another one to tweak later" gesture, not a "switch focus" gesture.
  };
  const onDeleteClick = () => {
    if (confirmDel) {
      removeCard(cardId);
      setConfirmDel(false);
      onClose();
    } else {
      setConfirmDel(true);
      window.setTimeout(() => setConfirmDel(false), 2600);
    }
  };

  const baseBtn = {
    padding: '7px 10px', borderRadius: 3,
    background: 'transparent',
    cursor: 'pointer',
    font: `600 10.5px ${TYPE.bodyMono}`,
    letterSpacing: '0.10em', textTransform: 'uppercase' as const,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={onDuplicate}
        title="Duplicate card"
        style={{
          ...baseBtn,
          border: `1px solid ${SHADE.border}`,
          color: SHADE.textDim,
        }}
      >
        <Icon name="b-feedback" size={13} color={SHADE.textDim} />
        Duplicate
      </button>
      {confirmDel ? (
        <>
          <span style={{
            font: `600 10px ${TYPE.bodyMono}`, color: '#8a2222',
            letterSpacing: '0.10em', textTransform: 'uppercase', margin: '0 4px',
          }}>
            delete?
          </span>
          <button
            onClick={onDeleteClick}
            title="Confirm delete"
            style={{ ...baseBtn, border: '1px solid #8a222255', color: '#8a2222' }}
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDel(false)}
            title="Cancel"
            style={{ ...baseBtn, border: `1px solid ${SHADE.border}`, color: SHADE.textDim }}
          >
            No
          </button>
        </>
      ) : (
        <button
          onClick={onDeleteClick}
          title="Delete card"
          style={{ ...baseBtn, border: '1px solid #8a222255', color: '#8a2222' }}
        >
          <Icon name="trash" size={13} color="#8a2222" />
          Delete
        </button>
      )}
    </div>
  );
};

const Footer = ({ onClose }: { onClose: () => void }) => (
  <div
    style={{
      padding: '12px 20px',
      borderTop: `1px solid ${SHADE.border}`,
      background: SHADE.surface2,
      display: 'flex', alignItems: 'center', gap: 12,
    }}
  >
    <span style={{ font: `500 10.5px ${TYPE.bodyMono}`, color: SHADE.textFaint, letterSpacing: '0.18em' }}>
      CHANGES SAVE LIVE
    </span>
    <button
      onClick={onClose}
      style={{
        marginLeft: 'auto',
        padding: '8px 18px', borderRadius: 3,
        background: SHADE.inkLine, color: SHADE.surface1,
        border: 'none', cursor: 'pointer',
        font: `600 11.5px ${TYPE.body}`,
        letterSpacing: '0.10em', textTransform: 'uppercase',
      }}
    >
      Done
    </button>
  </div>
);

// ─── Composition controls (blend + opacity) ────────────────────────────

const BLEND_LABELS: Record<BlendMode, string> = {
  normal: 'Normal', add: 'Add', multiply: 'Multiply',
  screen: 'Screen', lighten: 'Lighten', darken: 'Darken',
};

const EditorCompositionControls = ({ card }: { card: Card }) => {
  const setAlpha = useCardsStore((s) => s.setAlpha);
  const setBlendMode = useCardsStore((s) => s.setBlendMode);
  const alpha = card.alpha ?? 1;
  const blend: BlendMode = card.blendMode ?? 'normal';
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: 14, borderRadius: 4,
        background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
      }}
    >
      <div>
        <div
          style={{
            font: `700 10.5px ${TYPE.body}`,
            color: SHADE.textDim, letterSpacing: '0.16em',
            textTransform: 'uppercase', marginBottom: 8,
          }}
        >
          Blend
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
          {BLEND_MODES.map((mode) => {
            const active = mode === blend;
            return (
              <button
                key={mode}
                onClick={() => setBlendMode(card.id, mode)}
                style={{
                  padding: '7px 4px',
                  borderRadius: 3,
                  background: active ? SHADE.gold : 'transparent',
                  color: active ? '#1a1208' : SHADE.textDim,
                  border: `1px solid ${active ? SHADE.goldDeep : SHADE.border}`,
                  font: `600 10px ${TYPE.bodyMono}`,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {BLEND_LABELS[mode]}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
          <span
            style={{
              font: `700 11px ${TYPE.body}`,
              color: SHADE.text, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}
          >
            Opacity
          </span>
          <span style={{ marginLeft: 'auto', font: `500 13px ${TYPE.bodyMono}`, color: SHADE.text }}>
            {alpha.toFixed(2)}
          </span>
        </div>
        <SliderRail value={alpha} onChange={(n) => setAlpha(card.id, n)} height={6} />
      </div>
    </div>
  );
};

// ─── Typed card editor ─────────────────────────────────────────────────

const TypedEditor = ({
  card, def, onClose,
}: { card: TypedCard; def: CardDef; onClose: () => void }) => {
  const updateParamValue = useCardsStore((s) => s.updateParamValue);
  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);
  const cat = categoryToBlock(def.category);
  const entries = useMemo(() => Object.entries(def.params), [def]);

  const resetAll = () => {
    setRecipe({
      ...recipe,
      cards: recipe.cards.map((c) => {
        if (c.id !== card.id || c.kind !== 'typed') return c;
        const freshParams: TypedCard['params'] = {};
        for (const [k, p] of Object.entries(def.params)) {
          const v = (p.kind === 'image' || p.kind === 'video')
            ? (p.default ?? '')
            : p.default;
          freshParams[k] = { value: v, animation: null, sourceRef: null };
        }
        return { ...c, params: freshParams };
      }),
    });
  };

  return (
    <Modal onClose={onClose}>
      <Header
        cat={cat}
        title={def.friendlyName}
        paramCount={entries.length}
        onReset={resetAll}
        onClose={onClose}
        cardId={card.id}
      />
      <div
        style={{
          flex: 1, minHeight: 0,
          padding: '16px 20px 20px',
          display: 'flex', flexDirection: 'column', gap: 18,
          overflow: 'auto',
        }}
      >
        <EditorCompositionControls card={card} />
        {def.description && (
          <div
            style={{
              font: `400 12.5px ${TYPE.body}`, color: SHADE.textDim,
              lineHeight: 1.5,
            }}
          >
            {def.description}
          </div>
        )}
        {entries.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              border: `1px dashed ${SHADE.border}`,
              borderRadius: 4,
              color: SHADE.textDim,
              font: `500 12px ${TYPE.body}`,
              textAlign: 'center',
            }}
          >
            No parameters for this card.
          </div>
        ) : (
          entries.map(([key, p]) => (
            <ParamRow
              key={key}
              paramKey={key}
              def={p}
              card={card}
              onChange={(v) => updateParamValue(card.id, key, v)}
            />
          ))
        )}
      </div>
      <Footer onClose={onClose} />
    </Modal>
  );
};

const ParamRow = ({
  paramKey, def, card, onChange,
}: {
  paramKey: string;
  def: ParamDef;
  card: TypedCard;
  onChange: (v: number | ColorRgb) => void;
}) => {
  const live = card.params[paramKey]?.value ?? def.default;
  if (def.kind === 'float') {
    const value = live as number;
    const norm = paramToNormalized(value, def);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
          <span
            style={{
              font: `700 11px ${TYPE.body}`,
              color: SHADE.text, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}
          >
            {def.label}
          </span>
          <span style={{ marginLeft: 8, font: `400 10px ${TYPE.bodyMono}`, color: SHADE.textFaint }}>
            {def.min} – {def.max}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              font: `500 13px ${TYPE.bodyMono}`,
              color: SHADE.text,
            }}
          >
            {value.toFixed(stepDigits(def.step))}
          </span>
        </div>
        <SliderRail
          value={norm}
          onChange={(n) => onChange(normalizedToParam(n, def))}
          height={6}
        />
      </div>
    );
  }
  if (def.kind === 'select') {
    const value = live as number;
    const current = def.options.find((o) => o.value === value);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
          <span
            style={{
              font: `700 11px ${TYPE.body}`,
              color: SHADE.text, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}
          >
            {def.label}
          </span>
          <span style={{ marginLeft: 8, font: `400 10px ${TYPE.bodyMono}`, color: SHADE.textFaint }}>
            {def.options.length} option{def.options.length === 1 ? '' : 's'}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              font: `500 13px ${TYPE.bodyMono}`,
              color: SHADE.text,
            }}
          >
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
              font: `500 13px ${TYPE.bodyMono}`,
              padding: '9px 28px 9px 12px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {def.options.map((o) => (
              <option key={o.value} value={String(o.value)}>{o.label}</option>
            ))}
          </select>
          <span
            aria-hidden
            style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-65%) rotate(45deg)',
              width: 7, height: 7,
              borderRight: `1.5px solid ${SHADE.textDim}`,
              borderBottom: `1.5px solid ${SHADE.textDim}`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    );
  }
  if (def.kind === 'image') {
    return (
      <EditorImageRow
        label={def.label}
        cardId={card.id}
        paramKey={paramKey}
        liveValue={(card.params[paramKey]?.value as string | undefined) ?? ''}
      />
    );
  }
  if (def.kind === 'video') {
    return (
      <EditorVideoRow
        label={def.label}
        cardId={card.id}
        paramKey={paramKey}
        liveValue={(card.params[paramKey]?.value as string | undefined) ?? ''}
      />
    );
  }
  // color
  const v = live as ColorRgb;
  return <ColorRow label={def.label} value={v} onChange={onChange} />;
};

// ─── Image / video param rows (modal flavour) ──────────────────────────

const EditorImageRow = ({
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
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{
          font: `700 11px ${TYPE.body}`,
          color: SHADE.text, letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{ marginLeft: 'auto', font: `500 11px ${TYPE.bodyMono}`, color: SHADE.textFaint }}>
          {thumb ? 'loaded' : 'empty'}
        </span>
      </div>
      {thumb && (
        <img
          src={thumb}
          alt={label}
          style={{
            width: '100%', maxHeight: 240, objectFit: 'contain',
            borderRadius: 3, border: `1px solid ${SHADE.border}`, marginBottom: 10,
            background: SHADE.surface4,
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
          width: '100%', padding: '10px 12px',
          background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
          color: SHADE.text, borderRadius: 3,
          font: `700 11px ${TYPE.body}`,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {thumb ? 'Replace image' : 'Choose image…'}
      </button>
    </div>
  );
};

const EditorVideoRow = ({
  label, cardId, paramKey, liveValue,
}: {
  label: string;
  cardId: string;
  paramKey: string;
  liveValue: string;
}) => {
  const setParamSource = useCardsStore((s) => s.setParamSource);
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
    setParamSource(cardId, paramKey, '', null);
  };

  useEffect(() => () => {
    const s = streamRef.current;
    if (s) for (const t of s.getTracks()) t.stop();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{
          font: `700 11px ${TYPE.body}`,
          color: SHADE.text, letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          marginLeft: 'auto', font: `500 11px ${TYPE.bodyMono}`,
          color: active ? SHADE.gold : SHADE.textFaint,
        }}>
          {active ? 'live' : 'stopped'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => (active ? stop() : void start())}
        style={{
          width: '100%', padding: '10px 12px',
          background: active ? SHADE.gold : SHADE.surface1,
          border: `1px solid ${active ? SHADE.goldDeep : SHADE.border}`,
          color: active ? '#1a1208' : SHADE.text, borderRadius: 3,
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

const ColorRow = ({
  label, value, onChange,
}: { label: string; value: ColorRgb; onChange: (c: ColorRgb) => void }) => {
  const [open, setOpen] = useState(false);
  const r = Math.round(value[0] * 255);
  const g = Math.round(value[1] * 255);
  const b = Math.round(value[2] * 255);
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
        <span
          style={{
            font: `700 11px ${TYPE.body}`,
            color: SHADE.text, letterSpacing: '0.10em', textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span style={{ marginLeft: 'auto', font: `500 12px ${TYPE.bodyMono}`, color: SHADE.text }}>{hex}</span>
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', height: 36, borderRadius: 3,
          background: hex,
          border: `1.5px solid ${SHADE.inkLine}`,
          cursor: 'pointer', display: 'block',
        }}
        aria-label={`${label} colour`}
      />
      {open && (
        <div style={{ marginTop: 12 }}>
          <RgbColorPicker
            color={{ r, g, b }}
            onChange={(c) => onChange([c.r / 255, c.g / 255, c.b / 255] as unknown as ColorRgb)}
          />
        </div>
      )}
    </div>
  );
};

function stepDigits(step?: number): number {
  if (!step) return 3;
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  if (step >= 0.01) return 2;
  return 3;
}

// ─── Wildcard editor ───────────────────────────────────────────────────

const WildcardEditor = ({
  card, onClose,
}: { card: WildcardCard; onClose: () => void }) => {
  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);

  const onSourceChange = (next: string) => {
    setRecipe({
      ...recipe,
      cards: recipe.cards.map((c) => (c.id === card.id && c.kind === 'wildcard'
        ? { ...c, rawSource: next }
        : c)),
    });
  };

  return (
    <Modal onClose={onClose}>
      <Header
        cat="effect"
        title={card.displayName ?? 'Custom code'}
        paramCount={0}
        onClose={onClose}
        cardId={card.id}
      />
      <div
        style={{
          flex: 1, minHeight: 0,
          padding: '16px 20px 20px',
          display: 'flex', flexDirection: 'column', gap: 10,
          overflow: 'hidden',
        }}
      >
        <EditorCompositionControls card={card} />
        <div
          style={{
            font: `700 10px ${TYPE.bodyMono}`,
            color: SHADE.textDim, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}
        >
          Custom GLSL
        </div>
        <textarea
          value={card.rawSource}
          onChange={(e) => onSourceChange(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1, resize: 'none',
            font: `500 13px ${TYPE.bodyMono}`,
            color: SHADE.cream, background: SHADE.surface4,
            border: `1px solid ${SHADE.border}`, borderRadius: 3,
            padding: '12px 14px', lineHeight: 1.55,
          }}
        />
      </div>
      <Footer onClose={onClose} />
    </Modal>
  );
};
