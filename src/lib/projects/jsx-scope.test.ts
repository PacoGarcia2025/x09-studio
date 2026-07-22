import { describe, expect, it } from "vitest";
import {
  findUndeclaredJsxInSource,
  formatUndeclaredJsxMessage,
  repairKnownRuntimeImportsInSource,
} from "@/lib/projects/jsx-scope";

describe("findUndeclaredJsxInSource", () => {
  it("detecta Shield usado sem import", () => {
    const source = `export default function HomePage() {
  return (
    <section>
      <Shield className="text-amber-400" size={36} />
    </section>
  );
}
`;
    const issues = findUndeclaredJsxInSource(source, "src/pages/HomePage.tsx");
    expect(issues).toEqual([
      { file: "src/pages/HomePage.tsx", name: "Shield", line: 4 },
    ]);
  });

  it("ignora componentes importados e declarados localmente", () => {
    const source = `import { Shield } from "lucide-react";

function Feature() {
  return <Shield />;
}

export default function HomePage() {
  return <Feature />;
}
`;
    expect(findUndeclaredJsxInSource(source, "src/pages/HomePage.tsx")).toEqual(
      [],
    );
  });

  it("detecta motion sem import de framer-motion", () => {
    const source = `export default function HomePage() {
  return <motion.div animate={{ opacity: 1 }} />;
}
`;
    const issues = findUndeclaredJsxInSource(source, "src/pages/HomePage.tsx");
    expect(issues).toEqual([
      { file: "src/pages/HomePage.tsx", name: "motion", line: 2 },
    ]);
  });
});

describe("repairKnownRuntimeImportsInSource", () => {
  it("injeta import de lucide-react para Shield", () => {
    const source = `export default function HomePage() {
  return <Shield size={24} />;
}
`;
    const repaired = repairKnownRuntimeImportsInSource(source);
    expect(repaired).toContain('import { Shield } from "lucide-react"');
    expect(findUndeclaredJsxInSource(repaired, "file.tsx")).toEqual([]);
  });

  it("mescla ícones em import lucide existente", () => {
    const source = `import { Star } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Star />
      <Shield />
    </>
  );
}
`;
    const repaired = repairKnownRuntimeImportsInSource(source);
    expect(repaired).toContain("Shield");
    expect(repaired).toContain("Star");
    expect(repaired.match(/from "lucide-react"/g)).toHaveLength(1);
  });
});

describe("formatUndeclaredJsxMessage", () => {
  it("formata primeira falha", () => {
    const msg = formatUndeclaredJsxMessage([
      { file: "src/pages/HomePage.tsx", name: "Shield", line: 160 },
    ]);
    expect(msg).toContain("Shield");
    expect(msg).toContain("HomePage.tsx:160");
  });
});
