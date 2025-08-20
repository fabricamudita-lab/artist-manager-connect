-- Create project checklist items table
CREATE TABLE public.project_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.project_checklist_items ENABLE ROW LEVEL SECURITY;

-- Create policies for checklist items
CREATE POLICY "Users can view checklist items for projects they have access to"
ON public.project_checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
    LEFT JOIN artists a ON a.id = p.artist_id
    LEFT JOIN workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE p.id = project_checklist_items.project_id
    AND (
      p.created_by = auth.uid() OR
      prb.user_id = auth.uid() OR
      wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Project editors can create checklist items"
ON public.project_checklist_items
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
    WHERE p.id = project_checklist_items.project_id
    AND (
      p.created_by = auth.uid() OR
      (prb.user_id = auth.uid() AND prb.role = 'EDITOR')
    )
  )
);

CREATE POLICY "Project editors can update checklist items"
ON public.project_checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
    WHERE p.id = project_checklist_items.project_id
    AND (
      p.created_by = auth.uid() OR
      (prb.user_id = auth.uid() AND prb.role = 'EDITOR')
    )
  )
);

CREATE POLICY "Project editors can delete checklist items"
ON public.project_checklist_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
    WHERE p.id = project_checklist_items.project_id
    AND (
      p.created_by = auth.uid() OR
      (prb.user_id = auth.uid() AND prb.role = 'EDITOR')
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_project_checklist_items_updated_at
  BEFORE UPDATE ON public.project_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();