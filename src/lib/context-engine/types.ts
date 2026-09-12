import { z } from "zod";
import {
  blueprintSchema,
  businessDnaSchema,
  experienceDnaSchema,
} from "@/lib/dna/schemas";

export const contextBudgetSchema = z.object({
  maxFiles: z.number().int().positive(),
  maxBytes: z.number().int().positive(),
  maxEstimatedTokens: z.number().int().positive(),
  maxDependencyDepth: z.number().int().positive(),
});

export type ContextBudget = z.infer<typeof contextBudgetSchema>;

export const repoMapFileSchema = z.object({
  path: z.string(),
  type: z.enum(["page", "component", "service", "api", "schema", "types", "hook", "util", "config", "unknown"]),
  imports: z.array(z.string()).default([]),
  sizeBytes: z.number().default(0),
  depth: z.number().default(0),
  reason: z.string().optional(),
  contentHints: z.array(z.string()).default([]),
});

export type RepoMapFile = z.infer<typeof repoMapFileSchema>;

export const repoMapSchema = z.object({
  projectId: z.string().nullable().optional(),
  generatedAt: z.string(),
  totalFiles: z.number().int().nonnegative(),
  files: z.array(repoMapFileSchema),
  exclusions: z.array(z.string()).default([]),
  stats: z.object({
    pages: z.number().int().nonnegative().default(0),
    components: z.number().int().nonnegative().default(0),
    services: z.number().int().nonnegative().default(0),
    apis: z.number().int().nonnegative().default(0),
    schemas: z.number().int().nonnegative().default(0),
    unknown: z.number().int().nonnegative().default(0),
  }),
});

export type RepoMap = z.infer<typeof repoMapSchema>;

export const selectedContextFileSchema = z.object({
  path: z.string(),
  type: z.enum(["page", "component", "service", "api", "schema", "types", "hook", "util", "config", "unknown"]),
  score: z.number(),
  reason: z.string(),
  sizeBytes: z.number().default(0),
  imports: z.array(z.string()).default([]),
  excerpt: z.string().max(1200).optional(),
  dependencyDepth: z.number().default(0),
  selectionMode: z.enum(["ranked", "dependency-expanded", "fallback"]).default("ranked"),
});

export type SelectedContextFile = z.infer<typeof selectedContextFileSchema>;

export const contextPackageSchema = z.object({
  requestSummary: z.string(),
  strategic: z.object({
    businessDna: businessDnaSchema.optional(),
    experienceDna: experienceDnaSchema.optional(),
    blueprint: blueprintSchema.optional(),
    goal: z.string().optional(),
  }),
  structural: z.object({
    repoMapSummary: z.string(),
    selectedFilesCount: z.number().int().nonnegative(),
    totalFiles: z.number().int().nonnegative(),
    dependencyDepth: z.number().int().nonnegative(),
    exclusions: z.array(z.string()).default([]),
  }),
  selectedFiles: z.array(selectedContextFileSchema),
  problems: z.array(z.object({
    file: z.string().optional(),
    message: z.string(),
    severity: z.enum(["error", "warning"]).default("error"),
  })).default([]),
  instructions: z.array(z.string()).default([]),
  budget: contextBudgetSchema,
  metrics: z.object({
    selectedBytes: z.number().int().nonnegative(),
    estimatedTokens: z.number().int().nonnegative(),
    cacheHit: z.boolean().default(false),
    fallbackUsed: z.boolean().default(false),
    buildMs: z.number().int().nonnegative().default(0),
  }),
  source: z.string().default("context-engine"),
  contextVersion: z.string().default("context-engine.v1"),
  selectionMode: z.enum(["ranked", "dependency-expanded", "fallback"]).default("ranked"),
});

export type ContextPackage = z.infer<typeof contextPackageSchema>;

export type ContextSelectionInput = {
  request: string;
  businessDna?: z.infer<typeof businessDnaSchema>;
  experienceDna?: z.infer<typeof experienceDnaSchema>;
  blueprint?: z.infer<typeof blueprintSchema>;
  repoMap?: RepoMap;
  repairIssues?: Array<{ file?: string; message: string; severity?: "error" | "warning" }>;
  currentFiles?: Record<string, string>;
  projectId?: string | null;
  maxFiles?: number;
  maxBytes?: number;
  maxEstimatedTokens?: number;
  maxDependencyDepth?: number;
  recentFiles?: string[];
};
