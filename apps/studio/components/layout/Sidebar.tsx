export default function Sidebar() {
  return (
    <aside className="w-72 border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-6">
        Projetos
      </h2>

      <nav className="flex flex-col gap-2">

        <button className="text-left rounded-lg px-3 py-2 hover:bg-zinc-900 text-zinc-300">
          📁 X09 SaaS
        </button>

        <button className="text-left rounded-lg px-3 py-2 hover:bg-zinc-900 text-zinc-300">
          📁 Sistema Contabilidade
        </button>

        <button className="text-left rounded-lg px-3 py-2 hover:bg-zinc-900 text-zinc-300">
          📁 CRM Oficina
        </button>

      </nav>

      <div className="mt-auto pt-6">

        <button className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 transition py-3 font-medium text-white">
          ➕ Novo Projeto
        </button>

      </div>
    </aside>
  );
}