import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateTaskPayload } from "./task-content.server";
import type { LlmProvider } from "@/lib/llm/types";

describe("Phase 3.5 - Builder Asset Integration", () => {
  const createMockProvider = (onComplete: (prompt: string) => void): LlmProvider => ({
    id: "mock",
    complete: async (opts) => {
      const prompt = typeof opts.messages[opts.messages.length - 1]?.content === "string" 
        ? opts.messages[opts.messages.length - 1]?.content as string
        : "";
      onComplete(prompt);
      return { text: '{"content":"mock"}' };
    },
    completeJson: async (sys, prompt) => {
      onComplete(prompt);
      return { content: "mock" };
    },
    completeText: async (sys, prompt) => {
      onComplete(prompt);
      return "mock";
    },
  });

  it("deve incluir assets aprovados no prompt quando fornecidos", async () => {
    let capturedPrompt = "";
    const mockProvider = createMockProvider((p) => { capturedPrompt = p; });

    await generateTaskPayload(
      mockProvider,
      {
        type: "create_file",
        title: "Create Hero",
        instruction: "Build hero",
        path: "src/pages/HomePage.tsx",
      },
      {
        projectName: "Test Project",
        approvedAssets: [
          { 
            asset_request_id: "req-123",
            purpose: "Hero background", 
            subject: "Modern house", 
            page_relation: "HomePage",
            url: "/assets/cand-123.png" 
          },
        ],
      }
    );

    expect(capturedPrompt).toContain("[ASSETS APROVADOS PARA ESTE PROJETO]");
    expect(capturedPrompt).toContain("data-asset-request-id=\"ID_AQUI\"");
    expect(capturedPrompt).toContain("req-123");
    expect(capturedPrompt).toContain("HomePage");
    expect(capturedPrompt).toContain("Hero background");
    expect(capturedPrompt).toContain("Modern house");
    expect(capturedPrompt).toContain("/assets/cand-123.png");
  });

  it("não deve incluir bloco de assets aprovados quando array for vazio", async () => {
    let capturedPrompt = "";
    const mockProvider = createMockProvider((p) => { capturedPrompt = p; });

    await generateTaskPayload(
      mockProvider,
      {
        type: "create_file",
        title: "Create Hero",
        instruction: "Build hero",
        path: "src/pages/HomePage.tsx",
      },
      {
        projectName: "Test Project",
        approvedAssets: [],
      }
    );

    expect(capturedPrompt).not.toContain("[ASSETS APROVADOS PARA ESTE PROJETO]");
  });

  it("não deve incluir bloco de assets aprovados quando array for undefined", async () => {
    let capturedPrompt = "";
    const mockProvider = createMockProvider((p) => { capturedPrompt = p; });

    await generateTaskPayload(
      mockProvider,
      {
        type: "create_file",
        title: "Create Hero",
        instruction: "Build hero",
        path: "src/pages/HomePage.tsx",
      },
      {
        projectName: "Test Project",
      }
    );

    expect(capturedPrompt).not.toContain("[ASSETS APROVADOS PARA ESTE PROJETO]");
  });
});
