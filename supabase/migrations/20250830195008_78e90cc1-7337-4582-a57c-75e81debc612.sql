-- Create task_links table for linking tasks with other project elements
CREATE TABLE public.task_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  linked_item_id UUID NOT NULL,
  linked_item_type TEXT NOT NULL,
  linked_item_title TEXT NOT NULL,
  project_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users,
  
  UNIQUE(task_id, linked_item_id, linked_item_type)
);

-- Enable Row Level Security
ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view task links from their projects" 
ON public.task_links 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = task_links.project_id 
    AND (
      created_by = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create task links in their projects" 
ON public.task_links 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = task_links.project_id 
    AND (
      created_by = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete task links from their projects" 
ON public.task_links 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = task_links.project_id 
    AND (
      created_by = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Add index for performance
CREATE INDEX idx_task_links_task_id ON public.task_links(task_id);
CREATE INDEX idx_task_links_project_id ON public.task_links(project_id);