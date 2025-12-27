-- Add fee column to booking_product_crew table for individual member fees
ALTER TABLE public.booking_product_crew 
ADD COLUMN fee numeric DEFAULT NULL;

COMMENT ON COLUMN public.booking_product_crew.fee IS 'Caché individual del miembro del equipo para este formato';