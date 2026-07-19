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

const nonEmptyString = z.string().min(1);

export const studioPlanSchema = z.object({
  project: z.object({
    name: nonEmptyString,
    slug: z.string().optional(),
    description: nonEmptyString,
  }),
  summary: nonEmptyString,
  modules: z
    .array(
      z.object({
        id: nonEmptyString,
        name: nonEmptyString,
        description: nonEmptyString,
      }),
    )
    .min(1),
  pages: z
    .array(
      z.object({
        path: nonEmptyString,
        name: nonEmptyString,
        description: nonEmptyString,
      }),
    )
    .min(1),
  database: z.object({
    tables: z
      .array(
        z.object({
          name: nonEmptyString,
          description: nonEmptyString,
          columns: z.array(z.string()).optional(),
        }),
      )
      .default([]),
  }),
  apis: z
    .array(
      z.object({
        method: nonEmptyString,
        path: nonEmptyString,
        description: nonEmptyString,
      }),
    )
    .default([]),
  auth: z.object({
    providers: z.array(z.string()).default(["email"]),
    roles: z.array(z.string()).default(["visitor"]),
    notes: z.string().optional(),
  }),
  integrations: z
    .array(
      z.object({
        name: nonEmptyString,
        purpose: nonEmptyString,
      }),
    )
    .default([]),
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "name" in item) {
          return String((item as { name: unknown }).name ?? "").trim();
        }
        return String(item ?? "").trim();
      })
      .filter(Boolean);
    return items.length > 0 ? items : fallback;
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return fallback;
}

function normalizeTables(value: unknown): Array<{
  name: string;
  description: string;
  columns?: string[];
}> {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        name: "contacts",
        description: "Leads ou contatos capturados pelo site",
        columns: ["id", "name", "email", "message", "created_at"],
      },
    ];
  }

  return value.map((row, index) => {
    const obj = asRecord(row);
    if (!obj) {
      return {
        name: `table_${index + 1}`,
        description: "Tabela auxiliar",
      };
    }
    const name = String(obj.name ?? obj.table ?? `table_${index + 1}`).trim();
    const description = String(
      obj.description ?? obj.purpose ?? "Tabela do app",
    ).trim();
    const columns = Array.isArray(obj.columns)
      ? obj.columns.map((c) => String(c)).filter(Boolean)
      : undefined;
    return {
      name: name || `table_${index + 1}`,
      description: description || "Tabela do app",
      columns,
    };
  });
}

function normalizeObjectList(
  value: unknown,
  keys: { name: string; description: string },
): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const obj = asRecord(row);
      if (!obj) return null;
      const name = String(obj[keys.name] ?? obj.name ?? "").trim();
      const description = String(
        obj[keys.description] ?? obj.description ?? obj.purpose ?? "",
      ).trim();
      if (!name || !description) return null;
      return { [keys.name]: name, [keys.description]: description };
    })
    .filter(Boolean) as Array<Record<string, string>>;
}

/**
 * Corrige formatos comuns que a IA devolve fora do schema
 * (array vazio, string no lugar de array, objetos soltos).
 */
export function normalizePlannerPayload(raw: unknown): unknown {
  const root = asRecord(raw);
  if (!root) return raw;

  const database = asRecord(root.database) ?? {};
  const auth = asRecord(root.auth) ?? {};

  const modules = Array.isArray(root.modules)
    ? root.modules
    : [
        {
          id: "main",
          name: "Principal",
          description: "Módulo principal do app",
        },
      ];

  const pages = Array.isArray(root.pages)
    ? root.pages
    : [
        {
          path: "/",
          name: "Home",
          description: "Página inicial",
        },
      ];

  const apis = Array.isArray(root.apis)
    ? root.apis
    : [
        {
          method: "POST",
          path: "/api/contact",
          description: "Recebe formulário de contato",
        },
      ];

  const integrationsRaw = normalizeObjectList(root.integrations, {
    name: "name",
    description: "purpose",
  });
  const integrations =
    integrationsRaw.length > 0
      ? integrationsRaw.map((i) => ({
          name: i.name,
          purpose: i.purpose,
        }))
      : [{ name: "Supabase", purpose: "Backend, auth e banco" }];

  return {
    ...root,
    modules,
    pages,
    database: {
      ...database,
      tables: normalizeTables(database.tables ?? root.tables),
    },
    apis:
      apis.length > 0
        ? apis
        : [
            {
              method: "POST",
              path: "/api/contact",
              description: "Recebe formulário de contato",
            },
          ],
    auth: {
      ...auth,
      providers: asStringArray(auth.providers, ["email"]),
      roles: asStringArray(auth.roles, ["visitor"]),
      notes:
        typeof auth.notes === "string"
          ? auth.notes
          : "Auth opcional para landing; formulário público por padrão.",
    },
    integrations,
  };
}
