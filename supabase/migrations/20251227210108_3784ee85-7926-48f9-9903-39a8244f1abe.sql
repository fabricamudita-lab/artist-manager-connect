-- Rename fee to fee_national and add fee_international column
ALTER TABLE public.booking_product_crew 
RENAME COLUMN fee TO fee_national;

ALTER TABLE public.booking_product_crew 
ADD COLUMN fee_international numeric DEFAULT NULL;

COMMENT ON COLUMN public.booking_product_crew.fee_national IS 'Tarifa nacional del miembro del equipo para este formato';
COMMENT ON COLUMN public.booking_product_crew.fee_international IS 'Tarifa internacional del miembro del equipo para este formato';