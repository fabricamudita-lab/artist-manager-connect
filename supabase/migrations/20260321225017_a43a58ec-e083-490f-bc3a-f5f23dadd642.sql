ALTER TABLE public.track_credits 
  ADD COLUMN artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL;