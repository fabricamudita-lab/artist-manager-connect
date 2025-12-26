-- Add additional fields to artists table
ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS genre text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS header_image_url text,
ADD COLUMN IF NOT EXISTS spotify_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS tiktok_url text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS swift_code text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS calendar_url text,
ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#8B5CF6';

-- Create legal_documents table
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'management_agreement', 'label_deal', 'publishing', 'other'
  title text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  renewal_alert_days integer DEFAULT 30,
  notes text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create booking_products table (formats/services)
CREATE TABLE IF NOT EXISTS public.booking_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name text NOT NULL, -- 'Full Band', 'Acoustic Set', 'DJ Set'
  description text,
  fee_min numeric,
  fee_max numeric,
  currency text DEFAULT 'EUR',
  rider_url text,
  hospitality_requirements text,
  crew_size integer DEFAULT 1,
  setup_time_minutes integer,
  performance_duration_minutes integer,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create default_royalty_splits table for artist defaults
CREATE TABLE IF NOT EXISTS public.default_royalty_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  recipient_role text NOT NULL, -- 'artist', 'manager', 'producer', 'writer'
  percentage numeric NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  contact_id uuid REFERENCES public.contacts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_royalty_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_documents
CREATE POLICY "Users can view legal documents" ON public.legal_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create legal documents" ON public.legal_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update legal documents" ON public.legal_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete legal documents" ON public.legal_documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for booking_products
CREATE POLICY "Users can view booking products" ON public.booking_products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create booking products" ON public.booking_products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update booking products" ON public.booking_products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete booking products" ON public.booking_products
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for default_royalty_splits
CREATE POLICY "Users can view default royalty splits" ON public.default_royalty_splits
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create default royalty splits" ON public.default_royalty_splits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update default royalty splits" ON public.default_royalty_splits
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete default royalty splits" ON public.default_royalty_splits
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create storage bucket for artist assets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-assets', 'artist-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artist-assets bucket
CREATE POLICY "Anyone can view artist assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'artist-assets');

CREATE POLICY "Authenticated users can upload artist assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artist-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update artist assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'artist-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete artist assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'artist-assets' AND auth.role() = 'authenticated');
