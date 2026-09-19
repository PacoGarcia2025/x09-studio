import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAssetCandidate } from "./asset-validation.server";
import { createServiceClient } from "@/lib/supabase/service-client";
import { getAssetStorage } from "@/lib/storage/registry";
import { OpenAiVisionProvider } from "@/lib/assets/providers/openai-vision";
import sizeOf from "image-size";

vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/storage/registry", () => ({
  getAssetStorage: vi.fn(),
}));

vi.mock("image-size", () => ({
  default: vi.fn(),
}));

describe("Asset Validation Phase 3.4", () => {
  let mockSupabase: any;
  let mockStorageDriver: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    (createServiceClient as any).mockReturnValue(mockSupabase);

    mockStorageDriver = {
      readFile: vi.fn().mockResolvedValue(Buffer.from("fake-bytes")),
    };
    (getAssetStorage as any).mockReturnValue(mockStorageDriver);

    (sizeOf as any).mockReturnValue({ width: 1024, height: 1024 });
    
    // Mock the global fetch to NEVER reach actual external networks in tests
    global.fetch = vi.fn();

    // Intercept provider prototype internally
    vi.spyOn(OpenAiVisionProvider.prototype, "validateAsset").mockResolvedValue({
      relevance_score: 0.9,
      quality_score: 0.9,
      composition_check: true,
      visual_coherence: true,
      purpose_adherence: true
    });
  });

  const defaultCandidate = {
    id: "cand-1",
    workspace_id: "ws-1",
    project_id: "proj-1",
    origin: "ai_generated",
    asset_url: "generated/cand-1.png",
    format: "png",
    meta: { user_id: "user-1" },
    asset_requests: {
      orientation: "square"
    }
  };

  const defaultInput = {
    candidateId: "cand-1",
    userId: "user-1"
  };

  it("1. candidato aprovado", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null }); // get candidate
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // check idempotency
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "val-1", final_result: "approved" }, error: null }); // insert validation
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "asset-1" }, error: null }); // insert public asset

    const res = await validateAssetCandidate(defaultInput);
    expect(res.final_result).toBe("approved");
    expect(OpenAiVisionProvider.prototype.validateAsset).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith("assets");
    expect(mockSupabase.update).toHaveBeenCalledWith({ final_asset_id: "asset-1" });
  });

  it("2. arquivo inexistente", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    
    mockStorageDriver.readFile.mockRejectedValueOnce(new Error("File not found"));
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "val-err", final_result: "rejected", rejection_reason: "Falha determinística: Arquivo ilegível ou inexistente (File not found)" }, error: null }); // insert validation

    const res = await validateAssetCandidate(defaultInput);
    expect(res.final_result).toBe("rejected");
    expect(res.rejection_reason).toContain("Arquivo ilegível ou inexistente");
    expect(OpenAiVisionProvider.prototype.validateAsset).not.toHaveBeenCalled();
    // Assets table should NOT be called
    expect(mockSupabase.from).not.toHaveBeenCalledWith("assets");
  });

  it("3. aspecto ratio incompatível (exigido landscape, real portrait)", async () => {
    const candidate = { ...defaultCandidate, asset_requests: { orientation: "landscape" } };
    mockSupabase.single.mockResolvedValueOnce({ data: candidate, error: null });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "val-err", final_result: "rejected", rejection_reason: "Orientation incompatível" }, error: null }); 

    // Return a portrait image dimension
    (sizeOf as any).mockReturnValue({ width: 500, height: 1000 });

    const res = await validateAssetCandidate(defaultInput);
    expect(res.final_result).toBe("rejected");
    expect(res.rejection_reason).toContain("Orientation incompatível");
    expect(OpenAiVisionProvider.prototype.validateAsset).not.toHaveBeenCalled();
  });

  it("4. idempotência: validação já existe não consome tokens", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { final_result: "approved" }, error: null }); // existing

    const res = await validateAssetCandidate(defaultInput);
    expect(res.final_result).toBe("approved");
    expect(mockStorageDriver.readFile).not.toHaveBeenCalled();
    expect(OpenAiVisionProvider.prototype.validateAsset).not.toHaveBeenCalled();
  });

  it("5. visão identifica incompatibilidade e retorna rejected (não promove asset)", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "val-1", final_result: "rejected", rejection_reason: "Produto cortado." }, error: null }); 

    vi.spyOn(OpenAiVisionProvider.prototype, "validateAsset").mockResolvedValue({
      relevance_score: 0.1,
      quality_score: 0.4,
      composition_check: false,
      visual_coherence: true,
      purpose_adherence: false,
      rejection_reason: "Produto cortado."
    });

    const res = await validateAssetCandidate(defaultInput);
    expect(res.final_result).toBe("rejected");
    expect(res.rejection_reason).toBe("Produto cortado.");
    expect(mockSupabase.from).not.toHaveBeenCalledWith("assets");
  });

  it("6. timeout do Vision Provider cai em needs_review", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "val-1", final_result: "needs_review", rejection_reason: "Falha do VisionProvider: Timeout" }, error: null }); 

    vi.spyOn(OpenAiVisionProvider.prototype, "validateAsset").mockRejectedValue(new Error("Timeout"));

    const res = await validateAssetCandidate(defaultInput);
    expect(res.final_result).toBe("needs_review");
    expect(res.rejection_reason).toContain("Timeout");
    expect(mockSupabase.from).not.toHaveBeenCalledWith("assets");
  });

  it("7. external_source lê a URL externa e faz fallback mime seguro", async () => {
    const extCand = { ...defaultCandidate, origin: "external_source", asset_url: "https://unsplash.com/foto" };
    mockSupabase.single.mockResolvedValueOnce({ data: extCand, error: null });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "val-1", final_result: "approved" }, error: null }); 
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "asset-1" }, error: null });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
      headers: { get: () => "image/jpeg" }
    });

    const res = await validateAssetCandidate(defaultInput);
    expect(global.fetch).toHaveBeenCalledWith("https://unsplash.com/foto");
    expect(res.final_result).toBe("approved");
  });
});
