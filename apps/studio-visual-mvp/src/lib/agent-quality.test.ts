import { describe, expect, it } from "vitest";
import { parseAIResponse } from "./parser";
import { buildPublishPlan, validatePublishPlan } from "./publish";
import { sanitizeSandpackCode } from "../components/workspace/sandpack-files";
import { resolveGenerationMode } from "./api";
import { evaluateAcceptanceGates, summarizeGates } from "./quality-gates";

describe("parseAIResponse", () => {
  it("extrai múltiplos arquivos por path=", () => {
    const text = `
Pronto.

\`\`\`tsx path="/App.tsx"
export default function App() { return null }
\`\`\`

\`\`\`tsx path="/pages/Home.tsx"
export function Home() { return <div>Hi</div> }
\`\`\`
`;
    const files = parseAIResponse(text);
    expect(files["/App.tsx"]).toContain("export default function App");
    expect(files["/pages/Home.tsx"]).toContain("Home");
  });
});

describe("sanitizeSandpackCode", () => {
  it("alias Instagram → AtSign", () => {
    const code = `import { Instagram, Mail } from "lucide-react";`;
    const next = sanitizeSandpackCode(code);
    expect(next).toContain("AtSign as Instagram");
    expect(next).toContain("Mail");
  });

  it("remove import de tailwindcss", () => {
    const code = `import 'tailwindcss';\nexport const x = 1;`;
    expect(sanitizeSandpackCode(code)).not.toContain("tailwindcss");
  });
});

describe("resolveGenerationMode", () => {
  it("cria app novo como premium", () => {
    expect(
      resolveGenerationMode("cria um CRM com login", {
        preference: "auto",
        hasExistingApp: false,
      }),
    ).toBe("premium");
  });

  it("edição curta como edit", () => {
    expect(
      resolveGenerationMode("troca a cor do botão", {
        preference: "auto",
        hasExistingApp: true,
      }),
    ).toBe("edit");
  });
});

describe("publish plan", () => {
  it("bloqueia SQL destrutivo sem confirmação", () => {
    const plan = buildPublishPlan("11111111-1111-1111-1111-111111111111", {
      "/supabase/migrations/001.sql": "DROP TABLE users;",
    });
    expect(plan.migrations[0]?.destructive).toBe(true);
    const result = validatePublishPlan(plan);
    expect(result.ok).toBe(false);
  });
});

describe("quality gates", () => {
  it("passa quando preview limpo e kit presente", () => {
    const gates = evaluateAcceptanceGates({
      hasPreviewError: false,
      repairCycles: 1,
      fileCount: 3,
      usesDesignTokens: true,
      usesKit: true,
      metrics: { repairCycles: 1, firstBuildOk: true },
    });
    expect(summarizeGates(gates).passed).toBe(true);
  });
});
