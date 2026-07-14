"use client";

import { useProjects } from "@/contexts/ProjectContext";

export default function Workspace() {
  const { currentProject } = useProjects();

  if (!currentProject) {
    return (
      <main className="flex-1 flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Nenhum projeto aberto
          </h1>

          <p className="text-zinc-400 text-lg">
            Selecione um projeto na barra lateral
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-zinc-900 p-10">

      <h1 className="text-4xl font-bold text-white">
        {currentProject.name}
      </h1>

      <p className="text-zinc-400 mt-3">
        Projeto aberto com sucesso.
      </p>

    </main>
  );
}