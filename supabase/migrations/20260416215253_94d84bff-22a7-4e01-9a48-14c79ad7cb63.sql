
-- Add workspace_id column
ALTER TABLE public.custom_instruments
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill is unnecessary (no data); but enforce NOT NULL going forward only when there are no orphans
-- Make NOT NULL only if no rows exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.custom_instruments WHERE workspace_id IS NULL) THEN
    ALTER TABLE public.custom_instruments ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END$$;

-- Length constraint on name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'custom_instruments_name_length'
  ) THEN
    ALTER TABLE public.custom_instruments
      ADD CONSTRAINT custom_instruments_name_length CHECK (char_length(name) BETWEEN 1 AND 60);
  END IF;
END$$;

-- Drop old policies that may be misconfigured
DROP POLICY IF EXISTS "Authenticated users can insert custom instruments" ON public.custom_instruments;
DROP POLICY IF EXISTS "Authenticated users can read custom instruments" ON public.custom_instruments;
DROP POLICY IF EXISTS "Workspace members can view custom instruments" ON public.custom_instruments;
DROP POLICY IF EXISTS "Workspace members can insert custom instruments" ON public.custom_instruments;
DROP POLICY IF EXISTS "Workspace owners can delete custom instruments" ON public.custom_instruments;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS custom_instruments_workspace_lname_uniq
  ON public.custom_instruments (workspace_id, lower(name));
CREATE INDEX IF NOT EXISTS custom_instruments_workspace_idx
  ON public.custom_instruments (workspace_id);

ALTER TABLE public.custom_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view custom instruments"
  ON public.custom_instruments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = custom_instruments.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert custom instruments"
  ON public.custom_instruments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = custom_instruments.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can delete custom instruments"
  ON public.custom_instruments
  FOR DELETE
  TO authenticated
  USING (
    public.user_is_workspace_owner(auth.uid(), custom_instruments.workspace_id)
  );
