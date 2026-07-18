export const dynamic = "force-dynamic";

/** Health check sem custo — só verifica presença de envs (não chama APIs externas). */
export async function GET() {
  const checks = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    ),
    githubApp: Boolean(
      process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY,
    ),
    mercadoPago: Boolean(process.env.MP_ACCESS_TOKEN),
    vercel: Boolean(process.env.VERCEL_TOKEN),
    llm: Boolean(
      process.env.OPENROUTER_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY,
    ),
  };

  const ok = Object.values(checks).every(Boolean);
  return Response.json({
    ok,
    checks,
    timestamp: new Date().toISOString(),
  });
}
