export default function AppHeader() {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-white">
        X09 Studio
      </h1>

      <div className="flex items-center gap-4 text-zinc-400">
        <span>🔍</span>

        <span className="text-sm">
          Sérgio
        </span>
      </div>
    </header>
  );
}