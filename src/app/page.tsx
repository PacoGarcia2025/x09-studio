import { redirect } from "next/navigation";
import { StudioLanding } from "@/components/landing/StudioLanding";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/projects");

  const params = await searchParams;
  const authError = params.auth_error ?? null;

  return <StudioLanding authError={authError} />;
}
