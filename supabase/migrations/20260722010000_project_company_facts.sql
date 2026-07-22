-- Dados estruturados da empresa por projeto (configurações)
alter table public.projects
  add column if not exists company_facts jsonb not null default '{}'::jsonb;

comment on column public.projects.company_facts is
  'Nome, contatos, órgão fiscalizador opcional, história, cidades — injetado no brief do builder';
