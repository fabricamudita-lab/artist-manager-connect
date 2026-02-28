-- Add project_id column to releases table
ALTER TABLE public.releases 
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_releases_project_id ON public.releases(project_id);