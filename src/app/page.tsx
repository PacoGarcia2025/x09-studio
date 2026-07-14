export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          X09 Studio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Ambiente preparado
        </h1>
        <p className="text-zinc-400 leading-relaxed">
          Sprint 0 concluído na estrutura do produto. Next.js 15 App Router,
          stubs de Docker, Supabase, Gemini, PM2, Nginx e CI estão no
          repositório. O Sprint 1 começa a plataforma de verdade.
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <dt className="text-zinc-500">Runtime</dt>
            <dd className="mt-1 font-medium">Next.js 15 · porta 3001</dd>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <dt className="text-zinc-500">Preview</dt>
            <dd className="mt-1 font-medium">Docker (VPS)</dd>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <dt className="text-zinc-500">LLM MVP</dt>
            <dd className="mt-1 font-medium">Gemini 2.5 Flash</dd>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <dt className="text-zinc-500">Backend apps</dt>
            <dd className="mt-1 font-medium">Supabase</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
