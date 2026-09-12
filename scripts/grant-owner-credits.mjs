/**
 * Grants credits + marks profiles.role=owner for STUDIO_OWNER_EMAIL.
 * If that env is empty, uses the confirmed account with most spent credits
 * and writes the email into .env.local. Never prints emails or keys.
 *
 *   node scripts/grant-owner-credits.mjs
 *   node scripts/grant-owner-credits.mjs --credits 500
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "fs";
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
    env[trimmed.slice(0, i).trim()] = value;
  }
  return env;
}

function argCredits(fallback) {
  const i = process.argv.indexOf("--credits");
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (!Number.isInteger(n) || n <= 0) throw new Error("credits inválido");
    return n;
  }
  return fallback;
}

async function findUserByEmail(admin, email) {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === normalized,
    );
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function mostActiveUser(admin) {
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (usersError) throw usersError;
  const { data: wallets, error: walletError } = await admin
    .from("credit_wallets")
    .select("user_id, lifetime_spent, updated_at")
    .order("lifetime_spent", { ascending: false });
  if (walletError) throw walletError;
  const confirmed = new Set(
    (users.users ?? [])
      .filter((u) => u.email_confirmed_at && u.email)
      .map((u) => u.id),
  );
  const top = (wallets ?? []).find((w) => confirmed.has(w.user_id));
  if (!top) return null;
  return (users.users ?? []).find((u) => u.id === top.user_id) ?? null;
}

function writeOwnerEmail(email) {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  if (!/^STUDIO_OWNER_EMAIL=/m.test(raw)) {
    const next = raw.endsWith("\n")
      ? `${raw}STUDIO_OWNER_EMAIL=${email}\n`
      : `${raw}\nSTUDIO_OWNER_EMAIL=${email}\n`;
    writeFileSync(path, next);
    return;
  }
  writeFileSync(
    path,
    raw.replace(/^STUDIO_OWNER_EMAIL=.*$/m, `STUDIO_OWNER_EMAIL=${email}`),
  );
}

async function main() {
  const fileEnv = loadEnvLocal();
  const url = fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    fileEnv.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  let email = (fileEnv.STUDIO_OWNER_EMAIL || "").trim().toLowerCase();
  const credits = argCredits(500);
  if (!url || !secret) throw new Error("missing supabase env");

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user = email ? await findUserByEmail(admin, email) : null;
  if (!user) {
    user = await mostActiveUser(admin);
    email = user?.email?.trim().toLowerCase() ?? "";
    if (email) {
      writeOwnerEmail(email);
      console.log("OWNER_EMAIL_FILLED", "env.local");
    }
  }
  if (!user || !email) {
    console.error("USER_NOT_FOUND");
    process.exit(1);
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata ?? {}), role: "owner" },
    user_metadata: { ...(user.user_metadata ?? {}), role: "owner" },
  });
  if (metaError) throw metaError;

  const { error: profileError } = await admin.from("profiles").upsert(
    { id: user.id, role: "owner" },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { data, error } = await admin.rpc("apply_ledger_entry", {
    p_user_id: user.id,
    p_amount: credits,
    p_reason: "adjustment",
    p_idempotency_key: `manual-owner-grant-${credits}-${Date.now()}`,
    p_ref_type: "ops",
    p_ref_id: "grant-owner-credits",
    p_meta: { source: "grant-owner-credits.mjs" },
  });
  if (error) throw error;

  const result = data && typeof data === "object" ? data : {};
  console.log("OWNER_ROLE", "ok");
  console.log("GRANT_OK", result.ok === true);
  console.log("DUPLICATE", result.duplicate === true);
  console.log("AMOUNT", result.amount ?? credits);
  console.log("BALANCE", result.balance ?? "?");
}

main().catch((error) => {
  console.error("FAIL", error instanceof Error ? error.message : error);
  process.exit(1);
});
