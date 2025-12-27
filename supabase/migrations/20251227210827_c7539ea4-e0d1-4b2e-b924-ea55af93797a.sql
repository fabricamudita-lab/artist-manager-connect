-- Rename fee columns in booking_products table to national/international
ALTER TABLE public.booking_products 
RENAME COLUMN fee_min TO fee_national;

ALTER TABLE public.booking_products 
RENAME COLUMN fee_max TO fee_international;

COMMENT ON COLUMN public.booking_products.fee_national IS 'Tarifa nacional del formato';
COMMENT ON COLUMN public.booking_products.fee_international IS 'Tarifa internacional del formato';