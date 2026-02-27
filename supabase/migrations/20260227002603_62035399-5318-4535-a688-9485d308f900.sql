
CREATE TABLE public.release_artists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'primary',
  created_at timestamptz DEFAULT now(),
  UNIQUE(release_id, artist_id)
);

-- Migrate existing data
INSERT INTO public.release_artists (release_id, artist_id)
SELECT id, artist_id FROM public.releases WHERE artist_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.release_artists ENABLE ROW LEVEL SECURITY;

-- Open policy (same pattern as releases)
CREATE POLICY "release_artists_all" ON public.release_artists FOR ALL USING (true);
