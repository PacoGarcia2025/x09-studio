"use client";

import { useProjects } from "@/contexts/ProjectContext";
import { useWorkbench } from "@/contexts/WorkbenchContext";

import WorkbenchTabs from "@/components/workbench/WorkbenchTabs";

import Overview from "@/components/workbench/Overview";
import Explorer from "@/components/workbench/Explorer";
import AiChat from "@/components/workbench/AiChat";
import Preview from "@/components/workbench/Preview";
import Logs from "@/components/workbench/Logs";

export default function Workspace() {
  const { currentProject } = useProjects();
  const { activeTab } = useWorkbench();

  if (!currentProject) {
    return (
      <main className="flex-1 bg-zinc-900 flex items-center justify-center">

        <div className="text-center">

          <h1 className="text-5xl font-bold text-white">
            Nenhum projeto aberto
          </h1>

          <p className="text-zinc-500 mt-4">
            Selecione um projeto ou crie um novo.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="flex-1 bg-zinc-900 p-8 overflow-auto">

      <h1 className="text-5xl font-bold text-white mb-2">
        {currentProject.name}
      </h1>

      <p className="text-zinc-500 mb-8">
        Projeto aberto com sucesso.
      </p>

      <WorkbenchTabs />

      {activeTab === "overview" && <Overview />}
      {activeTab === "explorer" && <Explorer />}
      {activeTab === "chat" && <AiChat />}
      {activeTab === "preview" && <Preview />}
      {activeTab === "logs" && <Logs />}

    </main>
  );
}