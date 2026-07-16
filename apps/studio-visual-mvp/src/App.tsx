export default function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="rounded-full border border-border bg-surface px-4 py-2 text-xs uppercase tracking-[0.28em] text-muted">
          studio.x09.com.br
        </p>
        <h1 className="mt-6 text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
          Visual AI Builder
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
          Base Vite + React + TypeScript + Tailwind preparada para chat,
          Monaco Editor, Sandpack, Zustand e animações com Framer Motion.
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-muted shadow-glow">
          Passo 1 concluído: configuração e identidade visual X09.
        </div>
      </div>
    </main>
  );
}
