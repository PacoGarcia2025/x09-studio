-- Fase 1: Blueprint Visual / Asset Intelligence
-- Criação das tabelas base para orquestração de assets
-- Mantendo a convenção de RLS e validação do X09 Studio

-- 1. VISUAL BRIEFS
create table if not exists public.visual_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  business text,
  niche text,
  audience text,
  objective text,
  visual_style text,
  brand_identity text,
  palette jsonb,
  typography jsonb,
  references_urls text[],
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visual_briefs_workspace_id_idx on public.visual_briefs (workspace_id);
create index if not exists visual_briefs_project_id_idx on public.visual_briefs (project_id);

create trigger visual_briefs_set_updated_at
  before update on public.visual_briefs
  for each row execute function public.set_assets_updated_at();

alter table public.visual_briefs enable row level security;

create policy "visual_briefs_select_own" on public.visual_briefs for select
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "visual_briefs_insert_own" on public.visual_briefs for insert
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "visual_briefs_update_own" on public.visual_briefs for update
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "visual_briefs_delete_own" on public.visual_briefs for delete
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- 2. ASSET REQUESTS
create table if not exists public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  visual_brief_id uuid references public.visual_briefs (id) on delete set null,
  purpose text not null,
  subject text,
  description text,
  composition text,
  orientation text,
  aspect_ratio text,
  style text,
  quality_requirements text,
  context_usage text,
  page_relation text,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'searching', 'fulfilled', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_requests_project_id_idx on public.asset_requests (project_id);

create trigger asset_requests_set_updated_at
  before update on public.asset_requests
  for each row execute function public.set_assets_updated_at();

alter table public.asset_requests enable row level security;

create policy "asset_requests_select_own" on public.asset_requests for select
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_requests_insert_own" on public.asset_requests for insert
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_requests_update_own" on public.asset_requests for update
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_requests_delete_own" on public.asset_requests for delete
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- 3. ASSET CANDIDATES
create table if not exists public.asset_candidates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  asset_request_id uuid not null references public.asset_requests (id) on delete cascade,
  final_asset_id uuid references public.assets (id) on delete set null,
  origin text not null
    check (origin in ('user_upload', 'external_source', 'ai_generated')),
  provider text,
  provider_asset_id text,
  source_url text,
  asset_url text, -- Nullable pois pode estar em processamento
  title text,
  description text,
  author text,
  license text,
  dimensions text,
  format text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'needs_review')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_candidates_request_id_idx on public.asset_candidates (asset_request_id);

create trigger asset_candidates_set_updated_at
  before update on public.asset_candidates
  for each row execute function public.set_assets_updated_at();

alter table public.asset_candidates enable row level security;

create policy "asset_candidates_select_own" on public.asset_candidates for select
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_candidates_insert_own" on public.asset_candidates for insert
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_candidates_update_own" on public.asset_candidates for update
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_candidates_delete_own" on public.asset_candidates for delete
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- 4. ASSET VALIDATIONS
create table if not exists public.asset_validations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  asset_candidate_id uuid not null references public.asset_candidates (id) on delete cascade,
  relevance_score numeric(3,2) check (relevance_score >= 0 and relevance_score <= 1),
  quality_score numeric(3,2) check (quality_score >= 0 and quality_score <= 1),
  composition_check boolean,
  visual_coherence boolean,
  purpose_adherence boolean,
  format_check boolean,
  safety_license_check boolean,
  final_result text not null
    check (final_result in ('approved', 'rejected', 'needs_review')),
  rejection_reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists asset_validations_candidate_id_idx on public.asset_validations (asset_candidate_id);

alter table public.asset_validations enable row level security;

create policy "asset_validations_select_own" on public.asset_validations for select
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_validations_insert_own" on public.asset_validations for insert
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_validations_update_own" on public.asset_validations for update
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "asset_validations_delete_own" on public.asset_validations for delete
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- Permissões básicas
grant select, insert, update, delete on table public.visual_briefs to authenticated, service_role;
grant select, insert, update, delete on table public.asset_requests to authenticated, service_role;
grant select, insert, update, delete on table public.asset_candidates to authenticated, service_role;
grant select, insert, update, delete on table public.asset_validations to authenticated, service_role;
