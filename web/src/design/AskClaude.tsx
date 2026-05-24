// "Ask Claude" popover — dev-only AI-assisted shader rewriting.
//
// The user types a natural-language instruction; we POST the current shader
// + the instruction to the local Vite dev plugin (/__claude_ask), which
// shells out to the user's `claude` CLI and pipes the rewritten shader back.
//
// All of this only works under `npm run dev` — there's no auth, no API key,
// and no production endpoint. See vite.config.ts for the proxy.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { SHADE, TYPE } from './tokens';

export type AskClaudeProps = {
  open: boolean;
  /** Full GLSL source the user sees in the code drawer (preamble + body). */
  glsl: string;
  onClose: () => void;
  /** Apply the new full GLSL source back through the reparse pipeline. */
  onReplace: (newGlsl: string) => void;
  /** Anchor element — popover positions below-right of it. */
  anchorRef?: React.RefObject<HTMLElement | null>;
};

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; startedAt: number }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; suggestion: string };

const POPOVER_WIDTH = 420;
const ENDPOINT = '/__claude_ask';

export const AskClaude = ({ open, glsl, onClose, onReplace, anchorRef }: AskClaudeProps) => {
  const [instruction, setInstruction] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when the popover opens.
  useEffect(() => {
    if (open) {
      // requestAnimationFrame so the element is mounted + visible first.
      const id = window.requestAnimationFrame(() => textareaRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  // Elapsed-seconds tick during in-flight requests.
  useEffect(() => {
    if (phase.kind !== 'loading') {
      setElapsed(0);
      return undefined;
    }
    const start = phase.startedAt;
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  // Click-outside to close. We compare against the popover ref and the
  // anchor (so clicking the button that opened us doesn't immediately
  // close + reopen).
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (popoverRef.current && target && popoverRef.current.contains(target)) return;
      if (anchorRef?.current && target && anchorRef.current.contains(target)) return;
      onClose();
    };
    // Defer one tick so the click that opened the popover doesn't close it.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDocClick);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open, onClose, anchorRef]);

  // Esc to close. Inside the textarea Esc should also close — globally fine.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const text = instruction.trim();
    if (text.length === 0) return;
    if (phase.kind === 'loading') return;

    setPhase({ kind: 'loading', startedAt: Date.now() });
    try {
      const prompt = buildPrompt(glsl, text);
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      // Read text first — error responses are JSON too, but we want to be
      // defensive against the dev plugin returning HTML for a 404 etc.
      const raw = await res.text();
      let parsed: { result?: string; error?: string; stderr?: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        setPhase({
          kind: 'error',
          message: 'Non-JSON response (HTTP ' + res.status + '): ' + raw.slice(0, 300),
        });
        return;
      }
      if (!res.ok) {
        const msg = parsed.error ?? 'HTTP ' + res.status;
        const extra = parsed.stderr ? ' — ' + parsed.stderr.split('\n')[0] : '';
        setPhase({ kind: 'error', message: msg + extra });
        return;
      }
      const suggestion = stripCodeFences(parsed.result ?? '').trim();
      if (suggestion.length === 0) {
        setPhase({ kind: 'error', message: 'Claude returned an empty response.' });
        return;
      }
      setPhase({ kind: 'ready', suggestion });
    } catch (e) {
      setPhase({ kind: 'error', message: String(e) });
    }
  };

  const apply = () => {
    if (phase.kind !== 'ready') return;
    onReplace(phase.suggestion);
    setPhase({ kind: 'idle' });
    setInstruction('');
    onClose();
  };

  const cancelSuggestion = () => {
    setPhase({ kind: 'idle' });
  };

  const isLoading = phase.kind === 'loading';

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Ask Claude"
      data-testid="ask-claude-popover"
      style={popoverStyle}
    >
      <div style={headerStyle}>
        <Sparkle size={13} color={SHADE.gold} />
        <span
          style={{
            font: `700 11px ${TYPE.body}`,
            color: SHADE.cream,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          Ask Claude
        </span>
        <span style={{ marginLeft: 'auto', font: `500 10px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.55)' }}>
          dev only · local CLI
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={closeBtnStyle}
        >
          ✕
        </button>
      </div>

      <div style={bodyStyle}>
        <label
          htmlFor="ask-claude-instruction"
          style={{
            font: `600 10px ${TYPE.body}`,
            color: SHADE.textDim,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 6,
          }}
        >
          Describe a change
        </label>
        <textarea
          id="ask-claude-instruction"
          ref={textareaRef}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder='e.g. "make the colors more vibrant", "add a slow pulse"'
          rows={3}
          disabled={isLoading}
          style={textareaStyle}
        />

        {phase.kind === 'error' && (
          <div data-testid="ask-claude-error" style={errorStyle}>
            {phase.message}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => void submit()}
            disabled={isLoading || instruction.trim().length === 0}
            data-testid="ask-claude-submit"
            style={{
              ...primaryBtnStyle,
              opacity: isLoading || instruction.trim().length === 0 ? 0.55 : 1,
              cursor: isLoading || instruction.trim().length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? <Spinner /> : <Sparkle size={11} color="#1a1208" />}
            <span>{isLoading ? 'Asking…' : 'Ask'}</span>
          </button>
          {isLoading && (
            <span
              data-testid="ask-claude-elapsed"
              style={{ font: `500 10.5px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.55)' }}
            >
              {elapsed}s
            </span>
          )}
          <span style={{ marginLeft: 'auto', font: `500 10px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.45)' }}>
            ⌘↵ to send
          </span>
        </div>

        {phase.kind === 'ready' && (
          <div style={{ marginTop: 12 }} data-testid="ask-claude-preview">
            <div
              style={{
                font: `600 10px ${TYPE.body}`,
                color: SHADE.textDim,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Suggested shader</span>
              <span style={{ color: 'rgba(254,231,199,0.45)', letterSpacing: '0.06em', textTransform: 'none' }}>
                {phase.suggestion.split('\n').length} lines
              </span>
            </div>
            <pre style={previewStyle}>{phase.suggestion}</pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={apply}
                data-testid="ask-claude-apply"
                style={primaryBtnStyle}
              >
                Apply
              </button>
              <button onClick={cancelSuggestion} style={secondaryBtnStyle}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Prompt template ────────────────────────────────────────────────────

function buildPrompt(glsl: string, instruction: string): string {
  return [
    'You are a GLSL ES 3.0 fragment shader editor. The user wants to modify their shader.',
    '',
    'Current shader:',
    '<<<',
    glsl,
    '>>>',
    '',
    'User\'s request: ' + instruction,
    '',
    'Rewrite the shader to satisfy the request. PRESERVE THE STRUCTURE: keep the',
    '`#version`, the `precision`, the existing `uniform float u_time;`, `uniform vec2',
    'u_resolution;`, `in vec2 v_uv;`, `out vec4 fragColor;` declarations, and the',
    '`//#card ...` magic-comment markers. You may add new uniforms only if the user',
    'explicitly asked. Output ONLY the new shader source, no prose, no fences.',
  ].join('\n');
}

// Claude sometimes wraps output in ```glsl … ``` despite being asked not to.
function stripCodeFences(raw: string): string {
  let s = raw.trim();
  // Leading fence — language tag optional.
  const leading = s.match(/^```[a-zA-Z0-9_-]*\s*\n/);
  if (leading) s = s.slice(leading[0].length);
  // Trailing fence.
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trimEnd();
}

// ─── Tiny inline UI bits ────────────────────────────────────────────────

const Sparkle = ({ size = 12, color = '#1a1208' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2 L13.8 9 L21 11 L13.8 13 L12 21 L10.2 13 L3 11 L10.2 9 Z" fill={color} />
    <path d="M19 3 L19.6 5.4 L22 6 L19.6 6.6 L19 9 L18.4 6.6 L16 6 L18.4 5.4 Z" fill={color} />
  </svg>
);

const Spinner = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#1a1208"
    strokeWidth="3"
    strokeLinecap="round"
    aria-hidden="true"
    style={{ animation: 'shaddy-spin 0.9s linear infinite' }}
  >
    <style>{`@keyframes shaddy-spin { to { transform: rotate(360deg); } }`}</style>
    <circle cx="12" cy="12" r="9" opacity="0.25" />
    <path d="M21 12 A9 9 0 0 0 12 3" />
  </svg>
);

// ─── Styles (inline, matches existing CodeDrawer aesthetic) ─────────────

const popoverStyle: CSSProperties = {
  // Anchored to the CodeDrawer-wrapping `position: relative` div: floats
  // above the drawer header (which is 44px tall) with a small gap.
  position: 'absolute',
  bottom: 52,
  right: 14,
  width: POPOVER_WIDTH,
  zIndex: 30,
  background: SHADE.surface4,
  border: `1px solid ${SHADE.border}`,
  borderRadius: 4,
  boxShadow: '0 18px 40px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column',
  color: SHADE.cream,
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  height: 36,
  flex: '0 0 auto',
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderBottom: `1px solid ${SHADE.border}`,
  background: 'rgba(0,0,0,0.18)',
};

const bodyStyle: CSSProperties = {
  padding: 12,
};

const closeBtnStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 3,
  background: 'transparent',
  color: 'rgba(254,231,199,0.55)',
  border: '1px solid rgba(254,231,199,0.18)',
  font: `600 11px ${TYPE.bodyMono}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: 64,
  resize: 'vertical',
  background: 'rgba(0,0,0,0.25)',
  color: SHADE.cream,
  border: '1px solid rgba(254,231,199,0.18)',
  borderRadius: 3,
  padding: '8px 10px',
  font: `400 12.5px ${TYPE.body}`,
  lineHeight: 1.45,
  outline: 'none',
  boxSizing: 'border-box',
};

const errorStyle: CSSProperties = {
  marginTop: 8,
  padding: '7px 9px',
  borderRadius: 3,
  background: 'rgba(181, 54, 94, 0.18)',
  border: '1px solid rgba(181, 54, 94, 0.55)',
  color: '#FFB7C5',
  font: `500 11.5px ${TYPE.bodyMono}`,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const primaryBtnStyle: CSSProperties = {
  background: SHADE.gold,
  color: '#1a1208',
  border: `1px solid ${SHADE.goldDeep ?? SHADE.gold}`,
  borderRadius: 3,
  padding: '6px 11px',
  font: `600 11px ${TYPE.body}`,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const secondaryBtnStyle: CSSProperties = {
  background: 'transparent',
  color: SHADE.cream,
  border: '1px solid rgba(254,231,199,0.20)',
  borderRadius: 3,
  padding: '6px 11px',
  font: `600 11px ${TYPE.body}`,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const previewStyle: CSSProperties = {
  margin: 0,
  maxHeight: 240,
  overflow: 'auto',
  background: 'rgba(0,0,0,0.30)',
  border: '1px solid rgba(254,231,199,0.14)',
  borderRadius: 3,
  padding: 10,
  color: SHADE.cream,
  font: `500 11.5px ${TYPE.bodyMono}`,
  lineHeight: 1.55,
  whiteSpace: 'pre',
};
