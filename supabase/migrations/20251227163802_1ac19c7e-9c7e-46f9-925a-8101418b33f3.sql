-- Drop the incorrect foreign key constraint
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_artist_id_fkey;

-- Add the correct foreign key constraint referencing artists table
ALTER TABLE public.projects 
ADD CONSTRAINT projects_artist_id_fkey 
FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;