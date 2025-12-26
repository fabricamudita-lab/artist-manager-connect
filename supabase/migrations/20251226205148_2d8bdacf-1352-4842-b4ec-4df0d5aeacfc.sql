-- Create join table for booking products and crew members
CREATE TABLE public.booking_product_crew (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_product_id UUID NOT NULL REFERENCES public.booking_products(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL, -- Can be either a user_id (workspace member) or contact_id
  member_type TEXT NOT NULL CHECK (member_type IN ('workspace', 'contact')),
  role_label TEXT, -- Optional label like "Guitarra", "Técnico de sonido"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_product_crew ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view crew for products they have access to"
ON public.booking_product_crew FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_products bp
    JOIN public.artists a ON bp.artist_id = a.id
    WHERE bp.id = booking_product_id
    AND a.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert crew for products they own"
ON public.booking_product_crew FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booking_products bp
    JOIN public.artists a ON bp.artist_id = a.id
    WHERE bp.id = booking_product_id
    AND a.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete crew for products they own"
ON public.booking_product_crew FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.booking_products bp
    JOIN public.artists a ON bp.artist_id = a.id
    WHERE bp.id = booking_product_id
    AND a.created_by = auth.uid()
  )
);

-- Index for faster queries
CREATE INDEX idx_booking_product_crew_product ON public.booking_product_crew(booking_product_id);