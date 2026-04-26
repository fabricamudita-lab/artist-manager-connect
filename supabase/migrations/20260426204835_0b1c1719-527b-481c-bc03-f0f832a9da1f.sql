-- Tabla de notas colaborativas por proyecto
CREATE TABLE public.project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nueva nota',
  content TEXT NOT NULL DEFAULT '',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_notes_project_id ON public.project_notes(project_id);
CREATE INDEX idx_project_notes_updated_at ON public.project_notes(updated_at DESC);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Helper: ¿el usuario tiene acceso al proyecto?
CREATE OR REPLACE FUNCTION public.user_has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_role_bindings prb
    WHERE prb.project_id = _project_id AND prb.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.artist_role_bindings arb ON arb.artist_id = p.artist_id
    WHERE p.id = _project_id AND arb.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.created_by = _user_id
  );
$$;

CREATE POLICY "Project members can view notes"
  ON public.project_notes FOR SELECT
  TO authenticated
  USING (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can create notes"
  ON public.project_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can update notes"
  ON public.project_notes FOR UPDATE
  TO authenticated
  USING (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can delete notes"
  ON public.project_notes FOR DELETE
  TO authenticated
  USING (public.user_has_project_access(auth.uid(), project_id));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_project_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_notes_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_notes;