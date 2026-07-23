import { describe, expect, it } from "vitest";
import {
  extractPublishSlugFromHost,
  buildProjectSubdomainHost,
} from "@/lib/projects/publish-url";

describe("extractPublishSlugFromHost", () => {
  it("extrai slug de subdomínio publicado", () => {
    expect(
      extractPublishSlugFromHost("prompt-teste-sgo-imoveis-o5n61.studio.x09.com.br"),
    ).toBe("prompt-teste-sgo-imoveis-o5n61");
  });

  it("ignora domínio raiz do Studio", () => {
    expect(extractPublishSlugFromHost("studio.x09.com.br")).toBeNull();
  });

  it("ignora localhost", () => {
    expect(extractPublishSlugFromHost("localhost:3001")).toBeNull();
  });
});

describe("buildProjectSubdomainHost", () => {
  it("monta host canônico", () => {
    expect(buildProjectSubdomainHost("meu-projeto")).toBe(
      "meu-projeto.studio.x09.com.br",
    );
  });
});
