// /learn — Codecademy-style interactive shader tutorial with Shaddy.
//
// Two screens stacked vertically:
//   1) Hero strip (<LearnHero>) — warm cream, big mascot + "Hi, I'm Shaddy"
//      + a "Start" CTA + the single "N of 8 complete" ProgressBadge.
//   2) Lesson workspace (<LearnWorkspace>) — a lesson rail, a mascot/narrative
//      column, and the editor + live preview pane.
//
// This file is the ORCHESTRATOR: it owns the state machine (active lesson,
// completed set, mascot mood / bubble, confetti trigger) and hands all
// presentation to the small, individually-testable components in ./learn/.
//
// Persistence: completed lessons live in localStorage under
// `shaddy.lessons.progress.v1` (migrated once from the old
// `shade.learn.completed.v1` key) so a returning user picks up where they
// left off — see ./learn/progress.ts.
//
// File ownership note: this page lives in design/pages and is wired into the
// router by another agent. We don't import anything outside design/ +
// renderer/ (renderer is allowed from design/).

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { SHADE, TYPE } from '../tokens';
import { LearnHero } from './learn/LearnHero';
import { LearnWorkspace } from './learn/LearnWorkspace';
import { type MascotMood } from './learn/Mascot';
import {
  LESSONS,
  loadProgress,
  saveProgress,
  type CheckResult,
} from './learn/lessons';

// ─── fonts + page chrome (token-free) ───────────────────────────────────────
//
// Interim per-page chrome (06-learn-ui.md task 3 / "interim" path): we inject
// ONLY the two keyframes (learnFadeUp, learnConfetti) — NO token interpolation
// in any selector rule, so there is no stale-token blob and no hover
// box-shadow "lift". All token-dependent values live inline on the elements
// (see LearnHero / LearnWorkspace / LessonEditor). When 05-library-ui.md lands
// a shared style layer, this hook collapses into a call into that module.

const FONT_LINK_ID = 'shade-design-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
const KEYFRAMES_ID = 'shade-learn-keyframes';

// Pure keyframes only — no selector rules, no token interpolation.
const KEYFRAMES_CSS = `
@keyframes learnFadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes learnConfetti {
  0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
  25%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.05); opacity: 0; }
}
`;

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
      style.textContent = KEYFRAMES_CSS;
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
      <LearnHero
        onStart={onStart}
        startedAlready={activeIdx !== null}
        doneCount={doneCount}
        totalCount={totalCount}
        allDone={allDone}
      />

      {activeIdx !== null && lesson && (
        <LearnWorkspace
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

// ─── cheer copy (tiny pool so each pass feels fresh) ──────────────────────

function cheerLine(): string {
  const pool = [
    "Yes! That's it.",
    'Boom. Look at the canvas.',
    'There you go.',
    'Nailed it.',
    'Onto the next one.',
    'Told you it was easier than it looked.',
    'Knew you had it.',
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
