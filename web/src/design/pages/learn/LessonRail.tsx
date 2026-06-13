// Lesson navigation rail.
//
// Desktop: a horizontal row of pills, one per lesson (active = gold,
// done = surface3 + ✓), plus a "Reset progress" button.
// Mobile: a compact stepper — ‹ Lesson 3 / 8 › — instead of an 8-wide wrap,
// with arrows that step through lessons.
//
// Flat button styles: hover communicates state via a background shift only
// (handled by the shared .learn-step-pill / .learn-secondary-btn classes,
// which no longer carry a box-shadow lift).

import type { CSSProperties } from 'react';

import { SHADE, TYPE } from '../../tokens';
import { useIsMobile } from '../../useIsMobile';
import type { LESSONS } from './lessons';

export type LessonRailProps = {
  lessons: typeof LESSONS;
  activeIdx: number;
  done: Set<string>;
  onSelect: (idx: number) => void;
  onResetProgress: () => void;
};

export const LessonRail = ({
  lessons,
  activeIdx,
  done,
  onSelect,
  onResetProgress,
}: LessonRailProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    const canPrev = activeIdx > 0;
    const canNext = activeIdx < lessons.length - 1;
    return (
      <div style={railStyle}>
        <div style={stepperStyle}>
          <button
            type="button"
            className="learn-step-pill"
            style={stepperArrowStyle(canPrev)}
            disabled={!canPrev}
            aria-label="Previous lesson"
            onClick={() => canPrev && onSelect(activeIdx - 1)}
          >
            ‹
          </button>
          <span style={stepperLabelStyle}>
            Lesson <span style={{ fontFamily: TYPE.bodyMono }}>{activeIdx + 1}</span>
            {' / '}
            <span style={{ fontFamily: TYPE.bodyMono }}>{lessons.length}</span>
          </span>
          <button
            type="button"
            className="learn-step-pill"
            style={stepperArrowStyle(canNext)}
            disabled={!canNext}
            aria-label="Next lesson"
            onClick={() => canNext && onSelect(activeIdx + 1)}
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={onResetProgress}
          style={railResetStyle}
          className="learn-secondary-btn"
        >
          Reset
        </button>
      </div>
    );
  }

  return (
    <div style={railStyle}>
      <span style={railLabelStyle}>Lessons</span>
      <div style={railPillsStyle}>
        {lessons.map((l, idx) => {
          const isActive = idx === activeIdx;
          const isDone = done.has(l.id);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelect(idx)}
              className="learn-step-pill"
              style={railPillStyle(isActive, isDone)}
              title={l.title}
              aria-current={isActive ? 'step' : undefined}
            >
              <span style={{ fontFamily: TYPE.bodyMono, marginRight: 6 }}>{l.number}</span>
              {l.title}
              {isDone && <span style={{ marginLeft: 6, color: SHADE.goldDeep }}>✓</span>}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onResetProgress}
        style={railResetStyle}
        className="learn-secondary-btn"
      >
        Reset progress
      </button>
    </div>
  );
};

// ─── styles (flat: rail keeps a structural border, no hover lift) ───────────

const railStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  background: SHADE.surface1,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 12,
  flexWrap: 'wrap',
};

const railLabelStyle: CSSProperties = {
  font: `700 11px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.textDim,
  marginRight: 4,
};

const railPillsStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  flex: '1 1 auto',
};

const railPillStyle = (active: boolean, done: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: 30,
  padding: '0 12px',
  borderRadius: 999,
  border: `1.5px solid ${SHADE.inkLine}`,
  background: active ? SHADE.gold : done ? SHADE.surface3 : SHADE.surface1,
  color: SHADE.text,
  cursor: 'pointer',
  font: `600 12.5px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackTight,
});

const railResetStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 30,
  padding: '0 12px',
  borderRadius: 999,
  border: `1.5px solid ${SHADE.inkLine}`,
  background: SHADE.surface1,
  color: SHADE.text,
  cursor: 'pointer',
  font: `600 12px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackTight,
};

const stepperStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flex: '1 1 auto',
};

const stepperLabelStyle: CSSProperties = {
  font: `700 14px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackTight,
  color: SHADE.text,
};

const stepperArrowStyle = (enabled: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 999,
  border: `1.5px solid ${SHADE.inkLine}`,
  background: SHADE.surface1,
  color: SHADE.text,
  font: `700 20px/1 ${TYPE.body}`,
  cursor: enabled ? 'pointer' : 'not-allowed',
  opacity: enabled ? 1 : 0.45,
});
