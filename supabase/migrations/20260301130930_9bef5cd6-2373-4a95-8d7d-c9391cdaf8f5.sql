-- Add cobro tracking fields to booking_offers
ALTER TABLE public.booking_offers
ADD COLUMN IF NOT EXISTS cobro_fecha date,
ADD COLUMN IF NOT EXISTS cobro_importe decimal,
ADD COLUMN IF NOT EXISTS cobro_metodo text,
ADD COLUMN IF NOT EXISTS cobro_referencia text,
ADD COLUMN IF NOT EXISTS cobro_notas text;