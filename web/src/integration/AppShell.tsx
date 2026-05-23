// Placeholder. The real AppShell composition lives here once the renderer,
// editor, and UX surfaces exist (see CONTRACTS.md §5).
export function AppShell() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <h1 className="text-6xl font-semibold tracking-tight">Shaddy</h1>
        <p className="text-neutral-400 text-lg">a learning environment for shader art</p>
      </div>
    </main>
  );
}
