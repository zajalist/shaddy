// Tiny input primitives — float slider + colour swatch (popover) — used by
// the typed-card param row. Lean, no dependencies beyond react-colorful.

import { useState, type CSSProperties } from 'react';
import { RgbColorPicker } from 'react-colorful';

import { formatFloatForDisplay, formatColorForDisplay } from '../format';
import type { ColorRgb } from '../types';

export function ParamSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  fillVar?: string; // CSS color (e.g. var(--color-mustard))
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step, onChange, fillVar } = props;
  const pct = Math.max(0, Math.min(1, (value - min) / Math.max(1e-9, max - min))) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-mute font-mono font-medium">
          {label}
        </span>
        <span className="text-[12px] tabular-nums text-ink font-mono font-medium">
          {formatFloatForDisplay(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-chunk w-full"
        style={
          {
            '--val': `${pct}%`,
            ...(fillVar ? { '--fill': fillVar } : {}),
          } as CSSProperties
        }
        aria-label={label}
      />
    </div>
  );
}

export function ColorSwatchInput(props: {
  label: string;
  value: ColorRgb;
  onChange: (value: ColorRgb) => void;
}) {
  const { label, value, onChange } = props;
  const [open, setOpen] = useState(false);
  const rgb255 = {
    r: Math.round(value[0] * 255),
    g: Math.round(value[1] * 255),
    b: Math.round(value[2] * 255),
  };
  const hex = formatColorForDisplay(value);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-mute font-mono font-medium">
          {label}
        </span>
        <span className="text-[11px] text-mute tabular-nums font-mono">{hex}</span>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-full h-10 rounded-md border-ink overflow-hidden transition-transform active:scale-[0.98] active:translate-y-[1px] hover:-translate-y-[1px]"
        style={{ boxShadow: '3px 3px 0 0 var(--color-ink)' }}
        aria-label={`${label} colour swatch`}
        aria-expanded={open}
      >
        <span className="absolute inset-0" style={{ background: hex }} />
        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-paper-3 border-2 border-ink text-[10px] font-mono font-bold uppercase">
          {open ? 'shut' : 'pick'}
        </span>
      </button>
      {open && (
        <div className="mt-2 p-2 rounded-md border-ink bg-paper-3 shadow-chunk-sm pop-in">
          <RgbColorPicker
            color={rgb255}
            onChange={(c) => onChange([c.r / 255, c.g / 255, c.b / 255] as ColorRgb)}
          />
        </div>
      )}
    </div>
  );
}
