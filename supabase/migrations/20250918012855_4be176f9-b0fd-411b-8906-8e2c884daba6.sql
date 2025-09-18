-- Add folder support to projects table
ALTER TABLE public.projects 
ADD COLUMN parent_folder_id uuid REFERENCES public.projects(id),
ADD COLUMN is_folder boolean NOT NULL DEFAULT false;

-- Add index for better performance on folder queries
CREATE INDEX idx_projects_parent_folder ON public.projects(parent_folder_id);
CREATE INDEX idx_projects_is_folder ON public.projects(is_folder);

-- Create view for easier folder/project queries
CREATE OR REPLACE VIEW public.project_hierarchy AS
SELECT 
  p.*,
  parent.name as parent_folder_name
FROM public.projects p
LEFT JOIN public.projects parent ON parent.id = p.parent_folder_id;

-- Add RLS policy for project hierarchy view
CREATE POLICY "Users can view project hierarchy"
ON public.project_hierarchy
FOR SELECT
USING (auth.role() = 'authenticated');

-- Grant usage on the view
GRANT SELECT ON public.project_hierarchy TO authenticated;