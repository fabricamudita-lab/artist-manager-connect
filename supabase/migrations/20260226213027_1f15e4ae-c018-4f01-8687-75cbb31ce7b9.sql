
-- Table to log automation executions and prevent duplicates
CREATE TABLE public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, automation_key, entity_id)
);

-- Enable RLS
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- Policy: workspace members can read executions
CREATE POLICY "Workspace members can view automation executions"
  ON public.automation_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = automation_executions.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Policy: service role (edge function) can insert - using a permissive INSERT for service role
-- The edge function uses the service_role key, which bypasses RLS.
-- But we also allow authenticated users to see the data via the SELECT policy above.

-- Index for fast lookups by workspace
CREATE INDEX idx_automation_executions_workspace 
  ON public.automation_executions(workspace_id, automation_key);
