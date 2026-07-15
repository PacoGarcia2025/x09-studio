-- Builder resiliente: permite retry automático sem falhar a task imediatamente

alter table public.plan_tasks drop constraint if exists plan_tasks_status_check;
alter table public.plan_tasks
  add constraint plan_tasks_status_check
  check (status in ('queued', 'running', 'retrying', 'done', 'failed', 'skipped'));
