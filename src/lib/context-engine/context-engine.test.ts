import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRepoMap, repoMapSummary } from "@/lib/context-engine/repo-map";
import { selectRelevantFiles } from "@/lib/context-engine/file-selector";
import { assembleContextPackage } from "@/lib/context-engine/assembler";
import { ContextCache } from "@/lib/context-engine/cache";
import { buildContextEnginePackage } from "@/lib/context-engine/context-engine";
import type { RepoMap } from "@/lib/context-engine/types";

const sampleRepoMap: RepoMap = {
  projectId: "demo",
  generatedAt: new Date().toISOString(),
  totalFiles: 9,
  exclusions: ["node_modules"],
  stats: {
    pages: 2,
    components: 2,
    services: 2,
    apis: 2,
    schemas: 1,
    unknown: 0,
  },
  files: [
    { path: "src/pages/ClientesPage.tsx", type: "page", imports: ["@/components/ClienteForm", "@/lib/customerService"], sizeBytes: 20_000, depth: 2, reason: "page", contentHints: ["cliente", "cadastro", "telefone"] },
    { path: "src/pages/DashboardPage.tsx", type: "page", imports: ["@/components/DashboardShell"], sizeBytes: 18_000, depth: 2, reason: "page", contentHints: ["dashboard", "painel", "metricas"] },
    { path: "src/components/ClienteForm.tsx", type: "component", imports: ["@/lib/customerService", "@/types/customer"], sizeBytes: 10_000, depth: 3, reason: "component", contentHints: ["cliente", "cadastro", "telefone"] },
    { path: "src/components/PricePlans.tsx", type: "component", imports: ["@/lib/pricing"], sizeBytes: 9_000, depth: 3, reason: "component", contentHints: ["preco", "planos", "assinatura"] },
    { path: "src/lib/customerService.ts", type: "service", imports: ["@/types/customer", "@/api/customer"], sizeBytes: 7_000, depth: 2, reason: "service", contentHints: ["cliente", "cadastro", "servico"] },
    { path: "src/lib/pricing.ts", type: "service", imports: ["@/types/subscription"], sizeBytes: 8_000, depth: 2, reason: "service", contentHints: ["preco", "pricing", "plano"] },
    { path: "src/types/customer.ts", type: "types", imports: [], sizeBytes: 2_000, depth: 2, reason: "types", contentHints: ["cliente", "telefone", "tipo"] },
    { path: "src/app/api/customer/route.ts", type: "api", imports: ["@/lib/customerService"], sizeBytes: 6_000, depth: 2, reason: "api", contentHints: ["cliente", "cadastro", "api"] },
    { path: "public/templates/dashboard.png", type: "unknown", imports: [], sizeBytes: 14_000, depth: 2, reason: "image", contentHints: ["dashboard", "image"] },
  ],
};

