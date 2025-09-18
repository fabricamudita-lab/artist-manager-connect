-- Add folder support to projects table
ALTER TABLE public.projects 
ADD COLUMN parent_folder_id uuid REFERENCES public.projects(id),
ADD COLUMN is_folder boolean NOT NULL DEFAULT false;

-- Add index for better performance on folder queries
CREATE INDEX idx_projects_parent_folder ON public.projects(parent_folder_id);
CREATE INDEX idx_projects_is_folder ON public.projects(is_folder);