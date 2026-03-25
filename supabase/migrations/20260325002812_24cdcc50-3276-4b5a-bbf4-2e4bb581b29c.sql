ALTER TABLE public.release_assets 
ADD COLUMN track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL;