import { describe, it, expect, vi } from "vitest";
import { runVisualIntelligence } from "./visual-intelligence.server";
import type { LlmProvider, CompletionResult } from "@/lib/llm/types";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("runVisualIntelligence (Fase 2)", () => {
  const fakePrompt = "Crie um site para uma barbearia premium.";

  function createMockSupabase(
    existingBriefId: string | null = null,
    insertBriefId = "new-brief-123"
  ) {
    const records = {
      visual_briefs: [] as any[],
      asset_requests: [] as any[],
    };

    const builder = (table: "visual_briefs" | "asset_requests") => {
      let chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          return chain;
        }),
        maybeSingle: vi.fn().mockImplementation(() => {
          if (table === "visual_briefs" && existingBriefId) {
            return { data: { id: existingBriefId }, error: null };
          }
          return { data: null, error: null };
        }),
        single: vi.fn().mockImplementation(() => {
          return { data: { id: insertBriefId }, error: null };
        }),
        insert: vi.fn().mockImplementation((data) => {
          if (Array.isArray(data)) records[table].push(...data);
          else records[table].push(data);
          return chain;
        }),
        update: vi.fn().mockImplementation(() => {
          return chain;
        }),
        delete: vi.fn().mockReturnThis(),
      };
      return chain;
    };

    return {
      from: vi.fn().mockImplementation(builder),
      records,
    } as unknown as SupabaseClient & { records: typeof records };
  }

  function createMockProvider(jsonResponse: object | string): LlmProvider {
    return {
      complete: vi.fn().mockResolvedValue({
        text: typeof jsonResponse === "string" ? jsonResponse : JSON.stringify(jsonResponse),
        model: "mock-model",
        usage: { inputTokens: 10, outputTokens: 20 },
      } as CompletionResult),
    } as any;
  }

  it("deve extrair o Visual Brief e criar novos requests", async () => {
    const sb = createMockSupabase();
    const provider = createMockProvider({
      business: "Barbearia",
      visual_style: "Premium",
      requests: [
        { purpose: "hero", subject: "Cadeira de barbeiro", style: "fotográfico" },
        { purpose: "services", subject: "Corte de cabelo", style: "fotográfico" }
      ],
    });

    const result = await runVisualIntelligence(provider, {
      projectId: "proj-1",
      workspaceId: "ws-1",
      prompt: fakePrompt,
      supabase: sb,
    });

    expect(result.briefId).toBe("new-brief-123");
    expect(result.requestsCount).toBe(2);

    expect(sb.from).toHaveBeenCalledWith("visual_briefs");
    expect(sb.from).toHaveBeenCalledWith("asset_requests");

    // Verifica associações e dados preenchidos
    const brief = sb.records.visual_briefs[0];
    expect(brief.business).toBe("Barbearia");
    expect(brief.project_id).toBe("proj-1");
    expect(brief.workspace_id).toBe("ws-1");

    const requests = sb.records.asset_requests;
    expect(requests.length).toBe(2);
    expect(requests[0].visual_brief_id).toBe("new-brief-123");
    expect(requests[0].purpose).toBe("hero");
    expect(requests[0].project_id).toBe("proj-1");
    expect(requests[0].workspace_id).toBe("ws-1");
  });

  it("deve atualizar um Visual Brief existente e recriar os requests", async () => {
    const sb = createMockSupabase("existing-brief-456");
    const provider = createMockProvider({
      business: "Barbearia",
      requests: [{ purpose: "banner" }],
    });

    const result = await runVisualIntelligence(provider, {
      projectId: "proj-2",
      workspaceId: "ws-2",
      prompt: fakePrompt,
      supabase: sb,
    });

    expect(result.briefId).toBe("existing-brief-456");
    expect(result.requestsCount).toBe(1);

    // O Mock de `update` e `delete` foram chamados, e então `insert` do asset_request
    expect(sb.records.asset_requests.length).toBe(1);
    expect(sb.records.asset_requests[0].visual_brief_id).toBe("existing-brief-456");
  });

  it("deve falhar se o LLM retornar algo inválido (não-JSON)", async () => {
    const sb = createMockSupabase();
    const provider = createMockProvider("I'm sorry, I cannot fulfill this request.");

    await expect(runVisualIntelligence(provider, {
      projectId: "proj-error",
      workspaceId: "ws-error",
      prompt: fakePrompt,
      supabase: sb,
    })).rejects.toThrow("Invalid JSON");

    // Não deve ter salvo lixo
    expect(sb.records.visual_briefs.length).toBe(0);
    expect(sb.records.asset_requests.length).toBe(0);
  });

  it("deve falhar e não salvar se o JSON vier estruturalmente incompatível com o schema", async () => {
    const sb = createMockSupabase();
    const provider = createMockProvider({
      // business não foi passado, tudo bem (é opcional), mas enviamos `requests` com dados inválidos (ex: sem purpose que é obrigatório)
      requests: [{ invalid_field: "foo" }],
    });

    await expect(runVisualIntelligence(provider, {
      projectId: "proj-error2",
      workspaceId: "ws-error2",
      prompt: fakePrompt,
      supabase: sb,
    })).rejects.toThrow("expected string");

    expect(sb.records.visual_briefs.length).toBe(0);
    expect(sb.records.asset_requests.length).toBe(0);
  });
});
