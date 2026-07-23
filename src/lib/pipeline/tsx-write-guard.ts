import {
  getTsxSyntaxIssues,
  hasValidTsxSyntax,
  isTsxPath,
} from "@/lib/pipeline/jsx-validate";
import { repairKnownRuntimeImportsInSource } from "@/lib/projects/jsx-scope";
import { repairInvalidLucideImportsInSource } from "@/lib/projects/lucide-validate";
import { prepareSandpackFileContent } from "@/lib/projects/preview-map";

function toVirtualPath(projectPath: string): string {
  const normalized = projectPath.replace(/\\/g, "/");
  if (normalized.startsWith("src/")) return `/${normalized.slice(4)}`;
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function prepareTsxForProject(path: string, content: string): string {
  if (!isTsxPath(path)) return content;
  const repaired = repairKnownRuntimeImportsInSource(
    repairInvalidLucideImportsInSource(content),
  );
  return prepareSandpackFileContent(toVirtualPath(path), repaired);
}

export function assertValidTsxOrThrow(path: string, content: string): void {
  const normalized = path.replace(/\\/g, "/");
  if (!isTsxPath(normalized)) return;
  if (hasValidTsxSyntax(content, normalized)) return;
  const issues = getTsxSyntaxIssues(content, normalized);
  throw new Error(
    `Sintaxe TSX inválida em ${normalized}: ${issues.join("; ")}`,
  );
}
