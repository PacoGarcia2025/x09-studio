import { describe, expect, it } from "vitest";

describe("publish install strategy", () => {
  it("usa npm install quando deps foram adicionadas ou lock ausente", () => {
    const shouldInstall = (addedDeps: string[], hasLock: boolean) =>
      addedDeps.length > 0 || !hasLock;

    expect(shouldInstall(["framer-motion"], true)).toBe(true);
    expect(shouldInstall([], false)).toBe(true);
    expect(shouldInstall([], true)).toBe(false);
  });
});
