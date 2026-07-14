import { Project } from "@/contexts/ProjectContext";

const PROJECTS_KEY = "x09.projects";
const CURRENT_KEY = "x09.currentProject";

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(PROJECTS_KEY);

  return data ? JSON.parse(data) : [];
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadCurrentProject() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(CURRENT_KEY);
}

export function saveCurrentProject(id: string) {
  localStorage.setItem(CURRENT_KEY, id);
}