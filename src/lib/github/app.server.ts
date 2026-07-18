import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/http/errors";
import { verifyGitHubWebhookSignature as verifySignature } from "@/lib/github/webhook-signature";

const GH_API = "https://api.github.com";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new PublicError(`${name} não configurado.`, 503);
  return value;
}

function appPrivateKey(): string {
  const raw = requireEnv("GITHUB_APP_PRIVATE_KEY");
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export async function createGitHubAppJwt(): Promise<string> {
  const appId = requireEnv("GITHUB_APP_ID");
  const key = await importPKCS8(appPrivateKey(), "RS256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(key);
}

export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  const jwt = await createGitHubAppJwt();
  const res = await fetch(
    `${GH_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    throw new PublicError("Falha ao obter token da instalação GitHub.", 502);
  }
  const json = (await res.json()) as { token: string };
  return json.token;
}

export function verifyGitHubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  return verifySignature(rawBody, signatureHeader);
}

export async function createInstallState(userId: string): Promise<string> {
  const state = randomBytes(24).toString("hex");
  const stateHash = createHash("sha256").update(state).digest("hex");
  const admin = createAdminClient();
  const expires = new Date(Date.now() + 15 * 60_000).toISOString();
  const { error } = await admin.from("github_oauth_states").insert({
    user_id: userId,
    state_hash: stateHash,
    expires_at: expires,
  });
  if (error) throw new PublicError("Falha ao criar state OAuth.", 500);
  return state;
}

export async function consumeInstallState(
  state: string,
): Promise<string | null> {
  const stateHash = createHash("sha256").update(state).digest("hex");
  const admin = createAdminClient();
  const { data } = await admin
    .from("github_oauth_states")
    .select("id, user_id, expires_at, consumed_at")
    .eq("state_hash", stateHash)
    .maybeSingle();

  if (!data || data.consumed_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  await admin
    .from("github_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.user_id as string;
}

export function githubAppSlug(): string {
  return process.env.GITHUB_APP_SLUG?.trim() || "x09-studio";
}

export function githubInstallUrl(state: string): string {
  const slug = githubAppSlug();
  return `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`;
}

export async function ghFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PublicError(
      `GitHub API ${res.status}: ${text.slice(0, 200) || res.statusText}`,
      502,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function upsertInstallation(input: {
  userId: string;
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  accountId?: number;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("github_installations").upsert(
    {
      user_id: input.userId,
      installation_id: input.installationId,
      account_login: input.accountLogin,
      account_type: input.accountType,
      account_id: input.accountId ?? null,
      suspended_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "installation_id" },
  );
  if (error) throw new PublicError("Falha ao vincular instalação GitHub.", 500);
}

export async function listUserInstallations(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("github_installations")
    .select(
      "installation_id, account_login, account_type, suspended_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}
