ALTER TABLE public.pitches 
  ADD COLUMN pitch_type TEXT NOT NULL DEFAULT 'full_album',
  ADD COLUMN track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL;

CREATE INDEX idx_pitches_track_id ON public.pitches(track_id);