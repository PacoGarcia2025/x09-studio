"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface Project {
  id: string;
  name: string;
}

interface ProjectContextData {
  projects: Project[];
  currentProject: Project | null;

  createProject: (name: string) => void;
  selectProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextData>(
  {} as ProjectContextData
);

export function ProjectProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "X09 SaaS",
    },
    {
      id: "2",
      name: "Sistema Contabilidade",
    },
    {
      id: "3",
      name: "CRM Oficina",
    },
  ]);

  const [currentProject, setCurrentProject] =
    useState<Project | null>(null);

  function createProject(name: string) {
    const project: Project = {
      id: Date.now().toString(),
      name,
    };

    setProjects((old) => [...old, project]);
  }

  function selectProject(id: string) {
    const project = projects.find((p) => p.id === id);

    if (project) {
      setCurrentProject(project);
    }
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