import { describe, expect, it } from "vitest";
import { TRELLIS_VOLUME } from "@/lib/capability-router/providers/trellis-volume";

describe("TRELLIS volume contract", () => {
  it("keeps python, weights and code on /workspace", () => {
    expect(TRELLIS_VOLUME.python.startsWith("/workspace/")).toBe(true);
    expect(TRELLIS_VOLUME.root).toBe("/workspace/TRELLIS");
    expect(TRELLIS_VOLUME.hfHome).toBe("/workspace/hf-cache");
    expect(TRELLIS_VOLUME.image).toContain("pytorch:2.4.0");
    expect(TRELLIS_VOLUME.image).toContain("cuda12.4.1");
  });
});
