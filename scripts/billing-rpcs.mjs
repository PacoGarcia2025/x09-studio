/**
 * Probe (and optionally apply) billing RPCs on the Studio Supabase project.
 * Never prints secrets, keys, or user emails.
 *
 *   node scripts/billing-rpcs.mjs
 *   node scripts/billing-rpcs.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local não encontrado");
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    let value = trimmed.slice(i + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, i)] = value;
  }
  return env;
}

function envFlag(env, key) {
  const raw = (env[key] ?? process.env[key] ?? "").trim();
  if (!raw) return false;
  if (/^(your-|change-me|APP_USR-\.\.\.|sb_)/i.test(raw) && raw.endsWith("...")) {
    return false;
  }
  return raw.length > 8;
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function classifyRpcError(message) {
  const text = String(message ?? "");
  if (/could not find the function|schema cache/i.test(text)) return "MISSING";
  if (/insufficient_credits/i.test(text)) return "PRESENT";
  if (/foreign key|violates foreign key/i.test(text)) return "PRESENT";
  if (/idempotency_key required/i.test(text)) return "PRESENT";
  if (/permission denied|not granted/i.test(text)) return "PRESENT_NO_GRANT";
  return "UNKNOWN";
}

async function probe(admin) {
  const { data, error } = await admin.rpc("apply_ledger_entry", {
    p_user_id: "00000000-0000-0000-0000-000000000001",
    p_amount: 0,
    p_reason: "adjustment",
    p_idempotency_key: "billing-rpc-probe",
  });
  if (!error) {
    return { fn: "apply_ledger_entry", status: "PRESENT", hint: typeof data };
  }
  return {
    fn: "apply_ledger_entry",
    status: classifyRpcError(error.message),
    hint: error.code ?? "no-code",
  };
}

async function probeDebit(admin) {
  const { error } = await admin.rpc("debit_generation_credits", {
    p_user_id: "00000000-0000-0000-0000-000000000001",
    p_mode: "generation",
    p_idempotency_key: "billing-rpc-probe-debit",
  });
  if (!error) return { fn: "debit_generation_credits", status: "PRESENT" };
  return {
    fn: "debit_generation_credits",
    status: classifyRpcError(error.message),
    hint: error.code ?? "no-code",
  };
}

async function probeGrant(admin) {
  const { error } = await admin.rpc("grant_credit_package", {
    p_user_id: "00000000-0000-0000-0000-000000000001",
    p_credits: 1,
    p_payment_id: "billing-rpc-probe",
    p_package_code: "basic",
  });
  if (!error) return { fn: "grant_credit_package", status: "PRESENT" };
  return {
    fn: "grant_credit_package",
    status: classifyRpcError(error.message),
    hint: error.code ?? "no-code",
  };
}

function readAccessToken(fileEnv) {
  const fromEnv = (
    fileEnv.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    ""
  ).trim();
  if (fromEnv) return fromEnv;
  const tokenPath = resolve(homedir(), ".supabase", "access-token");
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, "utf8").trim();
  }
  return "";
}

async function applyViaManagementApi(ref, token, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`management_api HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  return true;
}

async function main() {
  const fileEnv = loadEnvLocal();
  const url = fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const secret = fileEnv.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    console.error("FAIL missing supabase env");
    process.exit(1);
  }

  const ref = projectRefFromUrl(url);
  console.log("PROJECT", ref);
  console.log(
    "ENV_MP",
    envFlag(fileEnv, "MP_ACCESS_TOKEN") ||
      envFlag(fileEnv, "MERCADO_PAGO_ACCESS_TOKEN")
      ? "set"
      : "missing",
  );
  console.log(
    "ENV_OWNER",
    envFlag(fileEnv, "STUDIO_OWNER_EMAIL") ? "set" : "missing",
  );
  console.log(
    "ENV_DB_URL",
    envFlag(fileEnv, "DATABASE_URL") || envFlag(fileEnv, "SUPABASE_DB_URL")
      ? "set"
      : "missing",
  );

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const before = [
    await probe(admin),
    await probeDebit(admin),
    await probeGrant(admin),
  ];
  for (const row of before) {
    console.log("PROBE", row.fn, row.status, row.hint ?? "");
  }

  const apply = process.argv.includes("--apply");
  const missing = before.some((row) => row.status === "MISSING");
  if (!apply) {
    if (missing) {
      console.log("NEXT run: node scripts/billing-rpcs.mjs --apply");
      process.exitCode = 2;
    } else {
      console.log("RPCs_OK");
    }
    return;
  }

  const sqlPath = resolve(
    process.cwd(),
    "supabase/migrations/20260902180000_ensure_billing_ledger_rpcs.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");
  const token = readAccessToken(fileEnv);
  if (!token) {
    console.error("APPLY_FAIL no SUPABASE_ACCESS_TOKEN (CLI login or env)");
    process.exit(1);
  }
  console.log("APPLY via management API", ref);
  await applyViaManagementApi(ref, token, sql);
  console.log("APPLY_OK");

  const after = [
    await probe(admin),
    await probeDebit(admin),
    await probeGrant(admin),
  ];
  for (const row of after) {
    console.log("PROBE_AFTER", row.fn, row.status, row.hint ?? "");
  }
  if (after.some((row) => row.status === "MISSING")) {
    process.exitCode = 2;
  } else {
    console.log("RPCs_OK");
  }
}

main().catch((error) => {
  console.error("UNEXPECTED", error instanceof Error ? error.message : error);
  process.exit(1);
});
