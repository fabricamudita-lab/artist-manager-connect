-- Create project_files table for file management within projects
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_type TEXT NOT NULL DEFAULT 'otros', -- presupuestos, hojas_de_ruta, fotos, legal, otros
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add public_share columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS public_share_expires_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_files
CREATE POLICY "Users can view project files" 
ON public.project_files 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload project files" 
ON public.project_files 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update project files" 
ON public.project_files 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete project files" 
ON public.project_files 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-files bucket
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view project files"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view shared project files"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files');

-- Create index for faster queries
CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX idx_project_files_folder_type ON public.project_files(folder_type);

-- Function to generate public share token
CREATE OR REPLACE FUNCTION public.generate_project_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(24), 'base64');
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_project_files_updated_at
BEFORE UPDATE ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();