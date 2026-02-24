
CREATE TABLE public.project_linked_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'show', 'release', 'sync', 'videoclip', 'prensa', 'merch'
  entity_id UUID, -- nullable for free entities
  entity_name TEXT NOT NULL,
  entity_date TEXT, -- optional date string
  entity_status TEXT, -- optional status
  linked_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ple_project ON public.project_linked_entities(project_id);
CREATE INDEX idx_ple_entity ON public.project_linked_entities(entity_type, entity_id);

-- Unique constraint to prevent duplicate links
CREATE UNIQUE INDEX idx_ple_unique ON public.project_linked_entities(project_id, entity_type, entity_id) WHERE entity_id IS NOT NULL;

ALTER TABLE public.project_linked_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view linked entities for their projects"
  ON public.project_linked_entities FOR SELECT
  USING (true);

CREATE POLICY "Users can insert linked entities"
  ON public.project_linked_entities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete linked entities"
  ON public.project_linked_entities FOR DELETE
  USING (auth.uid() IS NOT NULL);
