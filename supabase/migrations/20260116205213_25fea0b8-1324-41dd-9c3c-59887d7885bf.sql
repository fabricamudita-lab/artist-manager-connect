-- Create sync_offers table for music licensing/sync management
CREATE TABLE public.sync_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Project Details
  production_title TEXT NOT NULL,
  production_type TEXT NOT NULL CHECK (production_type IN ('cine', 'publicidad', 'serie', 'evento', 'videojuego', 'podcast', 'otro')),
  production_company TEXT,
  director TEXT,
  territory TEXT DEFAULT 'España',
  media TEXT[] DEFAULT '{}',
  duration_years INTEGER DEFAULT 1,
  
  -- Music Usage
  song_title TEXT NOT NULL,
  song_artist TEXT,
  usage_type TEXT CHECK (usage_type IN ('background', 'featured', 'main_title', 'end_credits', 'trailer', 'promo')),
  usage_duration TEXT,
  scene_description TEXT,
  
  -- Contact Info
  requester_name TEXT,
  requester_email TEXT,
  requester_company TEXT,
  requester_phone TEXT,
  contact_id UUID REFERENCES public.contacts(id),
  
  -- Financial
  total_budget NUMERIC(12, 2),
  music_budget NUMERIC(12, 2),
  sync_fee NUMERIC(12, 2),
  master_fee NUMERIC(12, 2),
  publishing_fee NUMERIC(12, 2),
  currency TEXT DEFAULT 'EUR',
  
  -- Splits
  master_percentage NUMERIC(5, 2) DEFAULT 50,
  publishing_percentage NUMERIC(5, 2) DEFAULT 50,
  master_holder TEXT,
  publishing_holder TEXT,
  
  -- Workflow
  phase TEXT DEFAULT 'solicitud' CHECK (phase IN ('solicitud', 'cotizacion', 'negociacion', 'licencia_firmada', 'facturado')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  deadline DATE,
  
  -- References
  artist_id UUID REFERENCES public.artists(id),
  project_id UUID REFERENCES public.projects(id),
  
  -- Notes & Attachments
  notes TEXT,
  internal_notes TEXT,
  contract_url TEXT,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_offers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view sync offers"
ON public.sync_offers
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create sync offers"
ON public.sync_offers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update sync offers"
ON public.sync_offers
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their sync offers"
ON public.sync_offers
FOR DELETE
USING (auth.uid() = created_by);

-- Create index for common queries
CREATE INDEX idx_sync_offers_phase ON public.sync_offers(phase);
CREATE INDEX idx_sync_offers_artist_id ON public.sync_offers(artist_id);
CREATE INDEX idx_sync_offers_created_at ON public.sync_offers(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_sync_offers_updated_at
BEFORE UPDATE ON public.sync_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();