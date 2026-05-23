// LRU cache for parsed GLSL ASTs, keyed by exact source string.
// Per CONTRACTS.md §2: parse(src) returns the same object reference for the
// same input. Broken sources do not throw — they return an empty AST so
// downstream findLiterals / findPatterns can return [].
//
// We don't depend on the parser package directly; consumers pass a parser fn.

const CAPACITY = 32;

export type AstFactory<A> = (src: string) => A | null;

export class AstCache<A> {
  private parse: AstFactory<A>;
  private empty: A;
  private map = new Map<string, A>();

  constructor(parser: AstFactory<A>, emptySentinel: A) {
    this.parse = parser;
    this.empty = emptySentinel;
  }

  get(src: string): A {
    if (this.map.has(src)) {
      // bump LRU — re-insert moves to end
      const v = this.map.get(src) as A;
      this.map.delete(src);
      this.map.set(src, v);
      return v;
    }

    let ast: A | null;
    try {
      ast = this.parse(src);
    } catch {
      ast = null;
    }
    const value = ast ?? this.empty;

    this.map.set(src, value);
    if (this.map.size > CAPACITY) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    return value;
  }

  size(): number {
    return this.map.size;
  }
}
