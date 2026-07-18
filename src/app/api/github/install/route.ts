import { AuthError, requireUserFromRequest } from "@/lib/agent/auth";
import {
  createInstallState,
  githubInstallUrl,
  listUserInstallations,
} from "@/lib/github/app.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["GET", "OPTIONS"]);
}

export async function GET(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    const url = new URL(request.url);
    const redirect = url.searchParams.get("redirect") === "1";

    const installations = await listUserInstallations(user.id);
    if (!redirect) {
      return Response.json(
        { installations, connected: installations.length > 0 },
        { headers: corsHeaders(request, ["GET", "OPTIONS"]) },
      );
    }

    const state = await createInstallState(user.id);
    const installUrl = githubInstallUrl(state);
    return Response.json(
      { url: installUrl },
      { headers: corsHeaders(request, ["GET", "OPTIONS"]) },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha GitHub install.", corsHeaders(request));
  }
}
