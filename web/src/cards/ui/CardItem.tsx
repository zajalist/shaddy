// One card row in the stack. Two flavours:
//   - TypedCardItem renders the friendly name + param controls.
//   - WildcardCardItem renders a 3-line peek of the raw GLSL + an "Edit
//     code" button that jumps to the wildcard's span in the code view
//     (per Q8 — wildcards have no in-card param surface).

import { lookupCardDef } from '../library';
import { useCardsStore } from '../state';
import type { ColorRgb, TypedCard, WildcardCard } from '../types';
import { ColorSwatchInput, ParamSlider } from './inputs';

const KEBAB_BUTTON_CLASS =
  'w-7 h-7 grid place-items-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent';

function CardChrome(props: {
  icon: string;
  title: string;
  subtitle?: string;
  index: number;
  total: number;
  enabled: boolean;
  cardId: string;
  onDeleteRequest: () => void;
  ringClass?: string;
  bodyClass?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { icon, title, subtitle, index, total, enabled, cardId } = props;
  const reorder = useCardsStore((s) => s.reorderCard);
  const toggle = useCardsStore((s) => s.toggleCardEnabled);

  return (
    <article
      className={`rounded-xl bg-neutral-900/50 backdrop-blur ring-1 ${
        props.ringClass ?? 'ring-neutral-800'
      } ${enabled ? '' : 'opacity-50'}`}
    >
      <header className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800">
        <span className="text-lg leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{title}</div>
          {subtitle && <div className="text-[11px] text-neutral-500 truncate">{subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={() => reorder(cardId, index - 1)}
          disabled={index === 0}
          aria-label="move up"
          className={KEBAB_BUTTON_CLASS}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => reorder(cardId, index + 1)}
          disabled={index === total - 1}
          aria-label="move down"
          className={KEBAB_BUTTON_CLASS}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => toggle(cardId)}
          aria-label={enabled ? 'disable card' : 'enable card'}
          className={KEBAB_BUTTON_CLASS}
        >
          {enabled ? '◉' : '○'}
        </button>
        <button
          type="button"
          onClick={props.onDeleteRequest}
          aria-label="remove card"
          className={KEBAB_BUTTON_CLASS}
        >
          ×
        </button>
      </header>
      {props.children && <div className={props.bodyClass ?? 'px-3 py-3 space-y-2'}>{props.children}</div>}
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
        icon="⚠️"
        title={`Unknown card type: ${card.type}`}
        index={index}
        total={total}
        enabled={card.enabled}
        cardId={card.id}
        onDeleteRequest={() => remove(card.id)}
      />
    );
  }

  return (
    <CardChrome
      icon={def.icon}
      title={def.friendlyName}
      index={index}
      total={total}
      enabled={card.enabled}
      cardId={card.id}
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
      icon="</>"
      title={card.displayName ?? 'Custom code'}
      subtitle={`${nonBlank.length} line${nonBlank.length === 1 ? '' : 's'}`}
      index={index}
      total={total}
      enabled={card.enabled}
      cardId={card.id}
      onDeleteRequest={handleDelete}
      ringClass="ring-amber-800/40"
      bodyClass="px-3 py-2"
      footer={
        <button
          type="button"
          onClick={() => onEditCode(card.id)}
          className="w-full py-2 text-xs text-amber-300/90 hover:text-amber-200 hover:bg-amber-950/30 border-t border-amber-800/30"
        >
          → Edit code
        </button>
      }
    >
      <pre className="text-[11px] font-mono leading-snug text-neutral-300 overflow-x-auto whitespace-pre">
        {previewLines.join('\n') || '(empty)'}
        {moreLines > 0 ? `\n… ${moreLines} more line${moreLines === 1 ? '' : 's'}` : ''}
      </pre>
    </CardChrome>
  );
}
