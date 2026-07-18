import {
  consumeInstallState,
  createGitHubAppJwt,
  ghFetch,
  upsertInstallation,
} from "@/lib/github/app.server";

export const dynamic = "force-dynamic";

type InstallationResponse = {
  id: number;
  account: {
    login: string;
    id: number;
    type: "User" | "Organization";
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const state = url.searchParams.get("state");
  const setupAction = url.searchParams.get("setup_action");

  const mvp =
    process.env.NEXT_PUBLIC_VISUAL_MVP_URL?.trim() ||
    process.env.VISUAL_MVP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://studio.x09.com.br";

  if (!installationId || !state) {
    return Response.redirect(
      `${mvp}/?github=error&reason=missing_params`,
      302,
    );
  }

  const userId = await consumeInstallState(state);
  if (!userId) {
    return Response.redirect(
      `${mvp}/?github=error&reason=invalid_state`,
      302,
    );
  }

  try {
    const jwt = await createGitHubAppJwt();
    const installation = await ghFetch<InstallationResponse>(
      `/app/installations/${installationId}`,
      jwt,
    );

    await upsertInstallation({
      userId,
      installationId: Number(installationId),
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      accountId: installation.account.id,
    });

    return Response.redirect(
      `${mvp}/?github=connected&action=${setupAction || "install"}`,
      302,
    );
  } catch {
    return Response.redirect(`${mvp}/?github=error&reason=link_failed`, 302);
  }
}
