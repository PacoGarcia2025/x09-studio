import { describe, expect, it } from "vitest";
import {
  countPageSections,
  meetsPremiumSectionBar,
} from "@/lib/pipeline/page-sections";

describe("page-sections", () => {
  it("conta header/main/footer", () => {
    const html = "<header/><main/><footer/><div/>";
    expect(countPageSections(html)).toBe(3);
  });

  it("aceita página densa com poucos blocos semânticos", () => {
    const dense = `<main>${"x".repeat(4000)}</main>`;
    expect(meetsPremiumSectionBar(dense, 4)).toBe(true);
  });
});
