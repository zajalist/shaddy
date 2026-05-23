import type { RendererAPI, GLSLError } from '../renderer';

export interface AppShellProps {
  renderer: RendererAPI;
  editorSource: string;
  onEditorSourceChange: (next: string) => void;
  errors: GLSLError[];
  onPhotoMatch: (file: File, templateId: string) => Promise<void>;
}

export function AppShell(_props: AppShellProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
      <h1 className="text-4xl font-bold tracking-tight">Shaddy</h1>
    </div>
  );
}

export function encodeShareUrl(_state: { source: string; uniforms?: Record<string, number> }): string {
  throw new Error("Not implemented");
}

export function decodeShareUrl(_url: string): { source: string; uniforms?: Record<string, number> } | null {
  throw new Error("Not implemented");
}
