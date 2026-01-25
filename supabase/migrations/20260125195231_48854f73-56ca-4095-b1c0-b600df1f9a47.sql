-- =====================================================
-- SEPARATE PUBLISHING (COPYRIGHT) AND MASTER (ROYALTIES) SPLITS
-- =====================================================

-- Table for Publishing/Copyright splits (composition/lyrics)
CREATE TABLE public.track_publishing_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'composer', -- composer, lyricist, publisher, etc.
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  pro_name TEXT, -- PRO (Performing Rights Organization) name: SGAE, ASCAP, BMI, etc.
  ipi_number TEXT, -- International Party Information number
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for Master/Recording splits (phonogram royalties)
CREATE TABLE public.track_master_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'artist', -- artist, producer, label, featured_artist, etc.
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  label_name TEXT, -- Record label if applicable
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.track_publishing_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_master_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for publishing splits
CREATE POLICY "Users can view publishing splits" 
ON public.track_publishing_splits FOR SELECT 
USING (true);

CREATE POLICY "Users can insert publishing splits" 
ON public.track_publishing_splits FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update publishing splits" 
ON public.track_publishing_splits FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete publishing splits" 
ON public.track_publishing_splits FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for master splits
CREATE POLICY "Users can view master splits" 
ON public.track_master_splits FOR SELECT 
USING (true);

CREATE POLICY "Users can insert master splits" 
ON public.track_master_splits FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update master splits" 
ON public.track_master_splits FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete master splits" 
ON public.track_master_splits FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_track_publishing_splits_track_id ON public.track_publishing_splits(track_id);
CREATE INDEX idx_track_master_splits_track_id ON public.track_master_splits(track_id);
CREATE INDEX idx_track_publishing_splits_contact_id ON public.track_publishing_splits(contact_id);
CREATE INDEX idx_track_master_splits_contact_id ON public.track_master_splits(contact_id);

-- Add columns to platform_earnings to track which type of royalty
ALTER TABLE public.platform_earnings ADD COLUMN IF NOT EXISTS royalty_type TEXT DEFAULT 'master' CHECK (royalty_type IN ('master', 'publishing', 'both'));

-- Comments for documentation
COMMENT ON TABLE public.track_publishing_splits IS 'Splits for publishing/copyright (composition, lyrics) - Derechos de Autor';
COMMENT ON TABLE public.track_master_splits IS 'Splits for master/recording (phonogram) - Royalties';
COMMENT ON COLUMN public.track_publishing_splits.pro_name IS 'Performing Rights Organization: SGAE, ASCAP, BMI, PRS, etc.';
COMMENT ON COLUMN public.track_publishing_splits.ipi_number IS 'International Performer/Publisher Information number';
COMMENT ON COLUMN public.platform_earnings.royalty_type IS 'Type of royalty: master (recording), publishing (composition), or both';