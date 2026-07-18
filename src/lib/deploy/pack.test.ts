import { describe, expect, it } from "vitest";
import { packVisualProjectForVercel } from "@/lib/deploy/pack";

describe("packVisualProjectForVercel", () => {
  it("materializes a Vite project and maps App.tsx into src/", () => {
    const packed = packVisualProjectForVercel({
      name: "Demo App",
      files: {
        "/App.tsx": "export default function App(){ return <div>Hi</div> }",
        "/components/Hero.tsx": "export function Hero(){ return null }",
        "/.env": "SECRET=nope",
      },
    });

    const map = Object.fromEntries(packed.map((f) => [f.file, f.data]));
    expect(map["package.json"]).toContain("vite");
    expect(map["src/App.tsx"]).toContain("Hi");
    expect(map["src/components/Hero.tsx"]).toContain("Hero");
    expect(map[".env"]).toBeUndefined();
    expect(map["vercel.json"]).toBeTruthy();
  });
});
