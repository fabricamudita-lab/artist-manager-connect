-- 1. Create project_checklists table
CREATE TABLE public.project_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add checklist_id column to project_checklist_items (nullable for retrocompat)
ALTER TABLE public.project_checklist_items
  ADD COLUMN checklist_id UUID REFERENCES public.project_checklists(id) ON DELETE CASCADE;

-- 3. Data migration: create a "General" checklist for every project that has items
INSERT INTO public.project_checklists (project_id, name, sort_order, created_by)
SELECT DISTINCT pci.project_id, 'General', 0, pci.created_by
FROM public.project_checklist_items pci
WHERE pci.checklist_id IS NULL
ON CONFLICT DO NOTHING;

-- 4. Assign existing items to their project's "General" checklist
UPDATE public.project_checklist_items pci
SET checklist_id = pc.id
FROM public.project_checklists pc
WHERE pc.project_id = pci.project_id
  AND pc.name = 'General'
  AND pci.checklist_id IS NULL;

-- 5. RLS policies for project_checklists
ALTER TABLE public.project_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project checklists" ON public.project_checklists
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert project checklists" ON public.project_checklists
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update project checklists" ON public.project_checklists
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete project checklists" ON public.project_checklists
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. Index for faster lookups
CREATE INDEX idx_project_checklists_project_id ON public.project_checklists(project_id);
CREATE INDEX idx_project_checklist_items_checklist_id ON public.project_checklist_items(checklist_id);