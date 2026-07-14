"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  loadProjects,
  saveProjects,
  loadCurrentProject,
  saveCurrentProject,
} from "@/lib/storage/projectStorage";

export interface Project {
  id: string;
  name: string;
}

interface ProjectContextData {
  projects: Project[];
  currentProject: Project | null;

  createProject(name: string): void;
  selectProject(id: string): void;
}

const ProjectContext = createContext(
  {} as ProjectContextData
);

export function ProjectProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] =
    useState<Project | null>(null);

  //-----------------------------------------
  // Carrega projetos
  //-----------------------------------------

  useEffect(() => {
    const saved = loadProjects();

    if (saved.length === 0) {
      const initial = [
        {
          id: crypto.randomUUID(),
          name: "X09 SaaS",
        },
        {
          id: crypto.randomUUID(),
          name: "Sistema Contabilidade",
        },
        {
          id: crypto.randomUUID(),
          name: "CRM Oficina",
        },
      ];

      setProjects(initial);
      saveProjects(initial);

      return;
    }

    setProjects(saved);

    const currentId = loadCurrentProject();

    if (currentId) {
      const found = saved.find((p) => p.id === currentId);

      if (found) setCurrentProject(found);
    }
  }, []);

  //-----------------------------------------
  // Salva projetos
  //-----------------------------------------

  useEffect(() => {
    if (projects.length) {
      saveProjects(projects);
    }
  }, [projects]);

  //-----------------------------------------
  // Criar projeto
  //-----------------------------------------

  function createProject(name: string) {
    const project = {
      id: crypto.randomUUID(),
      name,
    };

    const updated = [...projects, project];

    setProjects(updated);
    setCurrentProject(project);

    saveCurrentProject(project.id);
  }

  //-----------------------------------------
  // Selecionar projeto
  //-----------------------------------------

  function selectProject(id: string) {
    const project = projects.find((p) => p.id === id);

    if (!project) return;

    setCurrentProject(project);

    saveCurrentProject(project.id);
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        createProject,
        selectProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectContext);
}