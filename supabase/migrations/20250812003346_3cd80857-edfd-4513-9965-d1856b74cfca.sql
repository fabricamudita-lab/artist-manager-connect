-- 1) Tipos ENUM
CREATE TYPE public.project_status AS ENUM ('en_curso','finalizado','archivado');
CREATE TYPE public.contract_status AS ENUM ('borrador','pendiente_firma','firmado');

-- 2) Tabla de proyectos
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  objective text,
  status public.project_status NOT NULL DEFAULT 'en_curso',
  artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date date,
  end_date_estimada date,
  equipo_involucrado text, -- libre; si luego queremos relacionar miembros, creamos tabla intermedia
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (mismo patrón que el resto del proyecto)
CREATE POLICY "Users can view projects"
ON public.projects FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create projects"
ON public.projects FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update projects"
ON public.projects FOR UPDATE
USING (auth.role() = 'authenticated');

-- Trigger de updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices útiles
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_artist ON public.projects(artist_id);
CREATE INDEX idx_projects_dates ON public.projects(start_date, end_date_estimada);

-- 3) Tabla de contratos
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.contract_status NOT NULL DEFAULT 'borrador',
  file_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts"
ON public.contracts FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update contracts"
ON public.contracts FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contracts_project ON public.contracts(project_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- 4) Vínculos project_id en tablas existentes (opcionales y nulos para no romper datos)
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_project ON public.budgets(project_id);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);

ALTER TABLE public.solicitudes
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_solicitudes_project ON public.solicitudes(project_id);
