import { describe, expect, it } from "vitest";
import {
  readMercadoPagoAccessToken,
  readMercadoPagoWebhookSecret,
} from "@/lib/billing/mp-env";

describe("Mercado Pago env aliases", () => {
  it("accepts the Studio name and the x09 site name", () => {
    expect(readMercadoPagoAccessToken({ MP_ACCESS_TOKEN: "APP_USR-a" })).toBe(
      "APP_USR-a",
    );
    expect(
      readMercadoPagoAccessToken({
        MERCADO_PAGO_ACCESS_TOKEN: "APP_USR-b",
      }),
    ).toBe("APP_USR-b");
    expect(readMercadoPagoAccessToken({})).toBeNull();
  });

  it("accepts webhook secret aliases", () => {
    expect(
      readMercadoPagoWebhookSecret({ MERCADO_PAGO_WEBHOOK_SECRET: "s" }),
    ).toBe("s");
  });
});
