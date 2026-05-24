import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Mascot } from '@/ux/Mascot';
import type { MascotMood } from '@/ux/Mascot';
import { SHADE, TYPE } from './tokens';

// A single fixed-position mascot that drifts around the viewport with
// physics. Reacts to ten different mouse/idle situations, types out fun
// facts character by character, and occasionally floats off-screen.

type RoamState =
  | 'drifting'
  | 'fleeing'
  | 'thinking'
  | 'speaking'
  | 'sleeping'
  | 'launching'
  | 'dizzy'
  | 'offscreen'
  | 'startled'
  | 'spinning';

type BubbleKind = 'fact' | 'protest' | 'startled' | 'dizzy' | 'launch' | 'sleep' | 'wake' | 'spin' | null;

const FACTS = [
  'A fragment shader runs on every single pixel in parallel. Your screen is a million tiny programs.',
  'WebGL exposes your GPU directly to the browser. No plugin. No install. Shaders run native.',
  'Procedural noise was invented by Ken Perlin in 1983 for the movie Tron. We still use it everywhere.',
  'Alan Turing predicted reaction-diffusion patterns in 1952. The math still holds up.',
  'A 60 fps shader has 16.6 milliseconds to compute every pixel on your screen.',
  'OpenGL turned 33 this year. GLSL is younger though — born in 2004.',
  'Modern GPUs run trillions of floating-point operations per second. Trillions, plural.',
  'Fragment shaders are pure functions: same inputs always produce the same output.',
  'GLSL uniforms are passed once per draw call. Attributes per vertex. Varyings per fragment.',
  'A texture lookup is the most expensive operation in a fragment shader. Use it wisely.',
  'Shadertoy launched in 2013. Over 100,000 shaders later, it is still the heart of the scene.',
  "The 'smoothstep' function is GLSL's secret weapon. Soft edges from one line of math.",
];

const PROTEST = [
  'Hey! Stop that!',
  'Personal space, please.',
  'Watch the cursor!',
  "I'm trying to think here.",
  'Boundaries, friend.',
  "I'm not a target!",
  'Cut it out!',
];

const STARTLED_MSGS = ['Whoa! I was sleeping!', "Wha—? Who's there?", 'Wake-up call, huh?'];
const DIZZY_MSGS = ['Okay, okay, easy now.', 'Stop spinning me!', 'Too much! Too much!'];
const LAUNCH_MSGS = ['Wheeee!', 'Off I goooo!', 'To infinity!', "Catch me if you can!"];
const WAKE_MSGS = ['oh hi!', 'good morning!', '...what did I miss?'];
const SPIN_MSGS = ['woooo!', 'making me spin?'];
const OFFSCREEN_GOODBYE = ['Back in a bit!', 'brb — fetching pixels'];

const pick = <T,>(arr: readonly T[]): T => {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i] as T;
};

const MASCOT_SIZE = 120;

