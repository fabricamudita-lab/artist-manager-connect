
-- Create roadmap_locations table for location autocomplete
CREATE TABLE public.roadmap_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, name)
);

-- Enable RLS
ALTER TABLE public.roadmap_locations ENABLE ROW LEVEL SECURITY;

-- Users can read locations for artists they have access to
CREATE POLICY "Users can read locations for their artists"
ON public.roadmap_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.artist_role_bindings arb
    WHERE arb.artist_id = roadmap_locations.artist_id
    AND arb.user_id = auth.uid()
  )
);

-- Users can insert locations for their artists
CREATE POLICY "Users can insert locations for their artists"
ON public.roadmap_locations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.artist_role_bindings arb
    WHERE arb.artist_id = roadmap_locations.artist_id
    AND arb.user_id = auth.uid()
  )
);

-- Users can delete locations for their artists
CREATE POLICY "Users can delete locations for their artists"
ON public.roadmap_locations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.artist_role_bindings arb
    WHERE arb.artist_id = roadmap_locations.artist_id
    AND arb.user_id = auth.uid()
  )
);

-- Index for fast autocomplete queries
CREATE INDEX idx_roadmap_locations_artist_name ON public.roadmap_locations (artist_id, name);
