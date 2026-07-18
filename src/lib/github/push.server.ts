import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/http/errors";
import { requireOwnedVisualProject } from "@/lib/ownership/visual-project";
import {
  filterFilesForPush,
  normalizeRepoPath,
} from "@/lib/github/secrets-filter";
import {
  getInstallationToken,
  ghFetch,
  listUserInstallations,
} from "@/lib/github/app.server";

type GhBlob = { sha: string; url: string };
type GhRef = { object: { sha: string } };
type GhCommit = { sha: string; tree: { sha: string } };
type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  owner: { login: string };
};

function slugifyRepoName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "x09-project"
  );
}

export async function createOrLinkRepository(input: {
  userId: string;
  projectId: string;
  repoName?: string;
  private?: boolean;
}) {
  const project = await requireOwnedVisualProject(input.projectId, input.userId);
  const installations = await listUserInstallations(input.userId);
  if (installations.length === 0) {
    throw new PublicError(
      "Instale o GitHub App antes de criar o repositório.",
      400,
      "github_not_installed",
    );
  }

  const installation = installations[0]!;
  const token = await getInstallationToken(Number(installation.installation_id));
  const owner = installation.account_login as string;
  const name = slugifyRepoName(input.repoName || project.name);
  const isOrg = installation.account_type === "Organization";

  let repo: GhRepo;
  try {
    repo = await ghFetch<GhRepo>(
      isOrg ? `/orgs/${owner}/repos` : `/user/repos`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          private: input.private ?? true,
          auto_init: true,
          description: `Projeto X09 Studio — ${project.name}`,
        }),
      },
    );
  } catch {
    // Pode já existir — tenta ler
    repo = await ghFetch<GhRepo>(`/repos/${owner}/${name}`, token);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("github_repositories")
    .upsert(
      {
        project_id: input.projectId,
        user_id: input.userId,
        installation_id: Number(installation.installation_id),
        github_repo_id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        default_branch: repo.default_branch || "main",
        html_url: repo.html_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    )
    .select("*")
    .single();

  if (error) throw new PublicError("Falha ao vincular repositório.", 500);

  await admin
    .from("visual_projects")
    .update({
      github_repo_full_name: repo.full_name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.projectId)
    .eq("user_id", input.userId);

  return data;
}

export async function pushProjectToGitHub(input: {
  userId: string;
  projectId: string;
  message?: string;
}) {
  const project = await requireOwnedVisualProject(input.projectId, input.userId);
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("github_repositories")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!link) {
    throw new PublicError(
      "Crie ou vincule um repositório GitHub primeiro.",
      400,
      "github_repo_missing",
    );
  }

  if (!link.installation_id) {
    throw new PublicError("Instalação GitHub ausente.", 400);
  }

  const token = await getInstallationToken(Number(link.installation_id));
  const files = filterFilesForPush(
    (project.files as Record<string, string>) ?? {},
  );

  // Garantir README mínimo
  if (!files["README.md"]) {
    files["README.md"] = `# ${project.name}\n\nGerado pelo X09 Studio.\n`;
  }

  const owner = link.owner as string;
  const repo = link.name as string;
  const branch = (link.default_branch as string) || "main";

  let baseCommitSha: string | null = null;
  let baseTreeSha: string | null = null;
  try {
    const ref = await ghFetch<GhRef>(
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      token,
    );
    baseCommitSha = ref.object.sha;
    const commit = await ghFetch<GhCommit>(
      `/repos/${owner}/${repo}/git/commits/${baseCommitSha}`,
      token,
    );
    baseTreeSha = commit.tree.sha;
  } catch {
    // repo vazio
  }

  const treeItems: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }> = [];

  for (const [path, content] of Object.entries(files)) {
    const blob = await ghFetch<GhBlob>(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: "POST",
      body: JSON.stringify({
        content: Buffer.from(content, "utf8").toString("base64"),
        encoding: "base64",
      }),
    });
    treeItems.push({
      path: normalizeRepoPath(path),
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const tree = await ghFetch<{ sha: string }>(
    `/repos/${owner}/${repo}/git/trees`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha ?? undefined,
        tree: treeItems,
      }),
    },
  );

  const commit = await ghFetch<{ sha: string }>(
    `/repos/${owner}/${repo}/git/commits`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        message: input.message || `Sync from X09 Studio — ${project.name}`,
        tree: tree.sha,
        parents: baseCommitSha ? [baseCommitSha] : [],
      }),
    },
  );

  if (baseCommitSha) {
    await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } else {
    await ghFetch(`/repos/${owner}/${repo}/git/refs`, token, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: commit.sha,
      }),
    });
  }

  const { data: updated } = await admin
    .from("github_repositories")
    .update({
      last_commit_sha: commit.sha,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id)
    .select("*")
    .single();

  return {
    commitSha: commit.sha,
    fullName: link.full_name,
    htmlUrl: link.html_url,
    repository: updated,
    filesPushed: Object.keys(files).length,
  };
}