export const RoamingMascot = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Physics state lives in refs to avoid re-rendering at 60fps
  const pos = useRef({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0 });
  const mouse = useRef({ x: -9999, y: -9999, px: -9999, py: -9999, lastMove: performance.now() });
  const stateRef = useRef<RoamState>('drifting');
  const bubbleKindRef = useRef<BubbleKind>(null);
  const offScreenUntil = useRef(0);
  const lastFactAt = useRef(performance.now() + 4_000);
  const lastProtestAt = useRef(0);
  const clickStreak = useRef<number[]>([]);
  const factIdx = useRef(Math.floor(Math.random() * FACTS.length));
  const initialized = useRef(false);
  const bubbleSideRef = useRef<'left' | 'right'>('left');

  // Width budget the bubble + gap needs (max bubble width + gutter)
  const BUBBLE_RESERVE = 380;
  // Tracks whether the current bubble should freeze the mascot in place.
  // Some bubble kinds (launch / spin / wake) play out WHILE moving, so they
  // shouldn't zero velocity or trigger the 0G early-return in the loop.
  const bubbleFrozenRef = useRef(false);

  // ── Visit lifecycle ─────────────────────────────────────────────────
  // The mascot doesn't follow forever. Pattern:
  //   - visits for ~30s (drift, maybe one thought, maybe sleep)
  //   - leaves the viewport
  //   - stays away ~90-150s
  //   - returns and the cycle repeats
  type LifecyclePhase = 'visiting' | 'leaving' | 'away';
  const lifecycle = useRef<LifecyclePhase>('visiting');
  const visitStartedAt = useRef(performance.now());
  const VISIT_DURATION = 30_000;
  const awayDuration = () => 90_000 + Math.random() * 60_000;

  // React state — only updated on real transitions
  const [mood, setMood] = useState<MascotMood>('happy');
  const [bubbleKind, setBubbleKind] = useState<BubbleKind>(null);
  const [bubbleFull, setBubbleFull] = useState('');
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleSide, setBubbleSide] = useState<'left' | 'right'>('left');
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);

  // ── Initialize position (DOCUMENT-space coordinates) ───────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    pos.current.x = window.innerWidth - 200;
    pos.current.y = window.scrollY + Math.min(240, window.innerHeight - 240);
    pos.current.vx = -0.6;
    pos.current.vy = 0.4;
  }, []);

  // ── Typing animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!bubbleFull) {
      setBubbleText('');
      return;
    }
    if (bubbleText === bubbleFull) return;
    const idx = bubbleText.length;
    const nextChar = bubbleFull.charAt(idx);
    const delay =
      nextChar === ' ' ? 30 :
      nextChar === '.' || nextChar === ',' || nextChar === '!' || nextChar === '?' ? 140 :
      24 + Math.random() * 28;
    const t = setTimeout(() => setBubbleText(bubbleFull.slice(0, idx + 1)), delay);
    return () => clearTimeout(t);
  }, [bubbleText, bubbleFull]);

  // ── Helpers to manage bubble + state in sync ─────────────────────────
  const setState = (s: RoamState) => { stateRef.current = s; };
  const openBubble = (kind: BubbleKind, text: string, freeze: boolean = true) => {
    bubbleFrozenRef.current = freeze;

    if (freeze) {
      // Freeze motion — mascot floats in 0G while talking
      pos.current.vx = 0;
      pos.current.vy = 0;
      pos.current.vrot = 0;

      // Pick the side that has room for the bubble at the current x
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const p = pos.current;
      let side: 'left' | 'right' = p.x > w / 2 ? 'left' : 'right';
      if (side === 'right' && (w - p.x) < BUBBLE_RESERVE) side = 'left';
      if (side === 'left' && p.x < BUBBLE_RESERVE) side = 'right';

      if (side === 'right') {
        const maxX = w - BUBBLE_RESERVE;
        if (p.x > maxX) p.x = maxX;
      } else {
        const minX = BUBBLE_RESERVE;
        if (p.x < minX) p.x = minX;
      }

      bubbleSideRef.current = side;
      setBubbleSide(side);
    }
    // (for non-frozen bubbles, side is updated each frame by the physics loop)

    bubbleKindRef.current = kind;
    setBubbleKind(kind);
    setBubbleFull(text);
    setBubbleText('');
  };

  const closeBubble = () => {
    bubbleKindRef.current = null;
    bubbleFrozenRef.current = false;
    setBubbleKind(null);
    setBubbleFull('');
    setBubbleText('');
  };

  // ── Mouse tracking (converted to document coords) ────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.px = mouse.current.x;
      mouse.current.py = mouse.current.y;
      mouse.current.x = e.clientX + window.scrollX;
      mouse.current.y = e.clientY + window.scrollY;
      mouse.current.lastMove = performance.now();
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // ── Click on mascot — launch / startle / dizzy / spin ────────────────
  const onMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = performance.now();

    // Track clicks for dizziness
    clickStreak.current = clickStreak.current.filter((t) => now - t < 2200);
    clickStreak.current.push(now);

    // Wake up if sleeping
    if (stateRef.current === 'sleeping') {
      setState('startled');
      setMood('thinking');
      openBubble('startled', pick(STARTLED_MSGS));
      pos.current.vx = (Math.random() - 0.5) * 7;
      pos.current.vy = -4;
      setTimeout(() => {
        if (stateRef.current === 'startled') {
          setState('drifting');
          setMood('happy');
          setTimeout(() => {
            if (bubbleKindRef.current === 'startled') closeBubble();
          }, 700);
        }
      }, 2000);
      return;
    }

    // Too many rapid clicks → dizzy spin
    if (clickStreak.current.length >= 4) {
      setState('dizzy');
      setMood('thinking');
      openBubble('dizzy', pick(DIZZY_MSGS));
      pos.current.vrot = (Math.random() > 0.5 ? 1 : -1) * 0.35;
      setTimeout(() => {
        if (stateRef.current === 'dizzy') {
          setState('drifting');
          setMood('happy');
          pos.current.vrot = 0;
          setTimeout(() => {
            if (bubbleKindRef.current === 'dizzy') closeBubble();
          }, 600);
        }
      }, 2400);
      return;
    }

    // Double-click → spin
    if (clickStreak.current.length === 2 && now - (clickStreak.current[0] ?? 0) < 350) {
      setState('spinning');
      setMood('happy');
      openBubble('spin', pick(SPIN_MSGS), false); // keeps spinning while talking
      pos.current.vrot = (Math.random() > 0.5 ? 1 : -1) * 0.5;
      setTimeout(() => {
        if (stateRef.current === 'spinning') {
          setState('drifting');
          pos.current.vrot = 0;
          setTimeout(() => {
            if (bubbleKindRef.current === 'spin') closeBubble();
          }, 600);
        }
      }, 1400);
      return;
    }

    // Default: launch in a random direction (balloon flick)
    setState('launching');
    setMood('happy');
    const angle = Math.random() * Math.PI * 2;
    const speed = 11 + Math.random() * 5;
    pos.current.vx = Math.cos(angle) * speed;
    pos.current.vy = Math.sin(angle) * speed;
    pos.current.vrot = (Math.random() - 0.5) * 0.25;
    openBubble('launch', pick(LAUNCH_MSGS), false); // moves with the launch
    setTimeout(() => {
      if (stateRef.current === 'launching') {
        setState('drifting');
        pos.current.vrot = 0;
        setTimeout(() => {
          if (bubbleKindRef.current === 'launch') closeBubble();
        }, 600);
      }
    }, 1200);
  };

  // ── Main animation + behavior loop ───────────────────────────────────
  useEffect(() => {
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const now = performance.now();
      const p = pos.current;
      const m = mouse.current;
      const s = stateRef.current;

      // Bubble open AND should freeze → zero-G float. Skip physics entirely,
      // just bob gently and keep the mascot positioned so the bubble fits.
      // Launch / spin / wake bubbles don't freeze — they play out in motion.
      if (bubbleKindRef.current && bubbleFrozenRef.current) {
        const tt = now / 1000;
        p.y += Math.sin(tt * 0.9) * 0.06;
        p.x += Math.sin(tt * 0.7 + 1.3) * 0.03;

        // Re-clamp so the bubble can't slip off-screen
        if (bubbleSideRef.current === 'right') {
          const maxX = w - BUBBLE_RESERVE;
          if (p.x > maxX) p.x = maxX;
          if (p.x < 80) p.x = 80;
        } else {
          const minX = BUBBLE_RESERVE;
          if (p.x < minX) p.x = minX;
          if (p.x > w - 80) p.x = w - 80;
        }
        // keep vertically inside viewport
        if (p.y < 100) p.y = 100;
        if (p.y > h - 140) p.y = h - 140;

        if (containerRef.current) {
          containerRef.current.style.transform =
            `translate(${p.x - MASCOT_SIZE / 2}px, ${p.y - MASCOT_SIZE / 2}px) rotate(${(p.rot * 180) / Math.PI}deg)`;
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      // Away — wait until return time, then re-enter near the current viewport
      if (s === 'offscreen') {
        if (now >= offScreenUntil.current) {
          const sy = window.scrollY;
          const edge = Math.floor(Math.random() * 4);
          // Place just inside an edge of the user's CURRENT viewport (doc coords)
          if (edge === 0)      { p.x = -100;     p.y = sy + 120 + Math.random() * (h - 240); p.vx = 3.0;  p.vy = (Math.random() - 0.5) * 0.6; }
          else if (edge === 1) { p.x = w + 100;  p.y = sy + 120 + Math.random() * (h - 240); p.vx = -3.0; p.vy = (Math.random() - 0.5) * 0.6; }
          else if (edge === 2) { p.x = 120 + Math.random() * (w - 240); p.y = sy - 100;      p.vx = (Math.random() - 0.5) * 0.6; p.vy = 3.0; }
          else                  { p.x = 120 + Math.random() * (w - 240); p.y = sy + h + 100;   p.vx = (Math.random() - 0.5) * 0.6; p.vy = -3.0; }
          setState('drifting');
          setMood('happy');
          lifecycle.current = 'visiting';
          visitStartedAt.current = now;
          // delay a fact a bit so the appearance reads first
          lastFactAt.current = now - 10_000;
          openBubble('wake', pick(WAKE_MSGS), false); // drifts in while saying hi
          setTimeout(() => {
            if (bubbleKindRef.current === 'wake') closeBubble();
          }, 2200);
          setVisible(true);
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      // Mouse proximity & speed
      const dxm = p.x - m.x;
      const dym = p.y - m.y;
      const distM = Math.sqrt(dxm * dxm + dym * dym);
      const mouseSpeed = Math.sqrt((m.x - m.px) ** 2 + (m.y - m.py) ** 2);

      // Mouse repulsion when close — gentle, balloon-like
      if (distM < 160 && distM > 0 && (s === 'drifting' || s === 'fleeing' || s === 'thinking' || s === 'speaking')) {
        const force = (1 - distM / 160) * 0.75;
        p.vx += (dxm / distM) * force;
        p.vy += (dym / distM) * force;
      }

      // Enter fleeing on fast nearby mouse movement
      if (
        distM < 180 &&
        mouseSpeed > 4 &&
        (s === 'drifting' || s === 'thinking') &&
        bubbleKindRef.current !== 'protest' &&
        now - lastProtestAt.current > 5_000
      ) {
        setState('fleeing');
        setMood('thinking');
        openBubble('protest', pick(PROTEST));
        lastProtestAt.current = now;
        setTimeout(() => {
          if (stateRef.current === 'fleeing') {
            setState('drifting');
            setMood('happy');
            setTimeout(() => {
              if (bubbleKindRef.current === 'protest') closeBubble();
            }, 600);
          }
        }, 2200);
      }

      // Idle → sleep
      const idle = now - m.lastMove;
      if (idle > 22_000 && s === 'drifting' && !bubbleKindRef.current) {
        setState('sleeping');
        setMood('sleeping');
        openBubble('sleep', 'zZz…');
      }

      // Wake on mouse motion (only if sleeping naturally — not via click)
      if (s === 'sleeping' && idle < 600) {
        setState('drifting');
        setMood('happy');
        closeBubble();
      }

      // Periodically speak a fact (drifting only)
      if (
        s === 'drifting' &&
        !bubbleKindRef.current &&
        now - lastFactAt.current > 16_000
      ) {
        // Enter thinking pose first
        setState('thinking');
        setMood('thinking');
        lastFactAt.current = now;
        const thinkingDelay = 1200;
        const displayDelay = 8000; // how long the typed message stays after typing
        setTimeout(() => {
          if (stateRef.current === 'thinking') {
            setState('speaking');
            setMood('happy');
            factIdx.current = (factIdx.current + 1) % FACTS.length;
            openBubble('fact', FACTS[factIdx.current] ?? FACTS[0] ?? '');
          }
        }, thinkingDelay);
        setTimeout(() => {
          if (stateRef.current === 'speaking') {
            setState('drifting');
            setMood('happy');
            setTimeout(() => {
              if (bubbleKindRef.current === 'fact') closeBubble();
            }, 600);
            lastFactAt.current = performance.now();
          }
        }, thinkingDelay + displayDelay);
      }

      // Visit lifecycle — leave when visit duration is up
      if (
        lifecycle.current === 'visiting' &&
        now - visitStartedAt.current > VISIT_DURATION &&
        s === 'drifting' &&
        !bubbleKindRef.current
      ) {
        lifecycle.current = 'leaving';
        setState('launching');
        setMood('happy');
        openBubble('launch', pick(OFFSCREEN_GOODBYE), false); // travels off-screen
        // set velocity AFTER openBubble so freeze (if any) doesn't zero it.
        // Cranked up from 9 so the mascot reliably clears the viewport even
        // on wide screens within the 8s safety window below.
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) p.vx = -14;
        else if (edge === 1) p.vx = 14;
        else if (edge === 2) p.vy = -14;
        else p.vy = 14;

        const finishLeaving = () => {
          setState('offscreen');
          lifecycle.current = 'away';
          setVisible(false);
          closeBubble();
          offScreenUntil.current = performance.now() + awayDuration();
        };

        // Watch for it leaving the current viewport (in document coords)
        const check = setInterval(() => {
          const sx = window.scrollX;
          const sy = window.scrollY;
          const vx = p.x - sx;
          const vy = p.y - sy;
          const cw = window.innerWidth;
          const ch = window.innerHeight;
          if (vx < -180 || vx > cw + 180 || vy < -180 || vy > ch + 180) {
            clearInterval(check);
            finishLeaving();
          }
        }, 80);
        // Safety: if it still hasn't reached the edge (e.g., something
        // resisting), force the transition so the bubble doesn't linger.
        setTimeout(() => {
          clearInterval(check);
          if (lifecycle.current === 'leaving') finishLeaving();
        }, 8_000);
      }

      // Lazy viewport follow — when scrolled far away, drift toward viewport.
      // Eventually (not immediately) catches up.
      if (s === 'drifting' && lifecycle.current === 'visiting' && !bubbleKindRef.current) {
        const sy = window.scrollY;
        const vpCY = sy + h / 2;
        const dy = vpCY - p.y;
        const absDy = Math.abs(dy);
        if (absDy > h * 0.32) {
          // Force ramps with distance — far away pulls harder, but capped.
          const farFactor = Math.min(1.0, absDy / (h * 1.4));
          const force = 0.06 + farFactor * 0.22;
          p.vy += Math.sign(dy) * force;
        }
      }

      // Stay out of the central reading column — soft lateral force only.
      if (s !== 'launching') {
        const exclusionHalfW = Math.max(220, w * 0.28);
        const cx = w / 2;
        const dxFromCx = p.x - cx;
        const insideExclusion = Math.abs(dxFromCx) < exclusionHalfW;
        if (insideExclusion) {
          const sideSign =
            Math.abs(p.vx) > 0.15 ? Math.sign(p.vx) :
            dxFromCx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dxFromCx);
          const depth = 1 - Math.abs(dxFromCx) / exclusionHalfW;
          // much softer than before
          p.vx += sideSign * (0.05 + depth * 0.14);
        } else {
          const targetX = dxFromCx > 0 ? w - 140 : 140;
          p.vx += Math.sign(targetX - p.x) * 0.008;
        }
        const cy = h / 2;
        const toCy = cy - p.y;
        if (Math.abs(toCy) > h * 0.32) {
          p.vy += Math.sign(toCy) * 0.02;
        }
      }

      // Tiny wobble — barely there, so it floats like a balloon
      if (s === 'drifting' || s === 'sleeping' || s === 'thinking' || s === 'speaking') {
        p.vx += (Math.random() - 0.5) * 0.025;
        p.vy += (Math.random() - 0.5) * 0.025;
      }

      // Drag — heavier than before so velocities die down faster
      const drag = s === 'sleeping' ? 0.93 : s === 'launching' ? 0.99 : 0.965;
      p.vx *= drag;
      p.vy *= drag;

      // Rotation
      p.rot += p.vrot;
      p.vrot *= 0.96;

      // Cap velocity — slow ambient drift; launching can still rocket away.
      // When the mascot is far from the user's viewport, allow a higher cap
      // so lazy-follow actually catches up in a reasonable time.
      const farFromVp = Math.abs(window.scrollY + h / 2 - p.y) > h * 0.6;
      const maxV = s === 'launching' ? 18 : (farFromVp ? 4.8 : 2.4);
      const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (v > maxV) {
        p.vx = (p.vx / v) * maxV;
        p.vy = (p.vy / v) * maxV;
      }

      // Step
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off edges unless launching off-screen
      const margin = 80;
      if (s !== 'launching') {
        if (p.x < margin)         { p.x = margin;       p.vx = Math.abs(p.vx) * 0.6 + 0.5; }
        if (p.x > w - margin)     { p.x = w - margin;   p.vx = -Math.abs(p.vx) * 0.6 - 0.5; }
        if (p.y < margin)         { p.y = margin;       p.vy = Math.abs(p.vy) * 0.6 + 0.5; }
        if (p.y > h - margin - 40){ p.y = h - margin - 40; p.vy = -Math.abs(p.vy) * 0.6 - 0.5; }
      }

      // Bubble side — only update when no bubble open (so it doesn't flip mid-speech)
      const newSide: 'left' | 'right' = p.x > w / 2 ? 'left' : 'right';
      if (bubbleSideRef.current !== newSide) {
        bubbleSideRef.current = newSide;
        setBubbleSide(newSide);
      }

      // Apply transform
      if (containerRef.current) {
        containerRef.current.style.transform =
          `translate(${p.x - MASCOT_SIZE / 2}px, ${p.y - MASCOT_SIZE / 2}px) rotate(${(p.rot * 180) / Math.PI}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        // absolute so we scroll with the document instead of being pinned
        position: 'absolute', top: 0, left: 0,
        zIndex: 70,
        pointerEvents: 'none',
        willChange: 'transform',
        // size matches mascot only — bubble is absolutely positioned beside it
        width: MASCOT_SIZE,
        height: MASCOT_SIZE,
      }}
    >
      <div
        onClick={onMascotClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'auto',
          cursor: 'grab',
          filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.5)) drop-shadow(0 0 24px rgba(252,180,39,0.15))',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transformOrigin: 'center',
          transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <Mascot
          mood={mood}
          size={MASCOT_SIZE}
          hoverReact={false}
          eyesFollow={mood !== 'sleeping' && mood !== 'thinking'}
          idle={mood !== 'sleeping'}
        />
      </div>
      {bubbleKind && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            // Anchor the bubble against the mascot edge that FACES it.
            // bubbleSide='left' → bubble appears to the LEFT of mascot,
            //   so its RIGHT edge is pinned and it grows leftward.
            ...(bubbleSide === 'left'
              ? { right: MASCOT_SIZE + 14 }
              : { left:  MASCOT_SIZE + 14 }),
          }}
        >
          <Bubble kind={bubbleKind} side={bubbleSide} text={bubbleText} typing={bubbleText !== bubbleFull} />
        </div>
      )}
    </div>
  );
};

// ─── Speech bubble ───────────────────────────────────────────────────────
const Bubble = ({
  kind, side, text, typing,
}: {
  kind: NonNullable<BubbleKind>;
  side: 'left' | 'right';
  text: string;
  typing: boolean;
}) => {
  const accent =
    kind === 'protest' ? 'rgba(229, 92, 92, 0.50)' :
    kind === 'dizzy'   ? 'rgba(252, 180, 39, 0.50)' :
    kind === 'sleep'   ? 'rgba(180, 180, 200, 0.30)' :
    kind === 'launch' || kind === 'spin' ? 'rgba(252, 180, 39, 0.50)' :
    'rgba(252, 180, 39, 0.30)';
  const eyebrow =
    kind === 'fact'     ? 'Fun fact' :
    kind === 'protest'  ? '⚠ Hey!' :
    kind === 'dizzy'    ? '😵' :
    kind === 'startled' ? '!' :
    kind === 'wake'     ? '☀' :
    kind === 'spin'     ? '↻' :
    null;
  const eyebrowColor =
    kind === 'protest' ? '#ff8a8a' :
    SHADE.gold;
  return (
    <div
      style={{
        position: 'relative',
        marginTop: 14,
        maxWidth: 340,
        minWidth: 140,
        background: 'rgba(20, 18, 14, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${accent}`,
        borderRadius: 10,
        padding: '11px 14px',
        pointerEvents: 'auto',
        animation: 'shaddyBubbleIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        color: SHADE.cream,
        font: `400 13px ${TYPE.body}`,
        lineHeight: 1.5,
        letterSpacing: '0.005em',
      } as CSSProperties}
    >
      {eyebrow && (
        <span
          style={{
            display: 'block',
            font: `700 9px ${TYPE.bodyMono}`,
            color: eyebrowColor, letterSpacing: '0.22em', textTransform: 'uppercase',
            marginBottom: 5,
          }}
        >
          {eyebrow}
        </span>
      )}
      <span>
        {text || (typing ? '' : '')}
        {typing && (
          <span
            style={{
              display: 'inline-block',
              width: 1, height: '1em',
              marginLeft: 2,
              borderLeft: `2px solid ${SHADE.gold}`,
              transform: 'translateY(2px)',
              animation: 'shaddyCaret 0.85s steps(1) infinite',
            }}
          />
        )}
      </span>
      {/* tail on the bubble edge that FACES the mascot */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          // bubbleSide=left means bubble is on left of mascot → tail on bubble's right edge
          [side === 'left' ? 'right' : 'left']: -6,
          top: eyebrow ? 28 : 18,
          width: 11, height: 11,
          background: 'rgba(20, 18, 14, 0.92)',
          ...(side === 'left'
            ? { borderTop: `1px solid ${accent}`, borderRight: `1px solid ${accent}` }
            : { borderBottom: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` }),
          transform: 'rotate(45deg)',
        } as CSSProperties}
      />
    </div>
  );
};

// ─── Helper to add the bubble + caret keyframes once ─────────────────────
const KEYFRAMES_ID = 'shaddy-roaming-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes shaddyBubbleIn {
      from { opacity: 0; transform: scale(0.86) translateY(4px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);   }
    }
    @keyframes shaddyCaret {
      0%, 50%   { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
