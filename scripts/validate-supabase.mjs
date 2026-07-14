/**
 * Valida admin probe → signup/login → create project.
 * Lê .env.local (não imprime secrets).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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
    env[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishable =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishable || !secret) {
  console.error("FAIL missing supabase env");
  process.exit(1);
}
if (!publishable.startsWith("sb_publishable_")) {
  console.error("FAIL publishable key must start with sb_publishable_");
  process.exit(1);
}
if (!secret.startsWith("sb_secret_")) {
  console.error("FAIL secret key must start with sb_secret_");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const client = createClient(url, publishable, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `studio.validate.${Date.now()}@gmail.com`;
const password = "TestStudio123!";

async function main() {
  const adminProbe = await admin.from("projects").select("id").limit(1);
  if (adminProbe.error) {
    console.error("ADMIN_PROBE", adminProbe.error.message, adminProbe.error.code);
    process.exit(1);
  }
  console.log("ADMIN_PROBE_OK");

  // Cria usuário confirmado (Auth Admin API + secret key)
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Validador Studio" },
  });
  if (created.error) {
    console.error("SIGNUP_FAIL", created.error.message);
    process.exit(1);
  }
  console.log("SIGNUP_OK");

  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    console.error("LOGIN_FAIL", signIn.error.message);
    process.exit(1);
  }
  console.log("LOGIN_OK");

  let ws = await client
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ws.error) {
    console.error("WORKSPACE_SELECT_FAIL", ws.error.message);
    process.exit(1);
  }

  if (!ws.data) {
    const createdWs = await client
      .from("workspaces")
      .insert({ owner_id: signIn.data.user.id, name: "Meu workspace" })
      .select("id")
      .single();
    if (createdWs.error) {
      console.error("WORKSPACE_CREATE_FAIL", createdWs.error.message);
      process.exit(1);
    }
    ws = createdWs;
    console.log("WORKSPACE_CREATED");
  } else {
    console.log("WORKSPACE_OK");
  }

  const slug = `proj-${Date.now().toString(36)}`;
  const project = await client
    .from("projects")
    .insert({
      workspace_id: ws.data.id,
      name: "Projeto Validacao",
      slug,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (project.error) {
    console.error(
      "PROJECT_CREATE_FAIL",
      project.error.message,
      project.error.code,
    );
    process.exit(1);
  }
  console.log("PROJECT_OK", project.data.slug);

  const list = await client
    .from("projects")
    .select("id")
    .eq("id", project.data.id);
  if (list.error || !list.data?.length) {
    console.error("PROJECT_LIST_FAIL", list.error?.message);
    process.exit(1);
  }
  console.log("PROJECT_LIST_OK");

  // Também valida signUp público (publishable), se a política de e-mail permitir
  const publicEmail = `studio.public.${Date.now()}@gmail.com`;
  const publicSignUp = await client.auth.signUp({
    email: publicEmail,
    password,
    options: { data: { full_name: "Signup Publico" } },
  });
  if (publicSignUp.error) {
    console.log("PUBLIC_SIGNUP_WARN", publicSignUp.error.message);
  } else {
    console.log("PUBLIC_SIGNUP_OK");
  }

  console.log("ALL_OK");
}

main().catch((e) => {
  console.error("UNEXPECTED", e instanceof Error ? e.message : e);
  process.exit(1);
});
