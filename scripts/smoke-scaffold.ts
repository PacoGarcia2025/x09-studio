import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";
import { scaffoldProject } from "../src/lib/projects/scaffold.server";
import {
  listProjectTree,
  readProjectFile,
  writeProjectFile,
} from "../src/lib/projects/fs.server";

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
  const projectId = randomUUID();
  const { projectDir, created } = await scaffoldProject(projectId);
  console.log("SCAFFOLD", created, projectDir);

  const tree = await listProjectTree(projectId);
  const names = tree.map((n) => n.name);
  console.log("ROOT_ENTRIES", names.join(", "));

  for (const required of ["src", "public", "package.json", "vite.config.ts"]) {
    if (!names.includes(required)) {
      throw new Error(`missing ${required}`);
    }
  }

  const pkg = await readProjectFile(projectId, "package.json");
  if (!pkg.includes("react-supabase-starter") && !pkg.includes("vite")) {
    throw new Error("package.json unexpected");
  }

  await writeProjectFile(
    projectId,
    "src/pages/HomePage.tsx",
    'export function HomePage() {\n  return <h1>Smoke OK</h1>;\n}\n',
  );
  const home = await readProjectFile(projectId, "src/pages/HomePage.tsx");
  if (!home.includes("Smoke OK")) throw new Error("write/read failed");

  console.log("ALL_OK");
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
