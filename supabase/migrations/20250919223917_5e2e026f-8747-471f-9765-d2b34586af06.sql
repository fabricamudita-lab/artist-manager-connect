-- Create a media library table for storing uploaded assets
CREATE TABLE public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  workspace_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- File info
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_bucket TEXT NOT NULL DEFAULT 'documents',
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
  file_size INTEGER,
  mime_type TEXT,
  
  -- Metadata for organization
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  category TEXT, -- 'photo', 'video', 'audio', 'document'
  subcategory TEXT, -- 'rider', 'stage_plot', 'press_photo', etc.
  
  -- For images
  width INTEGER,
  height INTEGER,
  
  -- For videos
  duration INTEGER, -- in seconds
  platform TEXT, -- 'youtube', 'vimeo', 'upload'
  video_id TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own media library items"
ON public.media_library
FOR ALL
USING (created_by = auth.uid());

CREATE POLICY "Users can view workspace media library items"
ON public.media_library
FOR SELECT
USING (
  created_by = auth.uid() OR
  (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = media_library.workspace_id
    AND wm.user_id = auth.uid()
  ))
);

-- Create indexes for better performance
CREATE INDEX idx_media_library_created_by ON public.media_library(created_by);
CREATE INDEX idx_media_library_workspace_id ON public.media_library(workspace_id);
CREATE INDEX idx_media_library_file_type ON public.media_library(file_type);
CREATE INDEX idx_media_library_category ON public.media_library(category);
CREATE INDEX idx_media_library_tags ON public.media_library USING GIN(tags);

-- Create updated_at trigger
CREATE TRIGGER update_media_library_updated_at
BEFORE UPDATE ON public.media_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();