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

function fail(message, ...extra) {
  console.error(message, ...extra);
  process.exitCode = 1;
  throw new Error(String(message));
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishable =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishable || !secret) {
  fail("FAIL missing supabase env");
}

let urlHost;
try {
  urlHost = new URL(url).host;
} catch {
  fail("FAIL NEXT_PUBLIC_SUPABASE_URL inválida:", url);
}

console.log("CHECK_URL", urlHost);

async function checkAuthHealth() {
  const base = url.replace(/\/$/, "");
  try {
    const probe = await fetch(`${base}/auth/v1/health`, {
      headers: { apikey: publishable },
    });
    if (probe.ok) {
      console.log("AUTH_HEALTH_OK");
      return;
    }
    if (probe.status === 401 || probe.status === 403) {
      fail(
        "FAIL auth health HTTP",
        probe.status,
        urlHost,
        "— confira se publishable/secret são do MESMO projeto Supabase.",
      );
    }
    fail("FAIL auth health HTTP", probe.status, urlHost);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("FAIL ")) throw e;
    fail(
      "FAIL cannot reach Supabase at",
      urlHost,
      "— confira o project ref em supabase.com/dashboard e se o projeto não está pausado.",
      msg,
    );
  }
}

if (!publishable.startsWith("sb_publishable_")) {
  fail("FAIL publishable key must start with sb_publishable_");
}
if (!secret.startsWith("sb_secret_")) {
  fail("FAIL secret key must start with sb_secret_");
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
  await checkAuthHealth();

  const adminProbe = await admin.from("projects").select("id").limit(1);
  if (adminProbe.error) {
    fail("ADMIN_PROBE", adminProbe.error.message, adminProbe.error.code);
  }
  console.log("ADMIN_PROBE_OK");

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Validador Studio" },
  });
  if (created.error) {
    fail("SIGNUP_FAIL", created.error.message);
  }
  console.log("SIGNUP_OK");

  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    fail("LOGIN_FAIL", signIn.error.message);
  }
  console.log("LOGIN_OK");

  let ws = await client
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ws.error) {
    fail("WORKSPACE_SELECT_FAIL", ws.error.message);
  }

  if (!ws.data) {
    const createdWs = await client
      .from("workspaces")
      .insert({ owner_id: signIn.data.user.id, name: "Meu workspace" })
      .select("id")
      .single();
    if (createdWs.error) {
      fail("WORKSPACE_CREATE_FAIL", createdWs.error.message);
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
    fail("PROJECT_CREATE_FAIL", project.error.message, project.error.code);
  }
  console.log("PROJECT_OK", project.data.slug);

  const list = await client
    .from("projects")
    .select("id")
    .eq("id", project.data.id);
  if (list.error || !list.data?.length) {
    fail("PROJECT_LIST_FAIL", list.error?.message);
  }
  console.log("PROJECT_LIST_OK");

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
  if (!process.exitCode) {
    console.error("UNEXPECTED", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
});
