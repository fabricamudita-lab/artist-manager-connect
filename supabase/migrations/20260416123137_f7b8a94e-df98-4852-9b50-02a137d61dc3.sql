-- Allow anon to SELECT artist when a valid form token exists
CREATE POLICY "Public can view artists with valid form token"
ON public.artists
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.artist_form_tokens
    WHERE artist_form_tokens.artist_id = artists.id
      AND artist_form_tokens.is_active = true
      AND (artist_form_tokens.expires_at IS NULL OR artist_form_tokens.expires_at > now())
  )
);

-- Allow anon to UPDATE artist when a valid form token exists
CREATE POLICY "Public can update artists with valid form token"
ON public.artists
FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.artist_form_tokens
    WHERE artist_form_tokens.artist_id = artists.id
      AND artist_form_tokens.is_active = true
      AND (artist_form_tokens.expires_at IS NULL OR artist_form_tokens.expires_at > now())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.artist_form_tokens
    WHERE artist_form_tokens.artist_id = artists.id
      AND artist_form_tokens.is_active = true
      AND (artist_form_tokens.expires_at IS NULL OR artist_form_tokens.expires_at > now())
  )
);