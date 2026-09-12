import { z } from "zod";

export const businessIndustrySchema = z.enum([
  "generic",
  "imobiliaria",
  "salon_beauty",
  "barbearia",
  "restaurante",
  "hamburgueria",
  "saas",
  "game",
]);

export const productTypeSchema = z.enum([
  "website",
  "application",
  "saas",
  "portal",
  "game",
  "generic",
]);

export const experiencePresetSchema = z.enum([
  "premium",
  "cinematic",
  "editorial",
  "luxury",
  "futuristic",
  "minimal",
  "immersive",
  "conversion",
  "generic",
]);

export const businessDnaSchema = z.object({
  industry: businessIndustrySchema,
  businessType: z.string(),
  audience: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  uxPatterns: z.array(z.string()).default([]),
  visualPatterns: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  source: z.string().default("heuristic"),
  confidence: z.number().min(0).max(1).default(0.7),
});

export type BusinessDNA = z.infer<typeof businessDnaSchema>;

export const experienceDnaSchema = z.object({
  preset: experiencePresetSchema,
  summary: z.string(),
  visual: z.object({
    tone: z.string(),
    palette: z.array(z.string()).default([]),
    typography: z.string(),
    density: z.string(),
    motion: z.string(),
  }),
  interaction: z.object({
    microInteractions: z.boolean().default(true),
    storytelling: z.boolean().default(true),
    conversionFocus: z.boolean().default(true),
    accessibility: z.boolean().default(true),
  }),
  direction: z
    .object({
      artDirection: z.string().default("premium and clear"),
      storytelling: z.string().default("narrativa simples e confiável"),
      interaction: z.string().default("microinterações discretas e funcionalmente úteis"),
      conversion: z.string().default("foco em CTA e clareza"),
      antiGeneric: z.boolean().default(true),
      brandSignal: z.string().default("identidade reconhecível e consistente"),
    })
    .default({
      artDirection: "premium and clear",
      storytelling: "narrativa simples e confiável",
      interaction: "microinterações discretas e funcionalmente úteis",
      conversion: "foco em CTA e clareza",
      antiGeneric: true,
      brandSignal: "identidade reconhecível e consistente",
    }),
  navigation: z.array(z.string()).default([]),
  source: z.string().default("heuristic"),
  confidence: z.number().min(0).max(1).default(0.7),
});

export type ExperienceDNA = z.infer<typeof experienceDnaSchema>;

export const blueprintSchema = z.object({
  industry: z.string(),
  productType: productTypeSchema,
  experience: experiencePresetSchema,
  summary: z.string(),
  modules: z.array(z.string()).default([]),
  pages: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        route: z.string(),
        purpose: z.string(),
      }),
    )
    .default([]),
  entities: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  ux: z.object({
    tone: z.string(),
    conversionFocus: z.boolean().default(true),
    mobileFirst: z.boolean().default(true),
    accessibility: z.boolean().default(true),
  }),
  visual: z.object({
    palette: z.array(z.string()).default([]),
    typography: z.string(),
    motion: z.string(),
  }),
  technical: z.object({
    stack: z.array(z.string()).default([]),
    authRequired: z.boolean().default(false),
    persistence: z.array(z.string()).default([]),
  }),
  priorities: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  preserveExistingArchitecture: z.boolean().default(true),
  fallbackUsed: z.boolean().default(false),
  source: z.string().default("heuristic"),
  confidence: z.number().min(0).max(1).default(0.7),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
