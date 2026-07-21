type Props = {
  onNavigateHome?: () => void;
  onSignOut?: () => void;
};

export function OwnerPortalPage({ onNavigateHome, onSignOut }: Props) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="font-serif text-lg font-semibold">Portal do Proprietário</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => onNavigateHome?.()} className="text-sm text-stone-600">
            Site
          </button>
          <button type="button" onClick={() => onSignOut?.()} className="rounded-full bg-stone-900 px-3 py-1.5 text-sm text-white">
            Sair
          </button>
        </div>
      </header>
      <main className="p-6 text-sm text-stone-600">Relatórios do anúncio — em construção pelo Builder.</main>
    </div>
  );
}
