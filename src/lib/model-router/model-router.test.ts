import { describe, expect, it } from "vitest";
import {
  classifyTask,
  evaluateCostGuard,
  routeModelForTask,
} from "@/lib/model-router";

describe("model router", () => {
  it("routes trivial text change to economic tier", () => {
    const route = routeModelForTask({
      request: "Troque o texto do botão para 'Entrar agora'.",
      taskType: "edit",
      complexity: "trivial",
      contextMetrics: { selectedFiles: 2, estimatedTokens: 1200 },
    });

    expect(route.tier).toBe("ECONOMIC");
    expect(route.legacyMode).toBe("fast");
    expect(route.estimatedTokens).toBeGreaterThan(0);
  });

  it("routes simple form change to economic or balanced", () => {
    const route = routeModelForTask({
      request: "Adicione um campo de telefone ao cadastro.",
      taskType: "edit",
      complexity: "simple",
      contextMetrics: { selectedFiles: 4, estimatedTokens: 2200 },
    });

    expect(["ECONOMIC", "BALANCED"]).toContain(route.tier);
  });

  it("routes a full landing page to balanced", () => {
    const route = routeModelForTask({
      request: "Crie uma página de preços premium para o SaaS.",
      taskType: "generation",
      complexity: "medium",
      contextMetrics: { selectedFiles: 6, estimatedTokens: 5600 },
    });

    expect(route.tier).toBe("BALANCED");
  });

  it("routes complex product to premium", () => {
    const route = routeModelForTask({
      request: "Crie um sistema completo para uma imobiliária com CRM, agenda, financiamento e portal.",
      taskType: "architecture",
      complexity: "complex",
      contextMetrics: { selectedFiles: 14, estimatedTokens: 13000 },
    });

    expect(route.tier).toBe("PREMIUM");
  });

  it("escalates on repeated repair cycles", () => {
    const route = routeModelForTask({
      request: "Corrija um projeto quebrado com múltiplos módulos.",
      taskType: "repair",
      complexity: "critical",
      repairIssues: [{ file: "src/App.tsx", message: "falha de render" }],
      repairCycles: 2,
      contextMetrics: { selectedFiles: 10, estimatedTokens: 14000 },
    });

    expect(route.escalationLevel).toBeGreaterThanOrEqual(1);
    expect(["BALANCED", "PREMIUM"]).toContain(route.tier);
  });

  it("blocks or downgrades when budget is exceeded", () => {
    const route = routeModelForTask({
      request: "Crie uma página premium completa sobre o produto.",
      taskType: "generation",
      complexity: "medium",
      contextMetrics: { selectedFiles: 12, estimatedTokens: 25000 },
      budget: { maxTokens: 3000 },
    });

    const guarded = evaluateCostGuard(route, {
      maxTokens: 3000,
      maxEstimatedCost: 1,
    });

    expect(["downgraded", "blocked"]).toContain(guarded.status);
  });

  it("keeps user preference when it fits budget", () => {
    const route = routeModelForTask({
      request: "Crie um dashboard SaaS premium.",
      taskType: "generation",
      complexity: "medium",
      contextMetrics: { selectedFiles: 8, estimatedTokens: 7000 },
      userModelPreference: "premium",
      budget: { maxTokens: 20000 },
    });

    expect(route.tier).toBe("PREMIUM");
    expect(route.reason).toContain("premium");
  });

  it("does not invent cost when pricing is unavailable", () => {
    const route = routeModelForTask({
      request: "Crie um resumo executivo do produto.",
      taskType: "content",
      complexity: "simple",
      contextMetrics: { selectedFiles: 1, estimatedTokens: 800 },
    });

    expect(route.estimatedCost).toBeNull();
  });

  it("does not exceed escalation ceiling", () => {
    const route = routeModelForTask({
      request: "Resolver conflito crítico de arquitetura com múltiplos módulos.",
      taskType: "architecture",
      complexity: "critical",
      repairCycles: 8,
      contextMetrics: { selectedFiles: 16, estimatedTokens: 18000 },
    });

    expect(route.escalationLevel).toBeLessThanOrEqual(3);
  });

  it("classifies deterministic task patterns without LLM", () => {
    expect(classifyTask("Troque a cor do botão principal").taskType).toBe("edit");
    expect(classifyTask("Crie uma landing page completa").complexity).toBe("medium");
    expect(classifyTask("Corrija o projeto quebrado").taskType).toBe("repair");
  });
});
