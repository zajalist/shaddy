// One card row in the stack. Two flavours:
//   - TypedCardItem renders the friendly name + param controls.
//   - WildcardCardItem renders a 3-line peek of the raw GLSL + an "Edit
//     code" button that jumps to the wildcard's span in the code view
//     (per Q8 — wildcards have no in-card param surface).

import { lookupCardDef } from '../library';
import { useCardsStore } from '../state';
import type { CardCategory, ColorRgb, TypedCard, WildcardCard } from '../types';
import { CardIcon, Glyph } from './icons';
import { ColorSwatchInput, ParamSlider } from './inputs';

// Category palette — saturated riso tones used as full-fill blocks.
type Tone = {
  bg: string; // top stripe + icon-chip background fill (Tailwind class)
  cssVar: string; // slider fill (CSS var)
  text: string; // text-on-block readability — almost always ink
};

const CATEGORY_TONE: Record<CardCategory, Tone> = {
  shape: { bg: 'bg-mustard', cssVar: 'var(--color-mustard)', text: 'text-ink' },
  distortion: { bg: 'bg-cobalt', cssVar: 'var(--color-cobalt)', text: 'text-paper' },
  color: { bg: 'bg-coral', cssVar: 'var(--color-coral)', text: 'text-ink' },
  effect: { bg: 'bg-mint', cssVar: 'var(--color-mint)', text: 'text-ink' },
};

const WILD_TONE: Tone = { bg: 'bg-lavender', cssVar: 'var(--color-lavender)', text: 'text-ink' };

const ACTION_BTN =
  'w-7 h-7 grid place-items-center rounded border-2 border-ink bg-paper-3 text-ink hover:bg-paper-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

