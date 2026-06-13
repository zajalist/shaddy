// Two-pane lesson workspace shell.
//
// Extracted from Learn.tsx (06-learn-ui.md task 5). Layout:
//   1) <LessonRail> (horizontal pills on desktop; compact stepper on mobile)
//   2) two-pane body — 50/50 on desktop:
//        left  = mascot + confetti stage + speech bubble + lesson meta + Next
//        right = <LessonEditor>
//      On mobile: single column, EDITOR PANE FIRST (so the user lands on the
//      action), narrative collapsed below.
//
// The mascot drops from 260 → 200 so it stops dominating. The confetti is
// mounted ONCE here in a dedicated relative stage wrapper over the mascot, so
// a re-key always replays.

import type { CSSProperties } from 'react';

import { SHADE, TYPE } from '../../tokens';
import { useIsMobile } from '../../useIsMobile';
import { Confetti } from './Confetti';
import { LessonEditor } from './LessonEditor';
import { LessonRail } from './LessonRail';
import { Mascot, type MascotMood } from './Mascot';
import { ProgressBadge } from './ProgressBadge';
import { SpeechBubble } from './SpeechBubble';
import {
  LESSONS,
  type CheckResult,
} from './lessons';

export type LearnWorkspaceProps = {
  activeIdx: number;
  lesson: typeof LESSONS[number];
  done: Set<string>;
  mood: MascotMood;
  bubbleTone: 'neutral' | 'good' | 'bad' | 'hint';
  bubbleText: string;
  confettiKey: number | null;
  onJumpToLesson: (idx: number) => void;
  onResetProgress: () => void;
  onCheckResult: (r: CheckResult) => void;
  onNext: () => void;
};

export const LearnWorkspace = ({
  activeIdx,
  lesson,
  done,
  mood,
  bubbleTone,
  bubbleText,
  confettiKey,
  onJumpToLesson,
  onResetProgress,
  onCheckResult,
  onNext,
}: LearnWorkspaceProps) => {
  const isMobile = useIsMobile();
  const isDone = done.has(lesson.id);

  const narrative = (
    <div style={leftColumnStyle}>
      <div style={mascotStageStyle}>
        <Mascot mood={mood} size={isMobile ? 160 : 200} />
        {confettiKey !== null && <Confetti key={confettiKey} />}
      </div>
      <SpeechBubble tone={bubbleTone} tail="top">
        {bubbleText}
      </SpeechBubble>
      <div style={lessonMetaStyle}>
        <div style={lessonNumberStyle}>
          Lesson {lesson.number} of {LESSONS.length}
        </div>
        <div style={lessonTitleStyle}>{lesson.title}</div>
      </div>
      <ProgressBadge done={done.size} total={LESSONS.length} variant="inline" />
      {isDone && (
        <button
          type="button"
          onClick={onNext}
          className="learn-cta"
          style={nextLessonBtnStyle}
        >
          {activeIdx + 1 < LESSONS.length ? 'Next lesson →' : 'Back to start'}
        </button>
      )}
    </div>
  );

  const editor = (
    <div style={{
      ...rightColumnStyle,
      padding: isMobile ? 14 : 20,
      minHeight: isMobile ? 'auto' : 560,
    }}>
      <LessonEditor
        lesson={lesson}
        done={isDone}
        onCheckResult={onCheckResult}
      />
    </div>
  );

  return (
    <section id="learn-workspace" style={{
      ...workspaceStyle,
      padding: isMobile ? '20px 14px 48px' : workspaceStyle.padding,
      gap: isMobile ? 16 : 24,
    }}>
      <LessonRail
        lessons={LESSONS}
        activeIdx={activeIdx}
        done={done}
        onSelect={onJumpToLesson}
        onResetProgress={onResetProgress}
      />

      <div style={{
        ...columnsStyle,
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: isMobile ? 16 : 28,
      }}>
        {/* Mobile: editor first (action), narrative below. Desktop: narrative
            left, editor right. */}
        {isMobile ? (
          <>
            {editor}
            {narrative}
          </>
        ) : (
          <>
            {narrative}
            {editor}
          </>
        )}
      </div>
    </section>
  );
};

// ─── styles ────────────────────────────────────────────────────────────────

const workspaceStyle: CSSProperties = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '36px 24px 64px',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

const columnsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 28,
  alignItems: 'stretch',
};

const leftColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 20,
  background: SHADE.surface1,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 14,
};

const mascotStageStyle: CSSProperties = {
  position: 'relative',
  alignSelf: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const lessonMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '10px 14px',
  background: SHADE.surface2,
  border: `1.5px solid ${SHADE.border}`,
  borderRadius: 10,
};

const lessonNumberStyle: CSSProperties = {
  font: `600 11px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.textDim,
};

const lessonTitleStyle: CSSProperties = {
  font: `700 18px/1.2 ${TYPE.display}`,
  letterSpacing: TYPE.trackTight,
  color: SHADE.text,
};

const nextLessonBtnStyle: CSSProperties = {
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  height: 44,
  padding: '0 20px',
  borderRadius: 12,
  border: `1.5px solid ${SHADE.inkLine}`,
  background: SHADE.gold,
  color: SHADE.inkLine,
  font: `700 15px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackTight,
  cursor: 'pointer',
};

const rightColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 20,
  background: SHADE.surface2,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 14,
  minHeight: 560,
};
