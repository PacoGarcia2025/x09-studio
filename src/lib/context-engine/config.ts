export type ContextBudget = {
  maxFiles: number;
  maxBytes: number;
  maxEstimatedTokens: number;
  maxDependencyDepth: number;
};

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  maxFiles: 12,
  maxBytes: 180_000,
  maxEstimatedTokens: 12_000,
  maxDependencyDepth: 3,
};

export const CONTEXT_ENGINE_VERSION = "context-engine.v1";

export const CONTEXT_EXCLUSIONS = [
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".cache",
];

export const CONTEXT_FILE_TYPE_MAP: Record<string, string> = {
  page: "page",
  pages: "page",
  app: "page",
  component: "component",
  components: "component",
  lib: "service",
  services: "service",
  api: "api",
  schema: "schema",
  schemas: "schema",
  types: "types",
  hooks: "hook",
  utils: "util",
};
