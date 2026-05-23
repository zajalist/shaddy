export type CompileResult = { ok: true } | { ok: false; errors: GLSLError[] };
export type GLSLError = { line: number; column: number; message: string; };
export type Uniform = { kind: 'float'; value: number };
export interface RendererAPI {
  mount(host: HTMLElement): void;
  compile(fragmentSource: string): CompileResult;
  setUniform(name: string, value: Uniform | null): void;
  resize(width: number, height: number): void;
  snapshot(): Promise<string>;
  onCompile(cb: (r: CompileResult) => void): () => void;
  getFps(): number;
}
export function createRenderer(): RendererAPI {
  throw new Error("Not implemented");
}
