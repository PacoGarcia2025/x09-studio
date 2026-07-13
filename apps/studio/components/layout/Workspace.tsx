export default function Workspace() {
  return (
    <section className="flex-1 flex items-center justify-center bg-zinc-900">
      <div className="text-center">

        <h2 className="text-3xl font-bold text-white">
          Nenhum projeto aberto
        </h2>

        <p className="mt-4 text-zinc-400">
          Selecione um projeto na barra lateral
          <br />
          ou clique em
          <strong> Novo Projeto</strong>.
        </p>

      </div>
    </section>
  );
}