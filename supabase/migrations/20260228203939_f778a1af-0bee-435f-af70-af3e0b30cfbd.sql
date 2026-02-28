
-- Extend release_assets with DAM metadata
ALTER TABLE public.release_assets 
  ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'artwork',
  ADD COLUMN IF NOT EXISTS sub_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'en_produccion',
  ADD COLUMN IF NOT EXISTS platform_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS format_spec TEXT,
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS is_watermarked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS supplier_contact_id UUID REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS version_group TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Photo sessions table
CREATE TABLE IF NOT EXISTS public.release_photo_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  photographer TEXT,
  session_date DATE,
  status TEXT DEFAULT 'en_produccion',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add FK from release_assets.session_id to photo_sessions
ALTER TABLE public.release_assets
  ADD CONSTRAINT release_assets_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.release_photo_sessions(id) ON DELETE SET NULL;

-- RLS for photo sessions
ALTER TABLE public.release_photo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photo sessions" ON public.release_photo_sessions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage photo sessions" ON public.release_photo_sessions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Asset comments table for collaboration
CREATE TABLE IF NOT EXISTS public.release_asset_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.release_assets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.release_asset_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset comments" ON public.release_asset_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage asset comments" ON public.release_asset_comments
  FOR ALL USING (auth.uid() IS NOT NULL);
