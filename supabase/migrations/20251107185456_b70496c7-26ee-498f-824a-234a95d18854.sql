-- Create royalties tracking tables

-- Table for songs/tracks
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  isrc TEXT,
  release_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table for royalty splits per song
CREATE TABLE IF NOT EXISTS public.royalty_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  role TEXT,
  name TEXT NOT NULL,
  notes TEXT,
  UNIQUE(song_id, contact_id)
);

-- Table for royalty earnings by platform
CREATE TABLE IF NOT EXISTS public.royalty_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('spotify', 'youtube', 'apple_music', 'amazon', 'tidal', 'deezer', 'other')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  streams INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table for scheduled payments to artists/collaborators
CREATE TABLE IF NOT EXISTS public.royalty_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES public.royalty_splits(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calculated_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  payment_proof_url TEXT
);

-- Enable RLS
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalty_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalty_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalty_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for songs
CREATE POLICY "Users can view songs" ON public.songs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create songs" ON public.songs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update songs" ON public.songs FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete songs" ON public.songs FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for royalty_splits
CREATE POLICY "Users can view royalty splits" ON public.royalty_splits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create royalty splits" ON public.royalty_splits FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update royalty splits" ON public.royalty_splits FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete royalty splits" ON public.royalty_splits FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for royalty_earnings
CREATE POLICY "Users can view royalty earnings" ON public.royalty_earnings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create royalty earnings" ON public.royalty_earnings FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update royalty earnings" ON public.royalty_earnings FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete royalty earnings" ON public.royalty_earnings FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for royalty_payments
CREATE POLICY "Users can view royalty payments" ON public.royalty_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create royalty payments" ON public.royalty_payments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update royalty payments" ON public.royalty_payments FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete royalty payments" ON public.royalty_payments FOR DELETE USING (auth.uid() = created_by);

-- Triggers for updated_at
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_royalty_splits_updated_at BEFORE UPDATE ON public.royalty_splits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_royalty_earnings_updated_at BEFORE UPDATE ON public.royalty_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_royalty_payments_updated_at BEFORE UPDATE ON public.royalty_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();