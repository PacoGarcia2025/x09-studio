import { describe, expect, it } from "vitest";
import { buildFakeMeshGlb, isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";
import {
  glbHasIdleMotion,
  injectIdleMotion,
  parseGlb,
} from "@/lib/capability-router/providers/idle-motion-glb";

describe("idle motion GLB", () => {
  it("injeta um clip em loop sem partir o ficheiro", () => {
    const source = buildFakeMeshGlb();
    expect(glbHasIdleMotion(source)).toBe(false);
    const out = injectIdleMotion(source);
    expect(isGlbMagic(out)).toBe(true);
    expect(glbHasIdleMotion(out)).toBe(true);
    const { json } = parseGlb(out);
    expect(json.animations?.[0]?.name).toBe("x09-idle");
    expect(out.byteLength).toBeGreaterThan(source.byteLength);
  });

  it("é idempotente se o idle já existir", () => {
    const once = injectIdleMotion(buildFakeMeshGlb());
    const twice = injectIdleMotion(once);
    expect(twice).toBe(once);
  });
});
