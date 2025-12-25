-- Create artist_files table for the master library
CREATE TABLE IF NOT EXISTS public.artist_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_artist_files_artist_category ON public.artist_files(artist_id, category);
CREATE INDEX idx_artist_files_category ON public.artist_files(category);

-- Enable RLS
ALTER TABLE public.artist_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view artist files in their workspace"
ON public.artist_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM artists a
    JOIN workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE a.id = artist_files.artist_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files to artists in their workspace"
ON public.artist_files
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM artists a
    JOIN workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE a.id = artist_files.artist_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their uploaded files"
ON public.artist_files
FOR UPDATE
USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their uploaded files"
ON public.artist_files
FOR DELETE
USING (uploaded_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_artist_files_updated_at
BEFORE UPDATE ON public.artist_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();