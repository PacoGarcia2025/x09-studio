/**
 * Smoke local do Verify (sem DB): roda checks contra um projectId em disco.
 *
 * Uso:
 *   STUDIO_PROJECTS_ROOT=... npx tsx scripts/smoke-verify.ts <projectId>
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { runVerifyCategory } from "../src/lib/pipeline/verify-checks.server";
import {
  VERIFY_CATEGORY_ORDER,
  createEmptyVerifyReport,
  deriveOverallStatus,
} from "../src/lib/pipeline/verify-schema";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    process.env[t.slice(0, i)] ??= t.slice(i + 1);
  }
}

async function main() {
  loadEnvLocal();
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Uso: npx tsx scripts/smoke-verify.ts <projectId>");
    process.exit(1);
  }

  let report = createEmptyVerifyReport({ projectId, planId: null });

  for (const category of VERIFY_CATEGORY_ORDER) {
    process.stdout.write(`→ ${category}… `);
    const outcome = await runVerifyCategory(projectId, category);
    report = {
      ...report,
      issues: [...report.issues, ...outcome.issues],
      toolTraces: [...report.toolTraces, ...outcome.traces],
      categories: {
        ...report.categories,
        [category]: {
          status: outcome.status,
          summary: outcome.summary,
        },
      },
    };
    console.log(outcome.status, "—", outcome.summary);
  }

  const status = deriveOverallStatus(report.categories, report.issues);
  console.log("\nOverall:", status);
  console.log("Issues:", report.issues.length);
  for (const issue of report.issues.slice(0, 20)) {
    console.log(
      `  [${issue.severity}] ${issue.category}/${issue.code}: ${issue.message}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
