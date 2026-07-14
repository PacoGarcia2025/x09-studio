-- Grants padrão Supabase para roles da API (publishable/secret + auth JWT)

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.profiles to anon, authenticated, service_role;
grant all on table public.workspaces to anon, authenticated, service_role;
grant all on table public.projects to anon, authenticated, service_role;

grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
