import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/http/errors";
import { requireOwnedVisualProject } from "@/lib/ownership/visual-project";
import { packVisualProjectForVercel } from "@/lib/deploy/pack.server";

const VERCEL_API = "https://api.vercel.com";

function vercelToken(): string {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) throw new PublicError("Vercel não configurado.", 503);
  return token;
}

function projectNamePrefix(): string {
  return process.env.VERCEL_PROJECT_NAME_PREFIX?.trim() || "x09";
}

function slugProject(name: string, projectId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const short = projectId.replace(/-/g, "").slice(0, 8);
  return `${projectNamePrefix()}-${base || "app"}-${short}`.slice(0, 90);
}

async function vercelApi<T>(path: string, init?: RequestInit): Promise<T> {
  const team = process.env.VERCEL_TEAM_ID?.trim();
  const qs = team
    ? `${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`
    : "";
  const res = await fetch(`${VERCEL_API}${path}${qs}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${vercelToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PublicError(
      `Vercel API ${res.status}: ${text.slice(0, 240) || res.statusText}`,
      502,
    );
  }
  return (await res.json()) as T;
}

export function verifyVercelWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.VERCEL_WEBHOOK_SECRET?.trim();
  if (!secret) return process.env.VERCEL_WEBHOOK_SKIP_VERIFY === "1";
  if (!signature) return false;
  const expected = createHmac("sha1", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function startVercelDeploy(input: {
  userId: string;
  projectId: string;
}) {
  const project = await requireOwnedVisualProject(input.projectId, input.userId);
  let files;
  try {
    files = packVisualProjectForVercel({
      name: project.name,
      files: project.files,
    });
  } catch (error) {
    throw new PublicError(
      error instanceof Error ? error.message : "Falha ao empacotar projeto.",
      400,
    );
  }

  const name = slugProject(project.name, project.id);
  const admin = createAdminClient();

  const { data: deploymentRow, error: insertError } = await admin
    .from("project_deployments")
    .insert({
      project_id: project.id,
      user_id: input.userId,
      provider: "vercel",
      status: "queued",
    })
    .select("*")
    .single();

  if (insertError || !deploymentRow) {
    throw new PublicError("Falha ao registrar deployment.", 500);
  }

  await admin
    .from("visual_projects")
    .update({
      publish_status: "queued",
      last_deploy_id: deploymentRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", project.id);

  try {
    const deployment = await vercelApi<{
      id: string;
      url?: string;
      inspectorUrl?: string;
      projectId?: string;
      readyState?: string;
    }>("/v13/deployments", {
      method: "POST",
      body: JSON.stringify({
        name,
        files: files.map((f) => ({
          file: f.file,
          data: f.data,
          encoding: f.encoding,
        })),
        projectSettings: {
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
        },
        target: "production",
      }),
    });

    const status =
      deployment.readyState === "READY"
        ? "ready"
        : deployment.readyState === "ERROR"
          ? "error"
          : "building";

    const url = deployment.url ? `https://${deployment.url}` : null;

    const { data: updated } = await admin
      .from("project_deployments")
      .update({
        vercel_deployment_id: deployment.id,
        vercel_project_id: deployment.projectId ?? null,
        status,
        url,
        inspector_url: deployment.inspectorUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deploymentRow.id)
      .select("*")
      .single();

    await admin
      .from("visual_projects")
      .update({
        publish_status: status,
        published_url: status === "ready" ? url : project.published_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    return updated;
  } catch (error) {
    await admin
      .from("project_deployments")
      .update({
        status: "error",
        error_message:
          error instanceof Error ? error.message.slice(0, 500) : "deploy_error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deploymentRow.id);

    await admin
      .from("visual_projects")
      .update({
        publish_status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    throw error;
  }
}

export async function syncDeploymentStatus(input: {
  userId: string;
  projectId: string;
  deploymentId: string;
}) {
  await requireOwnedVisualProject(input.projectId, input.userId);
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("project_deployments")
    .select("*")
    .eq("id", input.deploymentId)
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!row) throw new PublicError("Deployment não encontrado.", 404);
  if (!row.vercel_deployment_id) return row;

  const remote = await vercelApi<{
    id: string;
    url?: string;
    inspectorUrl?: string;
    readyState?: string;
    errorMessage?: string;
  }>(`/v13/deployments/${row.vercel_deployment_id}`);

  const status =
    remote.readyState === "READY"
      ? "ready"
      : remote.readyState === "ERROR"
        ? "error"
        : remote.readyState === "CANCELED"
          ? "canceled"
          : remote.readyState === "QUEUED"
            ? "queued"
            : "building";

  const url = remote.url ? `https://${remote.url}` : row.url;

  const { data: updated } = await admin
    .from("project_deployments")
    .update({
      status,
      url,
      inspector_url: remote.inspectorUrl ?? row.inspector_url,
      error_message: remote.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single();

  const projectUpdate: Record<string, unknown> = {
    publish_status: status,
    updated_at: new Date().toISOString(),
  };
  if (status === "ready" && url) projectUpdate.published_url = url;

  await admin
    .from("visual_projects")
    .update(projectUpdate)
    .eq("id", input.projectId);

  return updated;
}

export async function applyVercelWebhook(payload: {
  type?: string;
  payload?: {
    deployment?: {
      id?: string;
      url?: string;
      readyState?: string;
    };
    deploymentId?: string;
    url?: string;
  };
}) {
  const deploymentId =
    payload.payload?.deployment?.id || payload.payload?.deploymentId;
  if (!deploymentId) return { ok: false, reason: "no_deployment" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("project_deployments")
    .select("*")
    .eq("vercel_deployment_id", deploymentId)
    .maybeSingle();

  if (!row) return { ok: false, reason: "unknown_deployment" };

  const readyState = payload.payload?.deployment?.readyState;
  const status =
    readyState === "READY"
      ? "ready"
      : readyState === "ERROR"
        ? "error"
        : readyState === "CANCELED"
          ? "canceled"
          : "building";

  const urlRaw = payload.payload?.deployment?.url || payload.payload?.url;
  const url = urlRaw
    ? urlRaw.startsWith("http")
      ? urlRaw
      : `https://${urlRaw}`
    : row.url;

  await admin
    .from("project_deployments")
    .update({
      status,
      url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  const projectUpdate: Record<string, unknown> = {
    publish_status: status,
    updated_at: new Date().toISOString(),
  };
  if (status === "ready" && url) projectUpdate.published_url = url;

  await admin
    .from("visual_projects")
    .update(projectUpdate)
    .eq("id", row.project_id);

  return { ok: true, status };
}
