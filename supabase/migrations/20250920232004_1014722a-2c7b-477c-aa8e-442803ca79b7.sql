-- Extend contacts table for comprehensive contact management
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS stage_name text,
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS bank_info text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS clothing_size text,
ADD COLUMN IF NOT EXISTS shoe_size text,
ADD COLUMN IF NOT EXISTS allergies text,
ADD COLUMN IF NOT EXISTS special_needs text,
ADD COLUMN IF NOT EXISTS contract_url text,
ADD COLUMN IF NOT EXISTS preferred_hours text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS field_config jsonb DEFAULT '{"stage_name": true, "legal_name": true, "email": true, "phone": true, "address": false, "bank_info": false, "iban": false, "clothing_size": false, "shoe_size": false, "allergies": false, "special_needs": false, "contract_url": false, "preferred_hours": false, "company": true, "role": true, "notes": true}'::jsonb,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
ADD COLUMN IF NOT EXISTS shared_with_users uuid[] DEFAULT ARRAY[]::uuid[];

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_contacts_search ON public.contacts USING gin (
  to_tsvector('spanish', 
    COALESCE(name, '') || ' ' || 
    COALESCE(stage_name, '') || ' ' || 
    COALESCE(legal_name, '') || ' ' ||
    COALESCE(role, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(category, '')
  )
);

-- Create index for categories and cities
CREATE INDEX IF NOT EXISTS idx_contacts_category ON public.contacts (category);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON public.contacts (city);

-- Function to generate public slug
CREATE OR REPLACE FUNCTION public.generate_contact_slug()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  slug_text text;
BEGIN
  slug_text := substring(gen_random_uuid()::text from 1 for 12);
  RETURN slug_text;
END;
$$;

-- Trigger to generate slug when contact is made public
CREATE OR REPLACE FUNCTION public.update_contact_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_public = true AND NEW.public_slug IS NULL THEN
    NEW.public_slug := generate_contact_slug();
  ELSIF NEW.is_public = false THEN
    NEW.public_slug := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_contact_slug ON public.contacts;
CREATE TRIGGER trigger_update_contact_slug
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_slug();