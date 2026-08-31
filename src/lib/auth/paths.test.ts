import { describe, expect, it } from "vitest";
import {
  authLink,
  projectCreatePath,
  sanitizeNextPath,
  signupForPrompt,
} from "@/lib/auth/paths";

describe("auth paths", () => {
  it("sanitiza next inválido", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/projects");
    expect(sanitizeNextPath(null)).toBe("/projects");
    expect(sanitizeNextPath("/projects/new?q=foo")).toBe("/projects/new?q=foo");
  });

  it("monta link de signup com next", () => {
    expect(authLink("/signup", "/projects/new?q=teste")).toBe(
      "/signup?next=%2Fprojects%2Fnew%3Fq%3Dteste",
    );
  });

  it("monta caminho de criação com prompt", () => {
    expect(projectCreatePath("Landing premium")).toContain("Landing");
    expect(projectCreatePath("ab")).toBe("/projects#prompt");
  });

  it("signup a partir do prompt da landing", () => {
    const link = signupForPrompt("Site para imobiliária");
    expect(link).toContain("/signup");
    expect(link).toContain("imobili");
  });
});
