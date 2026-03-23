-- Add share columns to releases
ALTER TABLE public.releases 
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;

-- Public read policy for shared releases
CREATE POLICY "Public can view shared releases" ON public.releases
  FOR SELECT TO anon
  USING (share_enabled = true AND share_token IS NOT NULL);

-- Public read policy for tracks of shared releases  
CREATE POLICY "Public can view tracks of shared releases" ON public.tracks
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.releases r
      WHERE r.id = tracks.release_id
        AND r.share_enabled = true
        AND r.share_token IS NOT NULL
    )
  );

-- Public read policy for track_versions of shared releases
CREATE POLICY "Public can view track_versions of shared releases" ON public.track_versions
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.releases r ON r.id = t.release_id
      WHERE t.id = track_versions.track_id
        AND r.share_enabled = true
        AND r.share_token IS NOT NULL
    )
  );

-- Public read for artists (name/avatar for shared pages)
CREATE POLICY "Public can view artists for shared releases" ON public.artists
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.releases r
      WHERE r.artist_id = artists.id
        AND r.share_enabled = true
        AND r.share_token IS NOT NULL
    )
  );