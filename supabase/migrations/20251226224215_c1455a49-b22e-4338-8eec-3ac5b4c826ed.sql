-- Drop the incorrect foreign key constraint
ALTER TABLE public.solicitudes 
DROP CONSTRAINT IF EXISTS solicitudes_artist_id_fkey;

-- Add the correct foreign key constraint referencing artists table
ALTER TABLE public.solicitudes 
ADD CONSTRAINT solicitudes_artist_id_fkey 
FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;