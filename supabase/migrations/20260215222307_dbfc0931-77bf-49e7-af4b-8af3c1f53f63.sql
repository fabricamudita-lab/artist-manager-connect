
CREATE TABLE public.artist_form_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.artist_form_tokens ENABLE ROW LEVEL SECURITY;

-- Public can read active tokens (to validate them)
CREATE POLICY "Public can read active tokens"
  ON public.artist_form_tokens FOR SELECT
  USING (is_active = true);

-- Authenticated users can create tokens
CREATE POLICY "Authenticated users can create tokens"
  ON public.artist_form_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Public can update artists if a valid active token exists
CREATE POLICY "Public can update artists with valid token"
  ON public.artists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.artist_form_tokens
      WHERE artist_form_tokens.artist_id = artists.id
      AND artist_form_tokens.is_active = true
    )
  );
