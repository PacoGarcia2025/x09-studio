-- Prompt inicial do projeto (fluxo Lovable: dashboard → editor sem briefing)
alter table public.projects
  add column if not exists brief_prompt text;

comment on column public.projects.brief_prompt is
  'Prompt original do usuário ao criar o projeto na dashboard.';
