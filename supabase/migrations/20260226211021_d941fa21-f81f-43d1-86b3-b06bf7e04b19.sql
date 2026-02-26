
CREATE TABLE public.automation_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  trigger_days integer,
  notify_role text,
  notify_channel text NOT NULL DEFAULT 'in_app',
  custom_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, automation_key)
);

ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace automations"
  ON public.automation_configs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = automation_configs.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage automations"
  ON public.automation_configs FOR ALL TO authenticated
  USING (
    public.user_is_workspace_owner(auth.uid(), automation_configs.workspace_id)
  )
  WITH CHECK (
    public.user_is_workspace_owner(auth.uid(), automation_configs.workspace_id)
  );
