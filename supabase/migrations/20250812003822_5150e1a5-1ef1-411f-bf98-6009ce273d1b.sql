-- A) Tabla equipo del proyecto (lista de perfiles)
CREATE TABLE IF NOT EXISTS public.project_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project team"
ON public.project_team FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert project team"
ON public.project_team FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update project team"
ON public.project_team FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete project team"
ON public.project_team FOR DELETE
USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_project_team_project ON public.project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_profile ON public.project_team(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_team ON public.project_team(project_id, profile_id);

-- B) Bucket privado para contratos
insert into storage.buckets (id, name, public)
select 'contracts', 'contracts', false
where not exists (select 1 from storage.buckets where id = 'contracts');

-- Políticas de Storage para el bucket 'contracts'
CREATE POLICY "Contracts bucket: select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

CREATE POLICY "Contracts bucket: insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Contracts bucket: update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts');

CREATE POLICY "Contracts bucket: delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contracts');

-- C) Ajustes en tabla contracts para guardar archivos en Storage
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS file_bucket text NOT NULL DEFAULT 'contracts',
  ADD COLUMN IF NOT EXISTS file_path text; -- ruta del objeto en el bucket

CREATE INDEX IF NOT EXISTS idx_contracts_bucket_path ON public.contracts(file_bucket, file_path);

-- D) Marcar equipo_involucrado como deprecado (seguimos usando project_team)
COMMENT ON COLUMN public.projects.equipo_involucrado IS 'DEPRECATED: usar public.project_team para relacionar perfiles';
