
-- Incidents (Imprevistos) table
CREATE TABLE public.project_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'media' CHECK (severity IN ('baja', 'media', 'alta', 'critica')),
  status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_progreso', 'resuelto', 'cerrado')),
  reported_by UUID REFERENCES auth.users(id),
  assigned_to TEXT,
  resolution TEXT,
  impact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Questions (Dudas) table
CREATE TABLE public.project_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  context TEXT,
  status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'en_discusion', 'resuelta')),
  asked_by UUID REFERENCES auth.users(id),
  assigned_to TEXT,
  answer TEXT,
  answered_by TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'urgente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_project_incidents_project ON public.project_incidents(project_id);
CREATE INDEX idx_project_questions_project ON public.project_questions(project_id);

-- Updated_at triggers
CREATE TRIGGER update_project_incidents_updated_at
  BEFORE UPDATE ON public.project_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_solicitudes_updated_at();

CREATE TRIGGER update_project_questions_updated_at
  BEFORE UPDATE ON public.project_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_solicitudes_updated_at();

-- RLS
ALTER TABLE public.project_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project incidents" ON public.project_incidents
  FOR SELECT USING (true);
CREATE POLICY "Users can insert project incidents" ON public.project_incidents
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update project incidents" ON public.project_incidents
  FOR UPDATE USING (true);
CREATE POLICY "Users can delete project incidents" ON public.project_incidents
  FOR DELETE USING (true);

CREATE POLICY "Users can view project questions" ON public.project_questions
  FOR SELECT USING (true);
CREATE POLICY "Users can insert project questions" ON public.project_questions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update project questions" ON public.project_questions
  FOR UPDATE USING (true);
CREATE POLICY "Users can delete project questions" ON public.project_questions
  FOR DELETE USING (true);
