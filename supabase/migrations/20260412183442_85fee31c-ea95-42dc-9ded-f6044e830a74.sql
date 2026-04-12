
-- Create pitches table
CREATE TABLE public.pitches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Pitch principal',
  synopsis TEXT,
  mood TEXT,
  country TEXT,
  spotify_strategy TEXT,
  spotify_monthly_listeners INTEGER,
  spotify_followers INTEGER,
  spotify_milestones TEXT,
  general_strategy TEXT,
  social_links TEXT,
  pitch_status TEXT NOT NULL DEFAULT 'draft',
  pitch_deadline TIMESTAMPTZ,
  pitch_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  pitch_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by release
CREATE INDEX idx_pitches_release_id ON public.pitches(release_id);
-- Index for public form token lookup
CREATE INDEX idx_pitches_pitch_token ON public.pitches(pitch_token);

-- Enable RLS
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;

-- Authenticated users in the same workspace can manage pitches
CREATE POLICY "Workspace members can view pitches"
ON public.pitches FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = release_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can create pitches"
ON public.pitches FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = release_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can update pitches"
ON public.pitches FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = release_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can delete pitches"
ON public.pitches FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.releases r
    JOIN public.artists a ON a.id = r.artist_id
    JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE r.id = release_id AND wm.user_id = auth.uid()
  )
);

-- Anonymous access via pitch_token (public form)
CREATE POLICY "Anyone can view pitch by token"
ON public.pitches FOR SELECT TO anon
USING (pitch_token IS NOT NULL);

CREATE POLICY "Anyone can update pitch by token"
ON public.pitches FOR UPDATE TO anon
USING (pitch_token IS NOT NULL);

-- Auto-update updated_at
CREATE TRIGGER update_pitches_updated_at
BEFORE UPDATE ON public.pitches
FOR EACH ROW
EXECUTE FUNCTION public.update_event_index_updated_at();

-- Migrate existing data from releases
INSERT INTO public.pitches (release_id, created_by, name, synopsis, mood, country, spotify_strategy, spotify_monthly_listeners, spotify_followers, spotify_milestones, general_strategy, social_links, pitch_status, pitch_deadline, pitch_token, pitch_config)
SELECT 
  r.id,
  r.created_by,
  'Pitch principal',
  r.synopsis,
  r.mood,
  r.country,
  r.spotify_strategy,
  r.spotify_monthly_listeners,
  r.spotify_followers,
  r.spotify_milestones,
  r.general_strategy,
  r.social_links,
  COALESCE(r.pitch_status, 'draft'),
  r.pitch_deadline,
  r.pitch_token,
  COALESCE(r.pitch_config, '{}'::jsonb)
FROM public.releases r
WHERE r.pitch_token IS NOT NULL;
