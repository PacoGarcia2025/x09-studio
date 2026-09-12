import { z } from "zod";
import { RESOURCE_KINDS } from "./types";

export const resourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(RESOURCE_KINDS),
  name: z.string().min(1),
  source: z.enum(["internal", "external", "generated", "user-gallery"]),
  provider: z.string().min(1),
  license: z.string().min(1),
  commercialAllowed: z.boolean(),
  tags: z.array(z.string().min(1)).default([]),
  techStack: z.array(z.string().min(1)).default([]),
  bestFor: z.array(z.string().min(1)).default([]),
  accessMode: z.enum([
    "npm",
    "cdn",
    "api",
    "repo",
    "generated",
    "local",
    "manual",
  ]),
  contextBundle: z.string().min(1),
  riskyDependencies: z.array(z.string().min(1)).default([]),
  fallbackStrategy: z.string().min(1),
  requiresUserConsent: z.boolean().default(false),
  userGalleryOnly: z.boolean().default(false),
  qualityScore: z.number().min(0).max(100),
  costBand: z.enum(["low", "medium", "high"]),
  availability: z.enum(["ready", "rate-limited", "unknown"]),
  lastValidatedAt: z.string().min(1),
  dimensions: z.string().optional(),
  orientation: z.string().optional(),
  quality: z.string().optional(),
  referenceUrl: z.string().optional(),
});

export function isResource(value: unknown): value is z.infer<typeof resourceSchema> {
  return resourceSchema.safeParse(value).success;
}

export function validateResource(value: unknown) {
  return resourceSchema.safeParse(value);
}
