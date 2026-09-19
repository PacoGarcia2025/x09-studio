import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateAssetFromCandidate } from "./asset-generation.server";
import { createServiceClient } from "@/lib/supabase/service-client";
import { debitAssetJobCredits, refundAssetJobCredits } from "@/lib/billing/asset-job-credits";
import { getAssetStorage } from "@/lib/storage/registry";
import { ASSET_GENERATION_COSTS } from "@/lib/billing/credits";

// Mocks
vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/billing/asset-job-credits", () => ({
  debitAssetJobCredits: vi.fn(),
  refundAssetJobCredits: vi.fn(),
}));

vi.mock("@/lib/storage/registry", () => ({
  getAssetStorage: vi.fn(),
}));

// Mock the open-ai provider natively for tests, intercepting fetch
global.fetch = vi.fn();

describe("Asset Generation Phase 3.3", () => {
  let mockSupabase: any;
  let mockStorageDriver: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    };
    (createServiceClient as any).mockReturnValue(mockSupabase);

    mockStorageDriver = {
      writeFile: vi.fn().mockResolvedValue(undefined),
    };
    (getAssetStorage as any).mockReturnValue(mockStorageDriver);

    (debitAssetJobCredits as any).mockResolvedValue({ ok: true });
    (refundAssetJobCredits as any).mockResolvedValue({ ok: true });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ b64_json: "fake_base64_data" }]
      })
    });
    
    process.env.OPENAI_API_KEY = "test-key";
  });

  const defaultInput = {
    userId: "user-1",
    workspaceId: "ws-1",
    projectId: "proj-1",
    candidateId: "cand-1",
  };

  const defaultCandidate = {
    id: "cand-1",
    workspace_id: "ws-1",
    project_id: "proj-1",
    origin: "ai_generated",
    status: "approved",
    meta: {},
    asset_requests: {
      subject: "hamburguer",
      orientation: "landscape",
      aspect_ratio: "16:9",
      quality_requirements: "high quality",
    }
  };

  it("1. candidate aprovado gera normalmente", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { ...defaultCandidate, asset_url: "/path.png" }, error: null }); // update return

    const result = await generateAssetFromCandidate(defaultInput);
    
    expect(result.ok).toBe(true);
    expect(debitAssetJobCredits).toHaveBeenCalledWith(expect.objectContaining({
      amount: ASSET_GENERATION_COSTS.image,
      assetId: "cand-1",
    }));
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("dall-e-3")
      })
    );
    expect(mockStorageDriver.writeFile).toHaveBeenCalled();
  });

  it("2. candidate não aprovado não gera", async () => {
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { ...defaultCandidate, status: "needs_review" }, 
      error: null 
    });

    await expect(generateAssetFromCandidate(defaultInput)).rejects.toThrow("Apenas candidatos aprovados podem ser gerados.");
    expect(debitAssetJobCredits).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("3. origin não é ai_generated não gera", async () => {
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { ...defaultCandidate, origin: "external_source" }, 
      error: null 
    });

    await expect(generateAssetFromCandidate(defaultInput)).rejects.toThrow("Este candidato não é originado de IA.");
  });

  it("4. erro do provider causa refund quando já houve débito e status rejected", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }); // update

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "content_policy_violation"
    });

    await expect(generateAssetFromCandidate(defaultInput)).rejects.toThrow("Falha na geração");

    expect(debitAssetJobCredits).toHaveBeenCalled();
    expect(refundAssetJobCredits).toHaveBeenCalled();
    
    // Verifies the candidate was marked as rejected
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "rejected"
    }));
  });

  it("5. erro de Storage causa refund", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }); // update

    mockStorageDriver.writeFile.mockRejectedValueOnce(new Error("Disk full"));

    await expect(generateAssetFromCandidate(defaultInput)).rejects.toThrow("Falha ao salvar no storage");

    expect(debitAssetJobCredits).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    expect(refundAssetJobCredits).toHaveBeenCalled();
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "rejected"
    }));
  });

  it("6. provider recebe prompt construído a partir do Asset Request e traduz aspect ratio 16:9 para 1792x1024", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: defaultCandidate, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { ...defaultCandidate, asset_url: "/path.png" }, error: null }); 

    await generateAssetFromCandidate(defaultInput);

    const callArgs = (global.fetch as any).mock.calls[0];
    const bodyStr = callArgs[1].body;
    const bodyObj = JSON.parse(bodyStr);

    expect(bodyObj.prompt).toContain("hamburguer");
    expect(bodyObj.size).toBe("1792x1024");
    expect(bodyObj.quality).toBe("hd");
  });

  it("7. fallback coherente de 4:3 para landscape (1792x1024)", async () => {
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { ...defaultCandidate, asset_requests: { aspect_ratio: "4:3" } }, 
      error: null 
    });
    mockSupabase.single.mockResolvedValueOnce({ data: { ...defaultCandidate, asset_url: "/path.png" }, error: null }); 

    await generateAssetFromCandidate(defaultInput);

    const bodyObj = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(bodyObj.size).toBe("1792x1024");
  });
});
