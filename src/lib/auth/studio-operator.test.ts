import { describe, expect, it } from "vitest";
import { isStudioOperatorEmail } from "@/lib/auth/studio-operator";

describe("studio operator", () => {
  const env = {
    STUDIO_OWNER_EMAIL: "eu@x09.com.br",
    STUDIO_OPERATOR_EMAILS: "ops@x09.com.br, extra@x09.com.br",
  };

  it("reconhece o e-mail do owner", () => {
    expect(isStudioOperatorEmail("eu@x09.com.br", env)).toBe(true);
    expect(isStudioOperatorEmail("EU@x09.com.br", env)).toBe(true);
  });

  it("rejeita cliente", () => {
    expect(isStudioOperatorEmail("cliente@gmail.com", env)).toBe(false);
    expect(isStudioOperatorEmail(null, env)).toBe(false);
  });

  it("em setup local sem lista, o login autenticado é operador", () => {
    expect(
      isStudioOperatorEmail("eu@local.dev", { NODE_ENV: "development" }),
    ).toBe(true);
    expect(
      isStudioOperatorEmail("eu@local.dev", { NODE_ENV: "production" }),
    ).toBe(false);
  });
});