describe("context engine", () => {
  it("builds a compact repo map", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "x09-context-"));
    const projectId = "11111111-1111-4111-8111-111111111111";
    const projectDir = path.join(root, projectId);
    await fs.mkdir(path.join(projectDir, "src", "pages"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "src", "components"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "src", "lib"), { recursive: true });
    await fs.writeFile(path.join(projectDir, "src", "pages", "ClientesPage.tsx"), "export default function ClientesPage(){ return <div /> }" );
    await fs.writeFile(path.join(projectDir, "src", "components", "ClienteForm.tsx"), "export function ClienteForm(){ return <div /> }" );
    await fs.writeFile(path.join(projectDir, "src", "lib", "clientes.ts"), "export const clientes = [];" );
    process.env.STUDIO_PROJECTS_ROOT = root;

    const repoMap = await buildRepoMap({ projectId });
    expect(repoMap.totalFiles).toBeGreaterThan(0);
    expect(repoMapSummary(repoMap)).toContain("Arquivos mapeados");
  });

  it("selects relevant files by keyword for customer update", () => {
    const selected = selectRelevantFiles({
      request: "Altere o cadastro de clientes para adicionar telefone secundário.",
      repoMap: sampleRepoMap,
      maxFiles: 5,
      maxBytes: 100_000,
      maxEstimatedTokens: 20_000,
      maxDependencyDepth: 3,
    });
    expect(selected.length).toBeGreaterThan(1);
    expect(selected.some((item) => /cliente|customer|cadastro|form/i.test(item.path))).toBe(true);
    expect(selected.some((item) => item.path.includes("dashboard.png") === false)).toBe(true);
  });

  it("prefers pricing and subscription files over docs for SaaS pricing request", () => {
    const selected = selectRelevantFiles({
      request: "Crie uma página de preços premium para o SaaS.",
      repoMap: sampleRepoMap,
      maxFiles: 5,
      maxBytes: 100_000,
      maxEstimatedTokens: 20_000,
      maxDependencyDepth: 3,
    });
    expect(selected.some((item) => /price|pricing|plan|subscription/i.test(item.path))).toBe(true);
    expect(selected.some((item) => item.type === "component")).toBe(true);
  });

  it("prioritizes dashboard tsx over dashboard image", () => {
    const selected = selectRelevantFiles({
      request: "Corrija o erro da página de dashboard.",
      repoMap: sampleRepoMap,
      maxFiles: 5,
      maxBytes: 100_000,
      maxEstimatedTokens: 20_000,
      maxDependencyDepth: 3,
    });
    expect(selected.some((item) => /DashboardPage|dashboard/i.test(item.path))).toBe(true);
    expect(selected.some((item) => item.path.includes("dashboard.png"))).toBe(false);
  });

  it("does not select unrelated api or image files when there is no semantic match", () => {
    const noisyRepoMap: RepoMap = {
      projectId: "noisy",
      generatedAt: new Date().toISOString(),
      totalFiles: 4,
      exclusions: [],
      stats: {
        pages: 0,
        components: 0,
        services: 0,
        apis: 2,
        schemas: 0,
        unknown: 2,
      },
      files: [
        { path: "src/app/api/queue/route.ts", type: "api", imports: [], sizeBytes: 4_000, depth: 2, reason: "api", contentHints: ["queue", "job"] },
        { path: "src/app/api/health/route.ts", type: "api", imports: [], sizeBytes: 3_000, depth: 2, reason: "api", contentHints: ["health", "status"] },
        { path: "public/landing/hero.png", type: "unknown", imports: [], sizeBytes: 18_000, depth: 2, reason: "image", contentHints: ["hero", "landing"] },
        { path: "src/lib/cache.ts", type: "service", imports: [], sizeBytes: 5_000, depth: 2, reason: "service", contentHints: ["cache", "memo"] },
      ],
    };

    const selected = selectRelevantFiles({
      request: "Corrija o erro da página de dashboard.",
      repoMap: noisyRepoMap,
      maxFiles: 5,
      maxBytes: 100_000,
      maxEstimatedTokens: 20_000,
      maxDependencyDepth: 3,
    });

    expect(selected.some((item) => /dashboard|DashboardPage/i.test(item.path))).toBe(false);
    expect(selected.some((item) => /route\.ts|hero\.png|queue|health/i.test(item.path))).toBe(false);
  });

  it("assembles context without duplication", () => {
    const packageData = assembleContextPackage({
      request: "Corrija o erro da página de dashboard.",
      repoMap: sampleRepoMap,
      selectedFiles: sampleRepoMap.files.slice(0, 2).map((file) => ({
        path: file.path,
        type: file.type,
        reason: file.reason ?? "selecionado",
        score: 0,
        sizeBytes: file.sizeBytes,
        imports: file.imports,
        dependencyDepth: file.depth,
        selectionMode: "ranked",
      })),
      repairIssues: [{ file: "src/pages/DashboardPage.tsx", message: "Erro de render", severity: "error" }],
      maxFiles: 3,
      maxBytes: 100_000,
      maxEstimatedTokens: 20_000,
      maxDependencyDepth: 3,
    });
    expect(packageData.selectedFiles.length).toBe(2);
    expect(packageData.problems[0]?.message).toContain("Erro");
  });

  it("handles cache hit and miss", () => {
    const cache = new ContextCache<{ ok: boolean }>("test-v1");
    const miss = cache.get("p1", ["a"]);
    expect(miss).toBeUndefined();
    cache.set("p1", { ok: true }, ["a"]);
    expect(cache.get("p1", ["a"])).toEqual({ ok: true });
  });

  it("integrates with DNA and fallback-safe generation", async () => {
    const packageData = await buildContextEnginePackage({
      request: "Crie uma página de preços premium para o SaaS.",
      projectId: "demo",
      repoMap: sampleRepoMap,
      useCache: true,
      maxFiles: 3,
      maxBytes: 100_000,
      maxEstimatedTokens: 20_000,
      maxDependencyDepth: 3,
    });
    expect(packageData.strategic.blueprint).toBeTruthy();
    expect(packageData.selectedFiles.length).toBeGreaterThan(0);
  });
});
