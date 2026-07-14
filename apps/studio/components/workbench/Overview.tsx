export default function Overview() {
  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-3xl font-bold text-white">
          Overview
        </h2>

        <p className="text-zinc-400 mt-2">
          Resumo geral do projeto.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5">

        <div className="rounded-xl bg-zinc-800 p-6">
          <h3 className="text-zinc-400">Arquivos</h3>
          <p className="text-4xl text-white mt-3">0</p>
        </div>

        <div className="rounded-xl bg-zinc-800 p-6">
          <h3 className="text-zinc-400">IA</h3>
          <p className="text-4xl text-white mt-3">Pronta</p>
        </div>

        <div className="rounded-xl bg-zinc-800 p-6">
          <h3 className="text-zinc-400">Status</h3>
          <p className="text-4xl text-green-400 mt-3">OK</p>
        </div>

      </div>

    </div>
  );
}