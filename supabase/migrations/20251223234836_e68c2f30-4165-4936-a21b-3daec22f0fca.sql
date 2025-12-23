-- Create project_file_links table for linking files from folders to projects
CREATE TABLE IF NOT EXISTS public.project_file_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_file_id UUID NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
  linked_by UUID NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(project_id, source_file_id)
);

-- Enable RLS
ALTER TABLE public.project_file_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_file_links
CREATE POLICY "Users can view file links" ON public.project_file_links
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create file links" ON public.project_file_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete file links" ON public.project_file_links
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add index for performance
CREATE INDEX idx_project_file_links_project_id ON public.project_file_links(project_id);
CREATE INDEX idx_project_file_links_source_file_id ON public.project_file_links(source_file_id);

-- Add comments
COMMENT ON TABLE public.project_file_links IS 'Links files from folders (archive) to projects (workspace) for access control';
COMMENT ON COLUMN public.project_file_links.source_file_id IS 'The original file in the folder/archive';
COMMENT ON COLUMN public.project_file_links.project_id IS 'The project where this file should be visible';