-- =============================================
-- RELEASES MODULE - Database Structure
-- =============================================

-- Main releases table
CREATE TABLE public.releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single' CHECK (type IN ('album', 'ep', 'single')),
  release_date DATE,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'released', 'archived')),
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT,
  label TEXT,
  upc TEXT,
  genre TEXT
);

-- Enable RLS
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view releases" ON public.releases
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create releases" ON public.releases
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update releases" ON public.releases
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete releases" ON public.releases
  FOR DELETE USING (auth.uid() = created_by);

-- Milestones for timeline
CREATE TABLE public.release_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  days_offset INTEGER, -- Offset from release date (negative = before, positive = after)
  is_anchor BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  category TEXT,
  responsible TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.release_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage release milestones" ON public.release_milestones
  FOR ALL USING (auth.role() = 'authenticated');

-- Tracks
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  track_number INTEGER NOT NULL DEFAULT 1,
  duration INTEGER, -- Duration in seconds
  isrc TEXT,
  lyrics TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tracks" ON public.tracks
  FOR ALL USING (auth.role() = 'authenticated');

-- Track versions for audio control
CREATE TABLE public.track_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_bucket TEXT DEFAULT 'documents',
  is_current_version BOOLEAN DEFAULT false,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.track_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage track versions" ON public.track_versions
  FOR ALL USING (auth.role() = 'authenticated');

-- Track credits (composers, producers, etc.)
CREATE TABLE public.track_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- composer, producer, lyricist, performer, engineer, etc.
  percentage NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.track_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage track credits" ON public.track_credits
  FOR ALL USING (auth.role() = 'authenticated');

-- Release budgets
CREATE TABLE public.release_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- production, marketing, video, distribution, etc.
  item_name TEXT NOT NULL,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'invoiced')),
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.release_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage release budgets" ON public.release_budgets
  FOR ALL USING (auth.role() = 'authenticated');

-- Release assets (images, videos, documents)
CREATE TABLE public.release_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'document')),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_bucket TEXT DEFAULT 'documents',
  thumbnail_url TEXT,
  tags TEXT[],
  category TEXT, -- cover, promo, behind_scenes, press_release, bio, etc.
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.release_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage release assets" ON public.release_assets
  FOR ALL USING (auth.role() = 'authenticated');

-- Updated_at triggers
CREATE TRIGGER update_releases_updated_at
  BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_milestones_updated_at
  BEFORE UPDATE ON public.release_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_budgets_updated_at
  BEFORE UPDATE ON public.release_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();