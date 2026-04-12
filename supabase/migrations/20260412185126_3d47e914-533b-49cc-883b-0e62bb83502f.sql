
ALTER TABLE public.epks ADD COLUMN artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL;
CREATE INDEX idx_epks_artist_id ON public.epks(artist_id);
