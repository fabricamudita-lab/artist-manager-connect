-- Create production_companies table for autocomplete
CREATE TABLE public.production_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create directors table for autocomplete
CREATE TABLE public.directors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  production_company_id UUID REFERENCES public.production_companies(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, production_company_id)
);

-- Create sync_splits table for dynamic splits linked to team members/contacts
CREATE TABLE public.sync_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_offer_id UUID NOT NULL REFERENCES public.sync_offers(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL CHECK (split_type IN ('master', 'publishing', 'songwriter', 'producer', 'manager', 'band', 'label', 'editorial', 'other')),
  percentage NUMERIC NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  holder_name TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  team_member_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to sync_offers to link to existing entities
ALTER TABLE public.sync_offers 
  ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS production_company_id UUID REFERENCES public.production_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES public.directors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requester_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.production_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for production_companies
CREATE POLICY "Users can view all production companies" 
ON public.production_companies FOR SELECT USING (true);

CREATE POLICY "Users can create production companies" 
ON public.production_companies FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their production companies" 
ON public.production_companies FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for directors
CREATE POLICY "Users can view all directors" 
ON public.directors FOR SELECT USING (true);

CREATE POLICY "Users can create directors" 
ON public.directors FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their directors" 
ON public.directors FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for sync_splits
CREATE POLICY "Users can view sync splits" 
ON public.sync_splits FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sync_offers so 
    WHERE so.id = sync_offer_id AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create sync splits" 
ON public.sync_splits FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sync_offers so 
    WHERE so.id = sync_offer_id AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update sync splits" 
ON public.sync_splits FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.sync_offers so 
    WHERE so.id = sync_offer_id AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete sync splits" 
ON public.sync_splits FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.sync_offers so 
    WHERE so.id = sync_offer_id AND so.created_by = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_offers_artist_id ON public.sync_offers(artist_id);
CREATE INDEX IF NOT EXISTS idx_sync_offers_song_id ON public.sync_offers(song_id);
CREATE INDEX IF NOT EXISTS idx_sync_splits_sync_offer_id ON public.sync_splits(sync_offer_id);
CREATE INDEX IF NOT EXISTS idx_directors_production_company ON public.directors(production_company_id);