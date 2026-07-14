import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createGeminiFlashProvider } from "../src/lib/llm/gemini";
import { runPlanner } from "../src/lib/pipeline/planner.server";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local missing");
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
  const provider = createGeminiFlashProvider();
  const result = await runPlanner(provider, {
    prompt: "Crie um CRM para imobiliária.",
    projectName: "CRM Demo",
    projectSlug: "crm-demo",
  });

  console.log("MODEL", result.model);
  console.log("SUMMARY", result.plan.summary.slice(0, 160));
  console.log("MODULES", result.plan.modules.length);
  console.log("PAGES", result.plan.pages.length);
  console.log("TABLES", result.plan.database.tables.length);
  console.log("APIS", result.plan.apis.length);
  console.log("AUTH", result.plan.auth.providers.join(","));
  console.log("INTEGRATIONS", result.plan.integrations.length);
  console.log("TASKS", result.plan.tasks.length);
  if (result.plan.tasks.length < 3) {
    throw new Error("fewer than 3 tasks");
  }
  console.log("ALL_OK");
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
