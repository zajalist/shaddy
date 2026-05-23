// Normalize gl.getShaderInfoLog() output into structured GLSLError records.
//
// Drivers in the wild produce three notable formats:
//
//   ANGLE  (Windows/Chrome):   ERROR: 0:13: 'foo' : undeclared identifier
//   Apple/WebKit:              ERROR: 0:13: 'foo' : undeclared identifier
//   Mesa   (Linux/some FF):    0(13) : error C0000: syntax error
//
// The leading "0" is the source-string index. The renderer only ever
// sends one source string, so it is always 0 — we just use it as an
// anchor for the regex.
//
// Line numbers in the log are *wrapped* — i.e., they index into the
// preamble + user-source concatenation. The caller subtracts
// `userLineOffset` so the editor surface gets user-visible coordinates.

import type { GLSLError } from '../index';

// ANGLE / Apple:  "ERROR: 0:LINE: REST" or "WARNING: 0:LINE: REST"
const ANGLE = /^(?:ERROR|WARNING):\s*0:(\d+):\s*(.*)$/i;

// Mesa:  "0(LINE) : error|warning REST"
const MESA = /^0\((\d+)\)\s*:\s*(?:error|warning)?\s*(.*)$/i;

export function parseGlslErrors(infoLog: string, userLineOffset: number): GLSLError[] {
  const trimmed = infoLog.trim();
  if (!trimmed) {
    return [{ line: 1, column: 1, message: 'shader compile failed' }];
  }

  const out: GLSLError[] = [];

  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const angle = ANGLE.exec(line);
    if (angle) {
      const wrapped = Number(angle[1]);
      out.push({
        line: clampLine(wrapped - userLineOffset),
        column: 1,
        message: (angle[2] ?? '').trim(),
      });
      continue;
    }

    const mesa = MESA.exec(line);
    if (mesa) {
      const wrapped = Number(mesa[1]);
      out.push({
        line: clampLine(wrapped - userLineOffset),
        column: 1,
        message: (mesa[2] ?? '').trim(),
      });
      continue;
    }
  }

  if (out.length === 0) {
    // We couldn't parse anything — surface the whole log as one error so
    // the user still gets a signal in the editor surface.
    return [{ line: 1, column: 1, message: trimmed }];
  }

  return out;
}

function clampLine(n: number): number {
  return n < 1 || !Number.isFinite(n) ? 1 : n;
}
