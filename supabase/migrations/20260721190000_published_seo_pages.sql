-- SEO dinâmico por subdomínio (Cloudflare Worker + Next generateMetadata)
-- Zero custo — leitura pública apenas para sites publicados

create table if not exists public.published_seo_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_slug text not null,
  path text not null,
  title text not null,
  description text not null,
  og_image text,
  price_brl numeric,
  json_ld jsonb,
  updated_at timestamptz not null default now(),
  constraint published_seo_pages_slug_path_unique unique (project_slug, path)
);

create index if not exists published_seo_pages_slug_idx
  on public.published_seo_pages (project_slug);

alter table public.published_seo_pages enable row level security;

-- Leitura pública: só slugs de projetos publicados/ready
create policy "published_seo_public_read"
  on public.published_seo_pages for select
  using (
    exists (
      select 1 from public.projects p
      where p.slug = project_slug
        and p.status in ('published', 'ready')
    )
  );

-- Studio escreve via service role (publish pipeline)
create policy "published_seo_service_write"
  on public.published_seo_pages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant select on public.published_seo_pages to anon, authenticated;
