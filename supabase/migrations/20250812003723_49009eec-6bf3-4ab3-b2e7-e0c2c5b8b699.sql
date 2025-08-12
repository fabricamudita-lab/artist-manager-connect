-- 1) Tabla de equipo por proyecto (lista de perfiles)
CREATE TABLE IF NOT EXISTS public.project_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view project team"
ON public.project_team FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can modify project team"
ON public.project_team FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can update project team"
ON public.project_team FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can delete project team"
ON public.project_team FOR DELETE
USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_project_team_project ON public.project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_profile ON public.project_team(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_team ON public.project_team(project_id, profile_id);

-- 2) Bucket de contratos en Storage (privado)
insert into storage.buckets (id, name, public)
select 'contracts', 'contracts', false
where not exists (select 1 from storage.buckets where id = 'contracts');

-- Políticas de acceso al bucket 'contracts'
create policy if not exists "Contracts: select"
  on storage.objects for select to authenticated
  using (bucket_id = 'contracts');

create policy if not exists "Contracts: insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts');

create policy if not exists "Contracts: update"
  on storage.objects for update to authenticated
  using (bucket_id = 'contracts');

create policy if not exists "Contracts: delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'contracts');

-- 3) Ajustes en tabla contracts para almacenar ruta en Storage
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS file_bucket text NOT NULL DEFAULT 'contracts',
  ADD COLUMN IF NOT EXISTS file_path text; -- ruta del objeto en el bucket

CREATE INDEX IF NOT EXISTS idx_contracts_bucket_path ON public.contracts(file_bucket, file_path);

-- 4) (Opcional) Marcar columna de texto libre como deprecada, por ahora se mantiene para compatibilidad
COMMENT ON COLUMN public.projects.equipo_involucrado IS 'DEPRECATED: usar public.project_team para relacionar perfiles';
