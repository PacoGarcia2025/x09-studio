import { z } from "zod";

/** Tipos de task que o Builder (Sprint 4+) saberá executar. */
export const planTaskTypeSchema = z.enum([
  "create_file",
  "update_file",
  "delete_file",
  "run_command",
  "sql_migration",
  "env_set",
]);

export type PlanTaskType = z.infer<typeof planTaskTypeSchema>;

export const planTaskSchema = z.object({
  id: z.string().min(1),
  type: planTaskTypeSchema,
  title: z.string().min(1),
  /** Instrução curta do que fazer — NUNCA código completo do arquivo. */
  instruction: z.string().min(1).max(2000),
  path: z.string().min(1).optional(),
  dependsOn: z.array(z.string()).default([]),
});

export type PlanTask = z.infer<typeof planTaskSchema>;

export const studioPlanSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().min(1),
  }),
  summary: z.string().min(1),
  modules: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1),
  pages: z
    .array(
      z.object({
        path: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1),
  database: z.object({
    tables: z
      .array(
        z.object({
          name: z.string().min(1),
          description: z.string().min(1),
          columns: z.array(z.string()).optional(),
        }),
      )
      .min(1),
  }),
  apis: z
    .array(
      z.object({
        method: z.string().min(1),
        path: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1),
  auth: z.object({
    providers: z.array(z.string()).min(1),
    roles: z.array(z.string()).min(1),
    notes: z.string().optional(),
  }),
  integrations: z.array(
    z.object({
      name: z.string().min(1),
      purpose: z.string().min(1),
    }),
  ),
  tasks: z.array(planTaskSchema).min(3).max(40),
});

export type StudioPlan = z.infer<typeof studioPlanSchema>;

/** Descrição textual do schema para o system prompt do Planner. */
export const PLAN_JSON_SHAPE_HINT = `{
  "project": { "name": string, "slug"?: string, "description": string },
  "summary": string,
  "modules": [{ "id": string, "name": string, "description": string }],
  "pages": [{ "path": string, "name": string, "description": string }],
  "database": {
    "tables": [{ "name": string, "description": string, "columns"?: string[] }]
  },
  "apis": [{ "method": string, "path": string, "description": string }],
  "auth": { "providers": string[], "roles": string[], "notes"?: string },
  "integrations": [{ "name": string, "purpose": string }],
  "tasks": [{
    "id": string,
    "type": "create_file" | "update_file" | "delete_file" | "run_command" | "sql_migration" | "env_set",
    "title": string,
    "instruction": string,
    "path"?: string,
    "dependsOn": string[]
  }]
}`;
