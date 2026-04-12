
-- Create enum for pitch status
DO $$ BEGIN
  CREATE TYPE public.pitch_status AS ENUM ('draft', 'sent', 'in_progress', 'completed', 'reviewed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add pitch columns to releases
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS pitch_status public.pitch_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS pitch_deadline date,
  ADD COLUMN IF NOT EXISTS pitch_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS pitch_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS synopsis text,
  ADD COLUMN IF NOT EXISTS spotify_strategy text,
  ADD COLUMN IF NOT EXISTS spotify_monthly_listeners integer,
  ADD COLUMN IF NOT EXISTS spotify_followers integer,
  ADD COLUMN IF NOT EXISTS spotify_milestones text,
  ADD COLUMN IF NOT EXISTS general_strategy text,
  ADD COLUMN IF NOT EXISTS social_links text;

-- Index for token lookup (public form)
CREATE INDEX IF NOT EXISTS idx_releases_pitch_token ON public.releases (pitch_token) WHERE pitch_token IS NOT NULL;

-- Allow public (anon) read access by pitch_token for the public form
CREATE POLICY "Public can read release by pitch_token"
  ON public.releases
  FOR SELECT
  TO anon
  USING (pitch_token IS NOT NULL);

-- Allow public (anon) update by pitch_token (only pitch-related fields will be updated via app logic)
CREATE POLICY "Public can update release by pitch_token"
  ON public.releases
  FOR UPDATE
  TO anon
  USING (pitch_token IS NOT NULL)
  WITH CHECK (pitch_token IS NOT NULL);
