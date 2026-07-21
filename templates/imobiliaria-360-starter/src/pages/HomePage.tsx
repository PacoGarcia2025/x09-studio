type HomePageProps = {
  onNavigateToLogin?: () => void;
};

export function HomePage({ onNavigateToLogin }: HomePageProps) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <strong className="text-lg">Seu App</strong>
        <button
          type="button"
          onClick={() => onNavigateToLogin?.()}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Entrar
        </button>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Gerando seu app…</h1>
        <p className="mt-4 text-zinc-600">
          Em instantes esta página será substituída pelo conteúdo do seu
          produto.
        </p>
      </main>
    </div>
  );
}
