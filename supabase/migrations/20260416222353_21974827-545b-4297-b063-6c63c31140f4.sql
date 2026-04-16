-- 1) Tabla custom_pros
CREATE TABLE public.custom_pros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  country text CHECK (country IS NULL OR char_length(country) = 2),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX custom_pros_workspace_name_idx
  ON public.custom_pros (workspace_id, lower(name));

ALTER TABLE public.custom_pros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view custom pros"
  ON public.custom_pros FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = custom_pros.workspace_id
      AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Workspace members can insert custom pros"
  ON public.custom_pros FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = custom_pros.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can delete custom pros"
  ON public.custom_pros FOR DELETE
  USING (public.user_is_workspace_owner(auth.uid(), workspace_id));

-- 2) Columnas IPI y PRO en artists
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS ipi_number text,
  ADD COLUMN IF NOT EXISTS pro_name text;

ALTER TABLE public.artists
  ADD CONSTRAINT artists_ipi_number_format
  CHECK (ipi_number IS NULL OR ipi_number ~ '^\d{9,11}$');

-- 3) Columnas IPI y PRO en contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS ipi_number text,
  ADD COLUMN IF NOT EXISTS pro_name text;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_ipi_number_format
  CHECK (ipi_number IS NULL OR ipi_number ~ '^\d{9,11}$');