function CardChrome(props: {
  iconNode: React.ReactNode;
  title: string;
  subtitle?: string;
  index: number;
  total: number;
  enabled: boolean;
  cardId: string;
  tone: Tone;
  onDeleteRequest: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { iconNode, title, subtitle, index, total, enabled, cardId, tone } = props;
  const reorder = useCardsStore((s) => s.reorderCard);
  const toggle = useCardsStore((s) => s.toggleCardEnabled);

  return (
    <article
      className={`relative rounded-lg border-ink bg-paper-2 overflow-hidden ${
        enabled ? '' : 'opacity-55 saturate-50'
      }`}
      style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
    >
      {/* Top color stripe in category tone */}
      <div className={`h-2.5 ${tone.bg} border-b-2 border-ink`} />

      <header className="flex items-center gap-3 px-3 py-2.5">
        {/* Chunky index number — display font for personality */}
        <span className="font-mono font-bold text-[15px] tabular-nums text-ink w-6 text-right">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Icon chip — square block in category color */}
        <span
          className={`w-9 h-9 grid place-items-center rounded-md border-2 border-ink ${tone.bg} ${tone.text} shrink-0`}
        >
          {iconNode}
        </span>

        <div className="flex-1 min-w-0">
          <div className="font-sans font-semibold text-[14px] text-ink truncate leading-tight">
            {title}
          </div>
          {subtitle && (
            <div className="text-[10.5px] text-mute truncate font-mono uppercase tracking-[0.1em] mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {/* Action cluster */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => reorder(cardId, index - 1)}
            disabled={index === 0}
            aria-label="move up"
            className={ACTION_BTN}
          >
            <Glyph.ArrowUpSmall size={14} />
          </button>
          <button
            type="button"
            onClick={() => reorder(cardId, index + 1)}
            disabled={index === total - 1}
            aria-label="move down"
            className={ACTION_BTN}
          >
            <Glyph.ArrowDownSmall size={14} />
          </button>
          <button
            type="button"
            onClick={() => toggle(cardId)}
            aria-label={enabled ? 'mute card' : 'unmute card'}
            className={ACTION_BTN}
            title={enabled ? 'mute' : 'unmute'}
          >
            {enabled ? <Glyph.Eye size={14} /> : <Glyph.EyeOff size={14} />}
          </button>
          <button
            type="button"
            onClick={props.onDeleteRequest}
            aria-label="remove card"
            className={ACTION_BTN + ' hover:bg-coral hover:text-paper'}
          >
            <Glyph.X size={13} />
          </button>
        </div>
      </header>
      {props.children && (
        <div className="px-3.5 pt-1 pb-3.5 space-y-3 border-t-2 border-ink bg-paper-3">
          {props.children}
        </div>
      )}
      {props.footer}
    </article>
  );
}

export function TypedCardItem(props: { card: TypedCard; index: number; total: number }) {
  const { card, index, total } = props;
  const def = lookupCardDef(card.type);
  const update = useCardsStore((s) => s.updateParamValue);
  const remove = useCardsStore((s) => s.removeCard);

  if (!def) {
    return (
      <CardChrome
        iconNode={<Glyph.Warn size={16} />}
        title={`Unknown: ${card.type}`}
        index={index}
        total={total}
        enabled={card.enabled}
        cardId={card.id}
        tone={WILD_TONE}
        onDeleteRequest={() => remove(card.id)}
      />
    );
  }

  const tone = CATEGORY_TONE[def.category];

  return (
    <CardChrome
      iconNode={<CardIcon type={card.type} size={18} />}
      title={def.friendlyName}
      subtitle={def.category}
      index={index}
      total={total}
      enabled={card.enabled}
      cardId={card.id}
      tone={tone}
      onDeleteRequest={() => remove(card.id)}
    >
      {Object.entries(def.params).map(([key, pdef]) => {
        const current = card.params[key]?.value ?? pdef.default;
        if (pdef.kind === 'float') {
          return (
            <ParamSlider
              key={key}
              label={pdef.label}
              value={current as number}
              min={pdef.min}
              max={pdef.max}
              step={pdef.step}
              fillVar={tone.cssVar}
              onChange={(v) => update(card.id, key, v)}
            />
          );
        }
        return (
          <ColorSwatchInput
            key={key}
            label={pdef.label}
            value={current as ColorRgb}
            onChange={(v) => update(card.id, key, v)}
          />
        );
      })}
    </CardChrome>
  );
}

export function WildcardCardItem(props: {
  card: WildcardCard;
  index: number;
  total: number;
  onEditCode: (cardId: string) => void;
}) {
  const { card, index, total, onEditCode } = props;
  const remove = useCardsStore((s) => s.removeCard);

  const nonBlank = card.rawSource.split('\n').filter((l) => l.trim().length > 0);
  const previewLines = nonBlank.slice(0, 3);
  const moreLines = nonBlank.length - previewLines.length;

  const handleDelete = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this custom code? The GLSL inside this wildcard will be lost.')
    ) {
      return;
    }
    remove(card.id);
  };

  return (
    <CardChrome
      iconNode={<Glyph.Brackets size={16} />}
      title={card.displayName ?? 'Custom code'}
      subtitle={`wildcard · ${nonBlank.length} line${nonBlank.length === 1 ? '' : 's'}`}
      index={index}
      total={total}
      enabled={card.enabled}
      cardId={card.id}
      tone={WILD_TONE}
      onDeleteRequest={handleDelete}
      footer={
        <button
          type="button"
          onClick={() => onEditCode(card.id)}
          className="w-full py-2.5 text-[11px] uppercase tracking-[0.18em] font-mono font-bold text-ink bg-lavender hover:bg-lavender-soft border-t-2 border-ink transition-colors flex items-center justify-center gap-2"
        >
          <span>edit code</span>
          <Glyph.ArrowRight size={13} />
        </button>
      }
    >
      <pre className="text-[11px] font-mono leading-relaxed text-paper bg-inkwell border-2 border-ink rounded p-2.5 overflow-x-auto whitespace-pre">
        {previewLines.join('\n') || '(empty)'}
        {moreLines > 0 ? `\n… ${moreLines} more line${moreLines === 1 ? '' : 's'}` : ''}
      </pre>
    </CardChrome>
  );
}
