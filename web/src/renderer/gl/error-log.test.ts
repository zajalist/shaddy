import { describe, expect, it } from 'vitest';
import { parseGlslErrors } from './error-log';
import { USER_LINE_OFFSET } from './preamble';

const OFFSET = USER_LINE_OFFSET; // 7 today, but the tests track the constant.

describe('parseGlslErrors', () => {
  describe('ANGLE / Apple format', () => {
    it('extracts line + message from "ERROR: 0:LINE:"', () => {
      const log = "ERROR: 0:13: 'foo' : undeclared identifier";
      expect(parseGlslErrors(log, OFFSET)).toEqual([
        { line: 13 - OFFSET, column: 1, message: "'foo' : undeclared identifier" },
      ]);
    });

    it('treats WARNING the same shape as ERROR', () => {
      const log = "WARNING: 0:20: 'highp' precision suffix is redundant";
      expect(parseGlslErrors(log, OFFSET)[0]?.line).toBe(20 - OFFSET);
    });
  });

  describe('Mesa format', () => {
    it('extracts line + message from "0(LINE) : error"', () => {
      const log = '0(13) : error C0000: syntax error';
      expect(parseGlslErrors(log, OFFSET)).toEqual([
        { line: 13 - OFFSET, column: 1, message: 'C0000: syntax error' },
      ]);
    });

    it('accepts the format without an explicit "error" word', () => {
      const log = '0(15) : something opaque';
      expect(parseGlslErrors(log, OFFSET)[0]?.line).toBe(15 - OFFSET);
    });
  });

  describe('synthetic broken shaders (per issue #7 acceptance)', () => {
    it('missing semicolon — ANGLE log shape', () => {
      const log = "ERROR: 0:9: ';' : syntax error";
      const e = parseGlslErrors(log, OFFSET)[0];
      expect(e?.line).toBe(9 - OFFSET);
      expect(e?.message).toContain("';'");
    });

    it("undefined identifier — ANGLE log shape", () => {
      const log = "ERROR: 0:11: 'bogusFunc' : no matching overloaded function found";
      const e = parseGlslErrors(log, OFFSET)[0];
      expect(e?.line).toBe(11 - OFFSET);
      expect(e?.message).toContain('bogusFunc');
    });

    it("wrong vec arity — ANGLE log shape", () => {
      const log = "ERROR: 0:14: 'constructor' : too few arguments for vec3";
      const e = parseGlslErrors(log, OFFSET)[0];
      expect(e?.line).toBe(14 - OFFSET);
      expect(e?.message).toContain('vec3');
    });
  });

  describe('multi-error logs', () => {
    it('returns one GLSLError per parseable line', () => {
      const log = [
        "ERROR: 0:10: 'a' : undeclared identifier",
        "ERROR: 0:12: 'b' : undeclared identifier",
        "ERROR: 0:14: 'c' : undeclared identifier",
      ].join('\n');
      const errs = parseGlslErrors(log, OFFSET);
      expect(errs.length).toBe(3);
      expect(errs.map((e) => e.line)).toEqual([10, 12, 14].map((n) => n - OFFSET));
    });

    it('mixes ANGLE and Mesa shapes in the same log', () => {
      const log = ["ERROR: 0:8: 'x' : undeclared", '0(11) : error C0001: bad token'].join('\n');
      const errs = parseGlslErrors(log, OFFSET);
      expect(errs.length).toBe(2);
      expect(errs[0]?.line).toBe(8 - OFFSET);
      expect(errs[1]?.line).toBe(11 - OFFSET);
    });
  });

  describe('edge cases', () => {
    it('clamps preamble-internal errors to line 1 (no negative lines)', () => {
      const log = 'ERROR: 0:3: bad version';
      expect(parseGlslErrors(log, OFFSET)[0]?.line).toBe(1);
    });

    it('returns a single generic GLSLError for unparseable logs', () => {
      const log = 'something opaque the driver invented';
      expect(parseGlslErrors(log, OFFSET)).toEqual([
        { line: 1, column: 1, message: 'something opaque the driver invented' },
      ]);
    });

    it('returns a generic error for an empty log', () => {
      expect(parseGlslErrors('', OFFSET)).toEqual([
        { line: 1, column: 1, message: 'shader compile failed' },
      ]);
    });

    it('handles CRLF line endings', () => {
      const log = "ERROR: 0:10: 'a'\r\nERROR: 0:11: 'b'";
      expect(parseGlslErrors(log, OFFSET).length).toBe(2);
    });

    it('ignores stray blank lines in the log', () => {
      const log = "\n\nERROR: 0:10: 'a'\n\n";
      const errs = parseGlslErrors(log, OFFSET);
      expect(errs.length).toBe(1);
    });
  });
});
