import "server-only";
import { z } from "zod";

export const GenerationPreferenceSchema = z.enum(["auto", "premium"]);
export type GenerationPreference = z.infer<typeof GenerationPreferenceSchema>;

export const ResolvedModeSchema = z.enum([
  "edit",
  "fast",
  "premium",
  "repair",
  "plan",
]);
export type ResolvedMode = z.infer<typeof ResolvedModeSchema>;

export const AgentPhaseSchema = z.enum([
  "planejando",
  "construindo",
  "verificando",
  "corrigindo",
  "concluido",
  "erro",
]);
export type AgentPhase = z.infer<typeof AgentPhaseSchema>;

export const AppPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  path: z.string(),
  purpose: z.string(),
  sections: z.array(z.string()).default([]),
});

export const AppEntitySchema = z.object({
  name: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().default(true),
    }),
  ),
  operations: z.array(z.enum(["list", "create", "update", "delete", "read"])),
});

export const AppSpecSchema = z.object({
  productName: z.string(),
  productType: z.enum([
    "landing",
    "saas",
    "crm",
    "marketplace",
    "dashboard",
    "other",
  ]),
  summary: z.string(),
  audience: z.string(),
  tone: z.string(),
  pages: z.array(AppPageSchema).min(1),
  entities: z.array(AppEntitySchema).default([]),
  authRequired: z.boolean().default(false),
  visualDirection: z.string(),
  acceptanceCriteria: z.array(z.string()).default([]),
});
export type AppSpec = z.infer<typeof AppSpecSchema>;

export const FileManifestEntrySchema = z.object({
  path: z.string(),
  role: z.enum([
    "entry",
    "page",
    "component",
    "service",
    "migration",
    "config",
    "util",
  ]),
  description: z.string(),
});

export const FileManifestSchema = z.object({
  files: z.array(FileManifestEntrySchema).min(1),
});
export type FileManifest = z.infer<typeof FileManifestSchema>;

export const RepairIssueSchema = z.object({
  id: z.string(),
  category: z.enum([
    "compile",
    "runtime",
    "import",
    "typescript",
    "lint",
    "build",
    "other",
  ]),
  severity: z.enum(["error", "warning"]).default("error"),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  suggestion: z.string().optional(),
});
export type RepairIssue = z.infer<typeof RepairIssueSchema>;

export const StreamRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "ai", "assistant", "system"]),
        content: z.string().max(200_000),
      }),
    )
    .min(1)
    .max(40),
  preference: GenerationPreferenceSchema.default("auto"),
  hasExistingApp: z.boolean().default(false),
  currentFiles: z.record(z.string(), z.string()).optional(),
  currentAppCode: z.string().max(200_000).optional(),
  userContext: z.string().max(8_000).optional(),
  phase: z
    .enum(["auto", "plan", "build", "repair"])
    .default("auto"),
  repairIssues: z.array(RepairIssueSchema).max(30).optional(),
  appSpec: AppSpecSchema.optional(),
  clientRequestId: z.string().uuid().optional(),
});
export type StreamRequest = z.infer<typeof StreamRequestSchema>;

export const GenerationEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("phase"),
    phase: AgentPhaseSchema,
    label: z.string(),
  }),
  z.object({
    type: z.literal("mode"),
    mode: ResolvedModeSchema,
    model: z.string(),
  }),
  z.object({
    type: z.literal("spec"),
    spec: AppSpecSchema,
  }),
  z.object({
    type: z.literal("manifest"),
    manifest: FileManifestSchema,
  }),
  z.object({
    type: z.literal("delta"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("metrics"),
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    latencyMs: z.number().optional(),
    repairCycles: z.number().optional(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    text: z.string(),
    mode: ResolvedModeSchema,
  }),
]);
export type GenerationEvent = z.infer<typeof GenerationEventSchema>;
