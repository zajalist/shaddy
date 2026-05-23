// Tiny input primitives — float slider + colour swatch (popover) — used by
// the typed-card param row. Lean, no dependencies beyond react-colorful.

import { useState } from 'react';
import { RgbColorPicker } from 'react-colorful';

import { formatFloatForDisplay, formatColorForDisplay } from '../format';
import type { ColorRgb } from '../types';

export function ParamSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step, onChange } = props;
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 text-neutral-400 truncate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-orange-500"
      />
      <span className="w-12 shrink-0 text-right tabular-nums text-neutral-300">
        {formatFloatForDisplay(value)}
      </span>
    </label>
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
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-neutral-400 truncate">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-7 h-7 rounded ring-1 ring-neutral-700 shrink-0"
          style={{ background: hex }}
          aria-label={`${label} colour`}
        />
        <span className="text-neutral-500 tabular-nums text-xs">{hex}</span>
      </div>
      {open && (
        <div className="pl-23">
          <RgbColorPicker
            color={rgb255}
            onChange={(c) => onChange([c.r / 255, c.g / 255, c.b / 255] as ColorRgb)}
          />
        </div>
      )}
    </div>
  );
}
