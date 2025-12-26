-- Add columns for subfolders, public sharing, and booking linking to artist_files
ALTER TABLE public.artist_files 
ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS public_expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.booking_offers(id) ON DELETE SET NULL;

-- Create index for public token lookups
CREATE INDEX IF NOT EXISTS idx_artist_files_public_token ON public.artist_files(public_token) WHERE public_token IS NOT NULL;

-- Create index for booking_id lookups
CREATE INDEX IF NOT EXISTS idx_artist_files_booking_id ON public.artist_files(booking_id) WHERE booking_id IS NOT NULL;

-- Create a table for artist subfolders
CREATE TABLE IF NOT EXISTS public.artist_subfolders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  booking_id uuid REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(artist_id, category, name)
);

-- Enable RLS on subfolders
ALTER TABLE public.artist_subfolders ENABLE ROW LEVEL SECURITY;

-- RLS policies for subfolders
CREATE POLICY "Users can view subfolders" 
ON public.artist_subfolders 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create subfolders" 
ON public.artist_subfolders 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update subfolders" 
ON public.artist_subfolders 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete subfolders" 
ON public.artist_subfolders 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Allow public access to files with valid public_token
CREATE POLICY "Anyone can view files with valid public token" 
ON public.artist_files 
FOR SELECT 
USING (
  public_token IS NOT NULL 
  AND (public_expires_at IS NULL OR public_expires_at > now())
);

-- Update trigger for subfolders
CREATE TRIGGER update_artist_subfolders_updated_at
  BEFORE UPDATE ON public.artist_subfolders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();