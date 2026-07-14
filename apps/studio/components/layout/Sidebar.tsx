"use client";

import { Folder } from "lucide-react";

import { useProjects } from "@/contexts/ProjectContext";
import NewProjectDialog from "@/components/project/NewProjectDialog";

export default function Sidebar() {
  const { projects, currentProject, selectProject } = useProjects();

  return (
    <aside className="w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col">

      <div className="p-6">

        <h2 className="text-xl font-bold text-white">
          Projetos
        </h2>

      </div>

      <div className="flex-1 overflow-y-auto px-3">

        {projects.map((project) => (

          <button
            key={project.id}
            onClick={() => selectProject(project.id)}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mb-2 transition

            ${
              currentProject?.id === project.id
                ? "bg-violet-600 text-white"
                : "text-zinc-300 hover:bg-zinc-900"
            }
            `}
          >

            <Folder size={18} />

            {project.name}

          </button>

        ))}

      </div>

      <div className="p-4">

        <NewProjectDialog />

      </div>

    </aside>
  );
}