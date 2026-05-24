// /learn — Codecademy-style interactive shader tutorial with Shaddy.
//
// Two screens stacked vertically:
//   1) Hero strip — warm cream, big mascot + "Hi, I'm Shaddy" + "Start" CTA.
//   2) Lesson workspace — two-column, full viewport-tall:
//        left  ~45%  mascot stage + speech bubble (lesson narrative)
//        right ~55%  editor + live preview + Check button
//
// Persistence: completed lessons live in localStorage under
// `shade.learn.completed.v1` so a returning user picks up where they left off.
//
// File ownership note: this page lives in design/pages and is wired into the
// router by another agent. We don't import anything outside design/ +
// renderer/ (renderer is allowed from design/).

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { SHADE, TYPE } from '../tokens';
import { useIsMobile } from '../useIsMobile';
import { LessonEditor } from './learn/LessonEditor';
import { Mascot, type MascotMood } from './learn/Mascot';
import { SpeechBubble } from './learn/SpeechBubble';
import {
  LESSONS,
  loadProgress,
  saveProgress,
  type CheckResult,
} from './learn/lessons';

// ─── fonts + global ornament (page-scoped) ─────────────────────────────────

const FONT_LINK_ID = 'shade-design-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
const KEYFRAMES_ID = 'shade-learn-keyframes';

const useLearnChrome = () => {
  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(KEYFRAMES_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAMES_ID;
      style.textContent = `
        @keyframes learnFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes learnConfetti {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          25%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.05); opacity: 0; }
        }
        .learn-cta {
          transition: transform 120ms ease, box-shadow 120ms ease,
                      background 160ms ease;
        }
        .learn-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 0 ${SHADE.inkLine};
        }
        .learn-cta:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 ${SHADE.inkLine};
        }
        .learn-primary-btn:hover:not(:disabled) {
          background: #ffd06a;
          transform: translateY(-1px);
          box-shadow: 0 4px 0 ${SHADE.inkLine};
        }
        .learn-primary-btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow: 0 1px 0 ${SHADE.inkLine};
        }
        .learn-primary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .learn-secondary-btn:hover:not(:disabled) {
          background: ${SHADE.surface3};
          transform: translateY(-1px);
          box-shadow: 0 4px 0 ${SHADE.inkLine};
        }
        .learn-secondary-btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow: 0 1px 0 ${SHADE.inkLine};
        }
        .learn-secondary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .learn-step-pill {
          transition: background 140ms ease, color 140ms ease,
                      transform 120ms ease;
        }
        .learn-step-pill:hover {
          transform: translateY(-1px);
        }
      `;
      document.head.appendChild(style);
    }
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    const prevOverflowX = document.body.style.overflowX;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.background = SHADE.bg;
    document.body.style.color = SHADE.text;
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
      document.body.style.overflowX = prevOverflowX;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, []);
};

// ─── component ─────────────────────────────────────────────────────────────

