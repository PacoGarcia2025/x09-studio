import { describe, expect, it } from "vitest";
import {
  closeAndSimplify,
  earclip,
  marchingSquaresLoops,
  signedArea,
} from "@/lib/capability-router/providers/logo-plate-contour";

describe("logo-plate contour", () => {
  it("extrai um anel de um disco na grelha", () => {
    const n = 12;
    const field = Array.from({ length: n + 1 }, (_, y) =>
      Array.from({ length: n + 1 }, (__, x) => {
        const dx = x - n / 2;
        const dy = y - n / 2;
        return Math.hypot(dx, dy) <= n * 0.35 ? 1 : 0;
      }),
    );
    const loops = marchingSquaresLoops(field);
    expect(loops.length).toBeGreaterThanOrEqual(1);
    const ring = closeAndSimplify(loops[0]!, 0.4);
    expect(ring.length).toBeGreaterThanOrEqual(6);
    expect(Math.abs(signedArea(ring))).toBeGreaterThan(4);
  });

  it("triangula um quadrado", () => {
    const tris = earclip([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ]);
    expect(tris.length).toBe(2);
  });
});
