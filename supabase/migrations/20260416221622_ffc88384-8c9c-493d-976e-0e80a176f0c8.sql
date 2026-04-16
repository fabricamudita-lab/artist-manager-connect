-- Create credit_notes table
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('publishing', 'master')),
  note text NOT NULL CHECK (char_length(note) <= 2000),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique: one note per (release, track-or-global, scope)
CREATE UNIQUE INDEX credit_notes_unique_release_global
  ON public.credit_notes (release_id, scope)
  WHERE track_id IS NULL;

CREATE UNIQUE INDEX credit_notes_unique_release_track
  ON public.credit_notes (release_id, track_id, scope)
  WHERE track_id IS NOT NULL;

CREATE INDEX credit_notes_release_scope_idx
  ON public.credit_notes (release_id, scope);

-- updated_at trigger
CREATE TRIGGER trg_credit_notes_updated_at
BEFORE UPDATE ON public.credit_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Helper: a user can access a release if they are member of the workspace owning the release's artist
-- Reuse existing pattern via releases -> artists -> workspace_memberships

CREATE POLICY "Workspace members can view credit notes"
ON public.credit_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = credit_notes.release_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can insert credit notes"
ON public.credit_notes
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = credit_notes.release_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can update credit notes"
ON public.credit_notes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = credit_notes.release_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can delete credit notes"
ON public.credit_notes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = credit_notes.release_id
      AND wm.user_id = auth.uid()
  )
);