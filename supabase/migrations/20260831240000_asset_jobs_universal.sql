-- Fila universal + origens de asset + storage desacoplado (só schema).
-- Não aplicar automaticamente. Sem campos de GLB e sem regras de IA.

alter table public.assets
  drop constraint if exists assets_source_check;

alter table public.assets
  add constraint assets_source_check
  check (source in (
    'upload', 'generated', 'imported', 'builder',
    'marketplace', 'template', 'plugin'
  ));

alter table public.asset_jobs
  add column if not exists operation text not null default 'ingest';

alter table public.asset_jobs
  drop constraint if exists asset_jobs_operation_check;

alter table public.asset_jobs
  add constraint asset_jobs_operation_check
  check (operation in (
    'ingest', 'generate', 'optimize', 'convert', 'compress',
    'thumbnail', 'preview', 'transcode', 'import', 'export'
  ));

create index if not exists asset_jobs_operation_status_idx
  on public.asset_jobs (status, operation, created_at);
