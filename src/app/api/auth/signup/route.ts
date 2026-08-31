import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/paths";
import {
  authConnectivityMessage,
  createRouteHandlerClient,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";

type SignupBody = {
  email?: string;
  password?: string;
  fullName?: string;
  next?: string;
};

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Corpo inv válido" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const fullName = body.fullName?.trim();
  const next = sanitizeNextPath(body.next);

  if (!email || !password) {
    return NextResponse.json(
      { error: "E-mail e senha são obrigatórios" },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const supabase = await createRouteHandlerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || undefined },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      needsEmailConfirmation: !data.session,
    });
  } catch (cause) {
    return NextResponse.json(
      { error: authConnectivityMessage(cause) },
      { status: 503 },
    );
  }
}
