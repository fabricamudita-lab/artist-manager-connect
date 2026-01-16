-- Create table for sync request form links
CREATE TABLE public.sync_form_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  title TEXT,
  description TEXT,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0
);

-- Add status field to sync_offers for tracking unreviewed submissions
ALTER TABLE public.sync_offers 
ADD COLUMN IF NOT EXISTS form_link_id UUID REFERENCES public.sync_form_links(id),
ADD COLUMN IF NOT EXISTS is_external_submission BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'reviewed',
ADD COLUMN IF NOT EXISTS suggested_artist_id UUID REFERENCES public.artists(id),
ADD COLUMN IF NOT EXISTS suggested_song_id UUID REFERENCES public.songs(id);

-- Enable RLS
ALTER TABLE public.sync_form_links ENABLE ROW LEVEL SECURITY;

-- Policies for sync_form_links
CREATE POLICY "Users can view their own form links"
ON public.sync_form_links FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create form links"
ON public.sync_form_links FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own form links"
ON public.sync_form_links FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own form links"
ON public.sync_form_links FOR DELETE
USING (auth.uid() = created_by);

-- Public policy to read form links by token (for public form access)
CREATE POLICY "Anyone can read active form links by token"
ON public.sync_form_links FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Allow anonymous inserts to sync_offers via form
CREATE POLICY "Anyone can create sync offers via public form"
ON public.sync_offers FOR INSERT
WITH CHECK (is_external_submission = true);

-- Index for token lookups
CREATE INDEX idx_sync_form_links_token ON public.sync_form_links(token);
CREATE INDEX idx_sync_offers_review_status ON public.sync_offers(review_status);