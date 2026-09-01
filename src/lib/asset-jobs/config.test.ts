import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSET_JOB_STALE_MS,
  getAssetJobStaleMs,
} from "@/lib/asset-jobs/config";

describe("asset job stale (fila genérica)", () => {
  it("usa 40 min quando o env está vazio", () => {
    expect(getAssetJobStaleMs({})).toBe(DEFAULT_ASSET_JOB_STALE_MS);
    expect(DEFAULT_ASSET_JOB_STALE_MS).toBe(40 * 60 * 1000);
  });

  it("aceita um valor configurado", () => {
    expect(
      getAssetJobStaleMs({ STUDIO_ASSET_JOB_STALE_MS: "3600000" }),
    ).toBe(3_600_000);
  });

  it("ignora valores inválidos ou abaixo de 1 min", () => {
    expect(getAssetJobStaleMs({ STUDIO_ASSET_JOB_STALE_MS: "abc" })).toBe(
      DEFAULT_ASSET_JOB_STALE_MS,
    );
    expect(getAssetJobStaleMs({ STUDIO_ASSET_JOB_STALE_MS: "500" })).toBe(
      DEFAULT_ASSET_JOB_STALE_MS,
    );
  });
});