export function Learn() {
  useLearnChrome();

  // Progress (lesson ids known to be completed).
  const [done, setDone] = useState<Set<string>>(() => loadProgress());
  // Active lesson index — null means "hero strip" (not yet started).
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // Per-attempt UI state.
  const [mood, setMood] = useState<MascotMood>('idle');
  const [bubbleTone, setBubbleTone] = useState<'neutral' | 'good' | 'bad' | 'hint'>('neutral');
  const [bubbleText, setBubbleText] = useState<string>('');
  const [confettiKey, setConfettiKey] = useState<number | null>(null);

  const lesson = activeIdx !== null ? LESSONS[activeIdx] : null;

  // Reset narrative + mood whenever the active lesson changes.
  useEffect(() => {
    if (!lesson) return;
    setMood('pointing');
    setBubbleTone('neutral');
    setBubbleText(lesson.prompt);
  }, [lesson?.id]);

  const onStart = () => {
    // Resume at the first un-done lesson (or 0 if everything's done).
    const firstUnfinished = LESSONS.findIndex((l) => !done.has(l.id));
    setActiveIdx(firstUnfinished === -1 ? 0 : firstUnfinished);
    // Scroll the lesson workspace into view.
    requestAnimationFrame(() => {
      document.getElementById('learn-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const onCheckResult = useCallback((r: CheckResult) => {
    if (!lesson) return;
    if (r.pass) {
      setMood('cheering');
      setBubbleTone('good');
      setBubbleText(cheerLine());
      const nextDone = new Set(done);
      nextDone.add(lesson.id);
      setDone(nextDone);
      saveProgress(nextDone);
      setConfettiKey(Date.now());
    } else {
      setMood('thinking');
      setBubbleTone('hint');
      setBubbleText(`${r.reason} ${lesson.hint}`);
    }
  }, [lesson, done]);

  const onNext = useCallback(() => {
    if (activeIdx === null) return;
    if (activeIdx + 1 < LESSONS.length) {
      setActiveIdx(activeIdx + 1);
    } else {
      // All lessons done — bounce back to the hero.
      setActiveIdx(null);
    }
  }, [activeIdx]);

  const onJumpToLesson = (idx: number) => {
    setActiveIdx(idx);
  };

  const onResetProgress = () => {
    const empty = new Set<string>();
    setDone(empty);
    saveProgress(empty);
  };

  const doneCount = done.size;
  const totalCount = LESSONS.length;
  const allDone = doneCount >= totalCount;

  return (
    <div style={pageStyle}>
      <Hero
        onStart={onStart}
        startedAlready={activeIdx !== null}
        doneCount={doneCount}
        totalCount={totalCount}
        allDone={allDone}
      />

      {activeIdx !== null && lesson && (
        <Workspace
          activeIdx={activeIdx}
          lesson={lesson}
          done={done}
          mood={mood}
          bubbleTone={bubbleTone}
          bubbleText={bubbleText}
          confettiKey={confettiKey}
          onJumpToLesson={onJumpToLesson}
          onResetProgress={onResetProgress}
          onCheckResult={onCheckResult}
          onNext={onNext}
        />
      )}
    </div>
  );
}

// Workspace — desktop is two-column (mascot + editor); mobile is stacked
// (editor first so the user lands on the action; mascot below collapses to
// a thin band).
type WorkspaceProps = {
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

const Workspace = ({
  activeIdx, lesson, done, mood, bubbleTone, bubbleText, confettiKey,
  onJumpToLesson, onResetProgress, onCheckResult, onNext,
}: WorkspaceProps) => {
  const isMobile = useIsMobile();
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
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 0.85fr) minmax(0, 1fr)',
        gap: isMobile ? 16 : 28,
      }}>
            {/* LEFT — mascot + speech bubble + lesson narrative */}
            <div style={leftColumnStyle}>
              <div style={mascotStageStyle}>
                <Mascot mood={mood} size={260} />
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
              {done.has(lesson.id) && (
                <button
                  type="button"
                  onClick={onNext}
                  className="learn-cta"
                  style={nextLessonBtnStyle}
                >
                  {activeIdx + 1 < LESSONS.length ? 'Next lesson →' : "Back to start"}
                </button>
              )}
            </div>

            {/* RIGHT — editor + preview + check */}
            <div style={{
              ...rightColumnStyle,
              padding: isMobile ? 14 : 20,
              minHeight: isMobile ? 'auto' : 640,
            }}>
              <LessonEditor
                lesson={lesson}
                done={done.has(lesson.id)}
                onCheckResult={onCheckResult}
              />
            </div>
          </div>
    </section>
  );
};

// ─── hero strip ────────────────────────────────────────────────────────────

type HeroProps = {
  onStart: () => void;
  startedAlready: boolean;
  doneCount: number;
  totalCount: number;
  allDone: boolean;
};

const Hero = ({ onStart, startedAlready, doneCount, totalCount, allDone }: HeroProps) => {
  const isMobile = useIsMobile();
  return (
  <section style={heroStyle}>
    <div style={{
      ...heroInnerStyle,
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto',
      gap: isMobile ? 28 : 48,
    }}>
      <div style={heroLeftStyle}>
        <span style={eyebrowStyle}>Learn GPU shaders</span>
        <h1 style={{ ...heroTitleStyle, font: isMobile ? `700 34px/1.04 ${TYPE.display}` : heroTitleStyle.font }}>
          Hi, I&rsquo;m <span style={{ color: SHADE.goldDeep }}>Shaddy</span>.<br />
          Let&rsquo;s write a shader together.
        </h1>
        <p style={{ ...heroLeadStyle, font: isMobile ? `400 15px/1.5 ${TYPE.body}` : heroLeadStyle.font }}>
          Eight tiny lessons. You change one line, I cheer when the picture
          changes. No install, no signup. The first lesson takes about a
          minute &mdash; quicker than reading this paragraph.
        </p>
        <div style={heroCtaRowStyle}>
          <button type="button" onClick={onStart} className="learn-cta" style={primaryCtaStyle}>
            {allDone ? 'Replay from lesson 1' : startedAlready ? 'Continue' : 'Start lesson 1'}
          </button>
          <div style={progressMeterStyle}>
            <div style={progressMeterFillStyle(doneCount, totalCount)} />
            <span style={progressLabelStyle}>
              {doneCount} / {totalCount} done
            </span>
          </div>
        </div>
      </div>
      {!isMobile && (
        <div style={heroMascotStyle}>
          <Mascot mood="cheering" size={300} />
          <div style={heroBubbleStyle}>
            <SpeechBubble tone="neutral" tail="left">
              Ready? Honestly easier than I made it sound.
            </SpeechBubble>
          </div>
        </div>
      )}
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <Mascot mood="cheering" size={200} />
        </div>
      )}
    </div>
  </section>
  );
};

// ─── lesson rail ──────────────────────────────────────────────────────────

type RailProps = {
  lessons: typeof LESSONS;
  activeIdx: number;
  done: Set<string>;
  onSelect: (idx: number) => void;
  onResetProgress: () => void;
};

