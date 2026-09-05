import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assetsRootConfigured } from "@/lib/assets/paths";
import { getAssetStorage } from "@/lib/storage/registry";
import { profileAvatarRelative } from "@/lib/profile/avatar";
import { isProfileAvatarExt } from "@/lib/profile/types";
import { isMissingRelationError } from "@/lib/assets/schema";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Não autenticado", { status: 401 });
  }
  if (!assetsRootConfigured()) {
    return new NextResponse("Sem armazenamento", { status: 404 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_ext")
    .eq("id", user.id)
    .maybeSingle();

  if (error && isMissingRelationError(error)) {
    return new NextResponse("Sem foto", { status: 404 });
  }
  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const ext = data?.avatar_ext;
  if (!isProfileAvatarExt(ext)) {
    return new NextResponse("Sem foto", { status: 404 });
  }

  try {
    const bytes = await getAssetStorage().readFile(
      profileAvatarRelative(user.id, ext),
    );
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": MIME[ext],
        "Cache-Control": "private, max-age=120",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Sem foto", { status: 404 });
  }
}
