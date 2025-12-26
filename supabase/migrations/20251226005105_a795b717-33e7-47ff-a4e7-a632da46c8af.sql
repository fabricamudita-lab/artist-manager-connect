-- Add parent_id column for nested folders (infinite depth)
ALTER TABLE public.artist_subfolders
ADD COLUMN parent_id UUID REFERENCES public.artist_subfolders(id) ON DELETE CASCADE;

-- Create index for faster parent lookups
CREATE INDEX idx_artist_subfolders_parent_id ON public.artist_subfolders(parent_id);