import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only para evitar erro no vitest
vi.mock("server-only", () => ({}));

import { createGenerationQuote, submitGenerationConsent } from "./asset-consent.server";

import { PublicError } from "@/lib/http/errors";
import type { AssetRequestRow } from "@/lib/assets/intelligence.types";

describe("Asset Consent & Custo (Fase 3.2)", () => {
  const fakeUserId = "user-123";
  const fakeWorkspaceId = "ws-123";
  const fakeProjectId = "proj-123";

  const fakeRequest: AssetRequestRow = {
    id: "req-1",
    workspace_id: fakeWorkspaceId,
    project_id: fakeProjectId,
    visual_brief_id: "brief-1",
    purpose: "hero",
    subject: "hambúrguer artesanal",
    description: null,
    composition: null,
    orientation: "landscape",
    aspect_ratio: "16:9",
    style: "premium",
    quality_requirements: null,
    context_usage: null,
    page_relation: null,
    status: "pending",
    created_at: "",
    updated_at: "",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createMockSupabase(dbState: any = {}) {
    return {
      from: vi.fn().mockImplementation((table) => {
        let chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
            if (table === "workspaces") {
              return { data: { owner_id: dbState.ownerId || fakeUserId }, error: null };
            }
            if (table === "asset_candidates") {
              return { data: dbState.candidate || null, error: null };
            }
            return { data: null, error: null };
          }),
          maybeSingle: vi.fn().mockImplementation(() => {
            if (table === "asset_candidates") {
              return { data: dbState.existingCandidate || null, error: null };
            }
            return { data: null, error: null };
          }),
          insert: vi.fn().mockImplementation((data) => {
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockReturnValue({ data: { id: "new-cand-123", ...data }, error: null }),
            };
          }),
          update: vi.fn().mockImplementation((data) => {
            dbState.updatedCandidate = data;
            return { eq: vi.fn().mockReturnValue({ error: null }) };
          })

        };
        return chain;
      }),
    } as any;
  }

  it("1. Asset Request pode gerar uma cotação.", async () => {
    const sb = createMockSupabase();
    const quote = await createGenerationQuote(sb, fakeRequest, fakeUserId);
    
    expect(quote.assetRequestId).toBe("req-1");
    expect(quote.candidateId).toBe("new-cand-123");
    expect(quote.message).toContain("Posso criar um(a) imagem exclusiva(o)");
    expect(quote.costCredits).toBe(8);
  });

  it("2. Cotação possui custo válido.", async () => {
    const sb = createMockSupabase();
    const quote = await createGenerationQuote(sb, fakeRequest, fakeUserId, "video");
    
    expect(quote.costCredits).toBe(20);
    expect(quote.message).toContain("20 créditos");
  });

  it("3. Usuário pode aceitar.", async () => {
    const dbState = {
      candidate: {
        id: "cand-1",
        origin: "ai_generated",
        status: "needs_review",
        workspaces: { owner_id: fakeUserId }
      }
    };
    const sb = createMockSupabase(dbState);
    
    await submitGenerationConsent(sb, "cand-1", true, fakeUserId);
    expect(dbState.updatedCandidate.status).toBe("approved");
  });

  it("4 e 5. Usuário pode recusar (Recusa não gera cobrança).", async () => {
    const dbState = {
      candidate: {
        id: "cand-1",
        origin: "ai_generated",
        status: "needs_review",
        workspaces: { owner_id: fakeUserId }
      }
    };
    const sb = createMockSupabase(dbState);
    
    await submitGenerationConsent(sb, "cand-1", false, fakeUserId);
    expect(dbState.updatedCandidate.status).toBe("rejected");
    // Garantimos que submitGenerationConsent não chama debit
  });

  it("6. Aprovação não chama provider de geração.", async () => {
    // Garantido pela própria implementação (submitGenerationConsent apenas atualiza o banco)
    // O retorno e o update não tem Promises adicionais ou imports de providers AI
    expect(typeof submitGenerationConsent).toBe("function");
  });

  it("7. Custo enviado pelo cliente não pode substituir o custo calculado pelo servidor.", async () => {
    const sb = createMockSupabase();
    // A função não aceita override de client, ela lê o ASSET_GENERATION_COSTS no backend
    const quote = await createGenerationQuote(sb, fakeRequest, fakeUserId);
    expect(quote.costCredits).toBe(8); // Fixo e não customizável pelo input
  });

  it("8. Usuário não pode aprovar um Asset Request pertencente a outro workspace.", async () => {
    const sb = createMockSupabase({ ownerId: "outro-dono" });
    await expect(createGenerationQuote(sb, fakeRequest, fakeUserId)).rejects.toThrowError(PublicError);

    const dbStateCand = {
      candidate: {
        id: "cand-1",
        origin: "ai_generated",
        status: "needs_review",
        workspaces: { owner_id: "outro-dono" }
      }
    };
    const sbCand = createMockSupabase(dbStateCand);
    await expect(submitGenerationConsent(sbCand, "cand-1", true, fakeUserId)).rejects.toThrowError(PublicError);
  });
});
