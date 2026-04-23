CREATE POLICY "Public can read track credits via shared release"
ON public.track_credits
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tracks t
    JOIN public.releases r ON r.id = t.release_id
    WHERE t.id = track_credits.track_id
      AND r.share_enabled = true
      AND (r.share_expires_at IS NULL OR r.share_expires_at > now())
  )
);