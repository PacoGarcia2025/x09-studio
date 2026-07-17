/**
 * Contrato mock → real para apps gerados.
 * Preview usa mocks; Publish troca o adapter após aprovar migrations.
 */

export type PublishPlan = {
  projectId: string;
  migrations: Array<{ path: string; sql: string; destructive: boolean }>;
  entities: string[];
  authRequired: boolean;
  warnings: string[];
};

export type PublishResult =
  | { ok: true; mode: "mock" | "supabase"; applied: string[] }
  | { ok: false; error: string };

const DESTRUCTIVE_SQL =
  /\b(drop\s+table|truncate|drop\s+schema|alter\s+table\s+\w+\s+drop)\b/i;

/**
 * Extrai plano de publicação a partir dos arquivos gerados.
 */
export function buildPublishPlan(
  projectId: string,
  files: Record<string, string>,
): PublishPlan {
  const migrations = Object.entries(files)
    .filter(([path]) => /supabase\/migrations\/.+\.sql$/i.test(path))
    .map(([path, sql]) => ({
      path,
      sql,
      destructive: DESTRUCTIVE_SQL.test(sql),
    }));

  const dataFile = files["/lib/data.ts"] ?? files["/lib/mock-data.ts"] ?? "";
  const authRequired = /authRequired:\s*true|signIn|getSession/.test(
    Object.values(files).join("\n"),
  );

  const entities = Array.from(
    new Set(
      [...dataFile.matchAll(/createRepository<[^>]*>\(\s*\[/g)].map(
        () => "entity",
      ),
    ),
  );

  const warnings: string[] = [];
  if (migrations.some((m) => m.destructive)) {
    warnings.push(
      "Há SQL destrutivo (DROP/TRUNCATE). Exige confirmação explícita.",
    );
  }
  if (migrations.length === 0 && authRequired) {
    warnings.push("App com auth/dados sem migration SQL — Publish parcial.");
  }

  return {
    projectId,
    migrations,
    entities,
    authRequired,
    warnings,
  };
}

/**
 * Preview: nunca aplica SQL. Só valida o plano.
 */
export function validatePublishPlan(plan: PublishPlan): PublishResult {
  if (plan.migrations.some((m) => m.destructive)) {
    return {
      ok: false,
      error:
        "Migrations destrutivas bloqueadas até confirmação manual no Deploy.",
    };
  }
  return {
    ok: true,
    mode: "mock",
    applied: [],
  };
}

/**
 * Publish real (stub seguro): retorna lista a aplicar.
 * A aplicação no Supabase do cliente ocorre só após UI de confirmação.
 */
export async function applyPublishPlan(
  plan: PublishPlan,
  opts: { confirmDestructive: boolean },
): Promise<PublishResult> {
  if (plan.migrations.some((m) => m.destructive) && !opts.confirmDestructive) {
    return {
      ok: false,
      error: "Confirme migrations destrutivas para continuar.",
    };
  }

  // Stub: em produção, usar service role no BFF /api/publish
  return {
    ok: true,
    mode: "supabase",
    applied: plan.migrations.map((m) => m.path),
  };
}
