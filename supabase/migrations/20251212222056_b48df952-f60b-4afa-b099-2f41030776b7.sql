-- Add 'anunciado' (announced) flag to booking_offers for public tour display
ALTER TABLE public.booking_offers
ADD COLUMN IF NOT EXISTS anunciado boolean DEFAULT false;

-- Add 'es_privado' (is_private) flag to hide events from public views
ALTER TABLE public.booking_offers
ADD COLUMN IF NOT EXISTS es_privado boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.booking_offers.anunciado IS 'If true, this event can appear on public EPK tour section';
COMMENT ON COLUMN public.booking_offers.es_privado IS 'If true, this event is hidden from all public views';