const LessonRail = ({ lessons, activeIdx, done, onSelect, onResetProgress }: RailProps) => (
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

// ─── confetti ──────────────────────────────────────────────────────────────
// Lightweight SVG burst — six radial rays + a star at the centre that fades
// out via the learnConfetti keyframe. Re-renders on a new key whenever the
// user passes a lesson.

const Confetti = () => {
  // Build a useMemo-able set of ray angles so the burst is deterministic per
  // mount (we re-key the whole component to retrigger animations).
  const rays = useMemo(
    () => [0, 60, 120, 180, 240, 300, 30, 90, 150, 210, 270, 330],
    [],
  );
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 220,
        height: 220,
        pointerEvents: 'none',
        animation: 'learnConfetti 700ms cubic-bezier(0.2, 1.4, 0.4, 1) forwards',
      }}
    >
      <svg width="220" height="220" viewBox="-110 -110 220 220">
        {rays.map((a, i) => {
          const rad = (a * Math.PI) / 180;
          const r1 = 60;
          const r2 = 100;
          const x1 = Math.cos(rad) * r1;
          const y1 = Math.sin(rad) * r1;
          const x2 = Math.cos(rad) * r2;
          const y2 = Math.sin(rad) * r2;
          const color = i % 2 === 0 ? SHADE.gold : SHADE.ember;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
};

// ─── cheer copy (tiny pool so each pass feels fresh) ──────────────────────

function cheerLine(): string {
  const pool = [
    "Yes! That's it.",
    "Boom. Look at the canvas.",
    "There you go.",
    "Nailed it.",
    "Onto the next one.",
    "Told you it was easier than it looked.",
    "Knew you had it.",
  ];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
}

// ─── styles ────────────────────────────────────────────────────────────────

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: SHADE.bg,
  color: SHADE.text,
  font: `400 16px/1.45 ${TYPE.body}`,
};

const heroStyle: CSSProperties = {
  background: `linear-gradient(180deg, ${SHADE.surface1} 0%, ${SHADE.bg} 100%)`,
  borderBottom: `1.5px solid ${SHADE.inkLine}`,
  padding: 'clamp(36px, 7vw, 64px) clamp(16px, 4vw, 24px) clamp(40px, 8vw, 72px)',
};

const heroInnerStyle: CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 48,
};

const heroLeftStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  animation: 'learnFadeUp 420ms cubic-bezier(0.2, 1.0, 0.3, 1) both',
};

const eyebrowStyle: CSSProperties = {
  font: `700 12px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.textDim,
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  font: `700 52px/1.04 ${TYPE.display}`,
  letterSpacing: TYPE.trackTighter,
  color: SHADE.text,
};

const heroLeadStyle: CSSProperties = {
  margin: '4px 0 0',
  maxWidth: 560,
  font: `400 18px/1.5 ${TYPE.body}`,
  color: SHADE.textDim,
};

const heroCtaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  marginTop: 14,
  flexWrap: 'wrap',
};

const primaryCtaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 52,
  padding: '0 28px',
  borderRadius: 12,
  border: `1.5px solid ${SHADE.inkLine}`,
  background: SHADE.gold,
  color: SHADE.inkLine,
  font: `700 17px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackTight,
  cursor: 'pointer',
  boxShadow: `0 4px 0 ${SHADE.inkLine}`,
};

const progressMeterStyle: CSSProperties = {
  position: 'relative',
  height: 24,
  minWidth: 220,
  background: SHADE.surface3,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 999,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
};

const progressMeterFillStyle = (done: number, total: number): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  width: `${Math.round((done / Math.max(1, total)) * 100)}%`,
  background: SHADE.gold,
  transition: 'width 320ms cubic-bezier(0.2, 1.0, 0.3, 1)',
});

const progressLabelStyle: CSSProperties = {
  position: 'relative',
  marginLeft: 'auto',
  marginRight: 12,
  font: `600 11px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.inkLine,
  zIndex: 1,
};

const heroMascotStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 12,
};

const heroBubbleStyle: CSSProperties = {
  maxWidth: 260,
};

const workspaceStyle: CSSProperties = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '36px 24px 64px',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

const railStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  background: SHADE.surface1,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 12,
  boxShadow: `0 3px 0 ${SHADE.inkLine}`,
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
  boxShadow: `0 2px 0 ${SHADE.inkLine}`,
};

const columnsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1fr)',
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
  boxShadow: `0 4px 0 ${SHADE.inkLine}`,
};

const mascotStageStyle: CSSProperties = {
  position: 'relative',
  alignSelf: 'center',
  // Tiny floor shadow for the mascot — sells the "on stage" feel.
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
  boxShadow: `0 3px 0 ${SHADE.inkLine}`,
};

const rightColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 20,
  background: SHADE.surface2,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 14,
  boxShadow: `0 4px 0 ${SHADE.inkLine}`,
  minHeight: 640,
};

