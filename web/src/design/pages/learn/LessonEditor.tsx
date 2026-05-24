// Editor + preview + Check button.
//
// Layout (vertical stack):
//   ┌─ header (lesson number / title) ─────────────┐
//   ┌─ editor: textarea + GlslHighlight overlay ──┐
//   ┌─ preview: live RawShaderCanvas (square) ────┐
//   ┌─ controls: Reset · Show me · Check ─────────┐
//
// The editor uses <GlslHighlight editable> — the same overlay-on-textarea
// trick the composer's code drawer uses. We hold the source in state and
// pass it both to the highlight overlay AND to RawShaderCanvas so they
// stay in lockstep.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { GlslHighlight } from '../../GlslHighlight';
import { SHADE, TYPE } from '../../tokens';
import type { CheckResult, Lesson } from './lessons';
import { RawShaderCanvas, type RawShaderCanvasHandle } from './RawShaderCanvas';

export type LessonEditorProps = {
  lesson: Lesson;
  done: boolean;
  /** Called every time a check completes. The parent uses the result to
   *  swap the mascot's mood + advance state. */
  onCheckResult: (r: CheckResult) => void;
  /** Disabled while the parent is mid-transition (e.g. confetti playing). */
  disabled?: boolean;
};

export const LessonEditor = ({ lesson, done, onCheckResult, disabled }: LessonEditorProps) => {
  const [source, setSource] = useState(lesson.starterCode);
  const [compileErr, setCompileErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const canvasRef = useRef<RawShaderCanvasHandle | null>(null);

  // When the lesson changes, reset the editor to that lesson's starter.
  // (Could persist per-lesson drafts to localStorage if we wanted, but the
  // pedagogy is sharper when each visit starts fresh.)
  useEffect(() => {
    setSource(lesson.starterCode);
    setCompileErr(null);
  }, [lesson.id, lesson.starterCode]);

  const handleCheck = async () => {
    if (checking || disabled) return;
    if (!canvasRef.current) return;
    setChecking(true);
    try {
      const result = await lesson.check({ source, canvas: canvasRef.current });
      onCheckResult(result);
    } finally {
      setChecking(false);
    }
  };

  const handleReset = () => {
    setSource(lesson.starterCode);
  };

  const handleShowMe = () => {
    setSource(lesson.solutionCode);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={lessonChipStyle}>
          Lesson <span style={{ fontFamily: TYPE.bodyMono }}>{lesson.number}</span>
          {done && <span style={doneTickStyle} aria-label="completed">✓</span>}
        </span>
        <span style={titleStyle}>{lesson.title}</span>
      </div>

      {/* Editor — dark code well like the composer's drawer */}
      <div style={editorWellStyle}>
        <pre style={editorPreStyle}>
          <GlslHighlight source={source} editable onSourceChange={setSource} />
        </pre>
      </div>

      {/* Inline compile error pill */}
      {compileErr && (
        <div style={errorPillStyle} role="status">
          {compileErr}
        </div>
      )}

      {/* Preview */}
      <div style={previewWrapStyle}>
        <RawShaderCanvas
          source={source}
          handleRef={(h) => { canvasRef.current = h; }}
          onCompileResult={(r) => {
            if (r.ok) {
              setCompileErr(null);
            } else {
              const first = r.errors[0];
              setCompileErr(first ? `Line ${first.line}: ${first.message}` : 'Compile error');
            }
          }}
          style={previewCanvasStyle}
        />
        <div style={previewLabelStyle}>preview</div>
      </div>

      {/* Controls */}
      <div style={controlsStyle}>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled || checking}
          style={secondaryBtnStyle}
          className="learn-secondary-btn"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleShowMe}
          disabled={disabled || checking}
          style={secondaryBtnStyle}
          className="learn-secondary-btn"
        >
          Show me
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={disabled || checking || !!compileErr}
          style={primaryBtnStyle}
          className="learn-primary-btn"
        >
          {checking ? 'Checking…' : 'Check'}
        </button>
      </div>
    </div>
  );
};

// ─── styles ────────────────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  height: '100%',
  minHeight: 0,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  flexWrap: 'wrap',
};

const lessonChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 10px',
  borderRadius: 999,
  background: SHADE.surface3,
  border: `1.5px solid ${SHADE.inkLine}`,
  font: `600 12px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.text,
};

const doneTickStyle: CSSProperties = {
  marginLeft: 4,
  color: SHADE.goldDeep,
  fontWeight: 700,
};

const titleStyle: CSSProperties = {
  font: `700 22px/1.1 ${TYPE.display}`,
  letterSpacing: TYPE.trackTighter,
  color: SHADE.text,
};

const editorWellStyle: CSSProperties = {
  flex: '1 1 auto',
  minHeight: 220,
  background: SHADE.surface4,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 10,
  padding: 14,
  overflow: 'auto',
  boxShadow: `inset 0 2px 0 rgba(0,0,0,0.18)`,
};

const editorPreStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  font: `500 13.5px/1.55 ${TYPE.bodyMono}`,
  color: SHADE.cream,
  whiteSpace: 'pre',
  minHeight: '100%',
};

const errorPillStyle: CSSProperties = {
  alignSelf: 'flex-start',
  background: '#F2C9B6',
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 8,
  padding: '6px 10px',
  font: `500 12.5px/1.3 ${TYPE.bodyMono}`,
  color: SHADE.text,
  maxWidth: '100%',
};

const previewWrapStyle: CSSProperties = {
  position: 'relative',
  width: 220,
  height: 220,
  alignSelf: 'flex-start',
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 10,
  background: SHADE.surface4,
  boxShadow: `0 3px 0 ${SHADE.inkLine}`,
  overflow: 'hidden',
};

const previewCanvasStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
};

const previewLabelStyle: CSSProperties = {
  position: 'absolute',
  top: 6,
  left: 8,
  font: `600 10px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: 'rgba(254, 231, 199, 0.7)',
  pointerEvents: 'none',
};

const controlsStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
};

const baseBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 40,
  padding: '0 18px',
  borderRadius: 10,
  border: `1.5px solid ${SHADE.inkLine}`,
  font: `700 14px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackTight,
  cursor: 'pointer',
  boxShadow: `0 3px 0 ${SHADE.inkLine}`,
  transition: 'transform 100ms ease, box-shadow 100ms ease, background 160ms ease',
};

const secondaryBtnStyle: CSSProperties = {
  ...baseBtnStyle,
  background: SHADE.surface1,
  color: SHADE.text,
};

const primaryBtnStyle: CSSProperties = {
  ...baseBtnStyle,
  background: SHADE.gold,
  color: SHADE.inkLine,
  marginLeft: 'auto',
};
