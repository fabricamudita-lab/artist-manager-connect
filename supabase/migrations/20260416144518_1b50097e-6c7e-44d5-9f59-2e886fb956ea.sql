
-- 1. Create custom_fields catalog table
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('artist', 'contact')),
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'url', 'email', 'phone')),
  section text DEFAULT 'custom',
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, entity_type, field_key)
);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage custom fields in their workspace
CREATE POLICY "Users manage own workspace custom fields"
  ON public.custom_fields FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid()
    )
  );

-- Anon can read custom_fields for public forms
CREATE POLICY "Anon can read custom fields for forms"
  ON public.custom_fields FOR SELECT TO anon USING (true);

-- 2. Add custom_data JSONB to artists and contacts
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;

-- 3. Performance indices
CREATE INDEX idx_custom_fields_entity ON public.custom_fields(workspace_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_artist_form_tokens_active ON public.artist_form_tokens(artist_id, is_active);
CREATE INDEX IF NOT EXISTS idx_contact_form_tokens_active ON public.contact_form_tokens(contact_id, is_active);
