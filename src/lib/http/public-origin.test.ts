import { describe, expect, it } from "vitest";
import { publicOriginFromHeaders } from "@/lib/http/public-origin";

function headers(map: Record<string, string>) {
  return {
    get(name: string) {
      return map[name.toLowerCase()] ?? null;
    },
  };
}

describe("publicOriginFromHeaders", () => {
  it("usa o host que o Nginx encaminha, não o localhost do Node", () => {
    expect(
      publicOriginFromHeaders(
        headers({
          "x-forwarded-host": "studio.x09.com.br",
          "x-forwarded-proto": "https",
          host: "127.0.0.1:3001",
        }),
        "http://localhost:3001",
      ),
    ).toBe("https://studio.x09.com.br");
  });

  it("cai no URL público se o pedido só vir com localhost", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://studio.x09.com.br";
    try {
      expect(
        publicOriginFromHeaders(
          headers({
            host: "localhost:3001",
            "x-forwarded-host": "localhost:3001",
          }),
          "http://localhost:3001",
        ),
      ).toBe("https://studio.x09.com.br");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});
