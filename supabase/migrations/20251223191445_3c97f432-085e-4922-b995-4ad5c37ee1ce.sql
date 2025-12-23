-- Link team contacts to one or more artists (many-to-many)
CREATE TABLE IF NOT EXISTS public.contact_artist_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_artist_assignments_unique UNIQUE (contact_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_artist_assignments_contact_id
  ON public.contact_artist_assignments(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_artist_assignments_artist_id
  ON public.contact_artist_assignments(artist_id);

ALTER TABLE public.contact_artist_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: only the creator of the contact can manage/view its assignments
DROP POLICY IF EXISTS "Users can view their contact artist assignments" ON public.contact_artist_assignments;
CREATE POLICY "Users can view their contact artist assignments"
ON public.contact_artist_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.id = contact_artist_assignments.contact_id
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create assignments for their contacts" ON public.contact_artist_assignments;
CREATE POLICY "Users can create assignments for their contacts"
ON public.contact_artist_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.id = contact_artist_assignments.contact_id
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete assignments for their contacts" ON public.contact_artist_assignments;
CREATE POLICY "Users can delete assignments for their contacts"
ON public.contact_artist_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.id = contact_artist_assignments.contact_id
      AND c.created_by = auth.uid()
  )
);
