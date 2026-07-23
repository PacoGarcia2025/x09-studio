/**
 * Gera lista de ícones exportados por lucide-react (mesma versão do runtime-deps).
 * Rodar após atualizar lucide-react: node scripts/generate-lucide-icons.mjs
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const lucide = require("lucide-react");

const icons = Object.keys(lucide)
  .filter((k) => /^[A-Z]/.test(k) && k !== "Icon" && !k.endsWith("Icon"))
  .sort();

const out = `/** Gerado por scripts/generate-lucide-icons.mjs — não editar manualmente. */
export const LUCIDE_ICON_NAMES = ${JSON.stringify(icons, null, 2)} as const;

export type LucideIconName = (typeof LUCIDE_ICON_NAMES)[number];

export const LUCIDE_ICON_SET: ReadonlySet<string> = new Set(LUCIDE_ICON_NAMES);
`;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(
  path.join(root, "src/lib/projects/lucide-icons.generated.ts"),
  out,
  "utf8",
);
console.log(`Generated ${icons.length} lucide icon names.`);
