import { createClient, type User } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const OWNER_WORKSPACE_NAME = "X09 Studio";
const OWNER_FULL_NAME = "X09 Studio Owner";

function loadEnvFile(file: string) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const i = trimmed.indexOf("=");
    if (i === -1) continue;

    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function loadEnv() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getSupabaseSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  ).trim();
}

async function findUserByEmail(email: string): Promise<User | null> {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const secret = getSupabaseSecretKey();
  if (!secret) {
    throw new Error("Missing env: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === normalized,
    );
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  loadEnv();

  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const secret = getSupabaseSecretKey();
  if (!secret) {
    throw new Error("Missing env: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }

  const email = required("STUDIO_OWNER_EMAIL").toLowerCase();
  const password = required("STUDIO_OWNER_PASSWORD");

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: OWNER_FULL_NAME,
        role: "owner",
      },
      app_metadata: {
        role: "owner",
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Supabase Auth did not return user");
    user = data.user;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      app_metadata: {
        ...(user.app_metadata ?? {}),
        role: "owner",
      },
      user_metadata: {
        ...(user.user_metadata ?? {}),
        full_name: user.user_metadata?.full_name ?? OWNER_FULL_NAME,
        role: "owner",
      },
    });
    if (error) throw error;
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? OWNER_FULL_NAME,
      role: "owner",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const existingNamed = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", OWNER_WORKSPACE_NAME)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingNamed.error) throw existingNamed.error;

  if (!existingNamed.data) {
    const existingAny = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingAny.error) throw existingAny.error;

    if (existingAny.data) {
      const { error } = await admin
        .from("workspaces")
        .update({ name: OWNER_WORKSPACE_NAME })
        .eq("id", existingAny.data.id)
        .eq("owner_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("workspaces").insert({
        owner_id: user.id,
        name: OWNER_WORKSPACE_NAME,
      });
      if (error) throw error;
    }
  }

  console.log("OWNER CREATED");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
