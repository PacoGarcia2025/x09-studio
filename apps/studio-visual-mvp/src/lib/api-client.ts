import { supabase } from "@/lib/supabase";

function apiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined;
  if (env && env.trim()) return env.replace(/\/$/, "");
  return "";
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError("Faça login para continuar.", 401);
  }

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text };
  }

  if (!response.ok) {
    const err = body as { error?: string; code?: string } | null;
    throw new ApiClientError(
      err?.error || `Erro na API (${response.status})`,
      response.status,
      err?.code,
    );
  }

  return body as T;
}

export type BillingSnapshot = {
  wallet: {
    balance: number;
    lifetime_granted: number;
    lifetime_spent: number;
    updated_at: string | null;
  };
  subscription: {
    id: string;
    plan_code: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  plans: Array<{
    code: string;
    name: string;
    monthly_credits: number;
    amount_cents: number;
    currency: string;
  }>;
  costs: { generation: number; edit: number };
};

export async function fetchBillingMe(): Promise<BillingSnapshot> {
  return apiFetch("/api/billing/me");
}

export async function startCheckout(planCode: "basic" | "pro") {
  return apiFetch<{ initPoint: string; checkoutId: string }>(
    "/api/billing/checkout",
    {
      method: "POST",
      body: JSON.stringify({
        planCode,
        backUrl: window.location.origin + "/",
      }),
    },
  );
}

export async function cancelSubscription() {
  return apiFetch<{ ok: boolean }>("/api/billing/cancel", { method: "POST" });
}

export async function fetchGitHubStatus() {
  return apiFetch<{
    connected: boolean;
    installations: Array<{
      installation_id: number;
      account_login: string;
      account_type: string;
      suspended_at: string | null;
    }>;
  }>("/api/github/install");
}

export async function startGitHubInstall() {
  return apiFetch<{ url: string }>("/api/github/install?redirect=1");
}

export async function fetchProjectRepo(projectId: string) {
  return apiFetch<{ repository: Record<string, unknown> | null }>(
    `/api/projects/${projectId}/github/repository`,
  );
}

export async function createProjectRepo(
  projectId: string,
  repoName?: string,
) {
  return apiFetch<{ repository: Record<string, unknown> }>(
    `/api/projects/${projectId}/github/repository`,
    {
      method: "POST",
      body: JSON.stringify({ repoName, private: true }),
    },
  );
}

export async function pushProjectRepo(projectId: string, message?: string) {
  return apiFetch<{
    commitSha: string;
    fullName: string;
    htmlUrl: string;
    filesPushed: number;
  }>(`/api/projects/${projectId}/github/push`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function startDeploy(projectId: string) {
  return apiFetch<{ deployment: Record<string, unknown> }>(
    `/api/projects/${projectId}/deploy`,
    { method: "POST" },
  );
}

export async function fetchDeployStatus(
  projectId: string,
  deploymentId: string,
) {
  return apiFetch<{ deployment: Record<string, unknown> }>(
    `/api/projects/${projectId}/deploy/${deploymentId}`,
  );
}

export async function fetchProjectDeploys(projectId: string) {
  return apiFetch<{
    publishedUrl: string | null;
    publishStatus: string | null;
    lastDeployId: string | null;
    deployments: Array<Record<string, unknown>>;
  }>(`/api/projects/${projectId}/deploy`);
}
