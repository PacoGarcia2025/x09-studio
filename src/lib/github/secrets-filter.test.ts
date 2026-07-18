import { describe, expect, it } from "vitest";
import {
  filterFilesForPush,
  shouldExcludeFromPush,
} from "@/lib/github/secrets-filter";

describe("secrets filter for GitHub/Vercel pack", () => {
  it("excludes env and credential paths", () => {
    expect(shouldExcludeFromPush(".env")).toBe(true);
    expect(shouldExcludeFromPush(".env.local")).toBe(true);
    expect(shouldExcludeFromPush("/secrets/token.txt")).toBe(true);
    expect(shouldExcludeFromPush("credentials.json")).toBe(true);
    expect(shouldExcludeFromPush("src/App.tsx")).toBe(false);
  });

  it("excludes lockfiles and node_modules", () => {
    expect(shouldExcludeFromPush("package-lock.json")).toBe(true);
    expect(shouldExcludeFromPush("node_modules/lodash/index.js")).toBe(true);
  });

  it("filters a file map", () => {
    const out = filterFilesForPush({
      "/App.tsx": "export default function App(){return null}",
      "/.env": "SECRET=1",
      "/package-lock.json": "{}",
      "/components/Button.tsx": "export const Button = () => null",
    });
    expect(Object.keys(out).sort()).toEqual([
      "App.tsx",
      "components/Button.tsx",
    ]);
  });
});
