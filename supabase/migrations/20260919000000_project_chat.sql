
CREATE TABLE public.project_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system', 'plan', 'building')),
  content TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX project_chat_messages_project_id_idx ON public.project_chat_messages (project_id);

ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_chat_select_own"
  ON public.project_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_chat_messages.project_id
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "project_chat_insert_own"
  ON public.project_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_chat_messages.project_id
      AND w.owner_id = auth.uid()
    )
  );
