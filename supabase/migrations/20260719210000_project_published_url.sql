-- URL pública e status de publish nos projetos clássicos (disk)
alter table public.projects
  add column if not exists published_url text;

alter table public.projects
  add column if not exists publish_status text;

comment on column public.projects.published_url is
  'URL pública do app (ex: https://studio.x09.com.br/sites/{slug}).';

comment on column public.projects.publish_status is
  'queued | building | ready | error | unpublished';
