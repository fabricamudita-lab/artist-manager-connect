-- Add partial payment tracking fields to booking_offers
ALTER TABLE public.booking_offers
  ADD COLUMN IF NOT EXISTS anticipo_porcentaje DECIMAL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS anticipo_importe DECIMAL,
  ADD COLUMN IF NOT EXISTS anticipo_fecha_esperada DATE,
  ADD COLUMN IF NOT EXISTS anticipo_fecha_cobro DATE,
  ADD COLUMN IF NOT EXISTS anticipo_estado TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS anticipo_referencia TEXT,
  ADD COLUMN IF NOT EXISTS liquidacion_importe DECIMAL,
  ADD COLUMN IF NOT EXISTS liquidacion_fecha_esperada DATE,
  ADD COLUMN IF NOT EXISTS liquidacion_fecha_cobro DATE,
  ADD COLUMN IF NOT EXISTS liquidacion_estado TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS liquidacion_referencia TEXT,
  ADD COLUMN IF NOT EXISTS cobro_estado TEXT DEFAULT 'pendiente';

COMMENT ON COLUMN public.booking_offers.cobro_estado IS 'pendiente | anticipo_cobrado | cobrado_completo';
COMMENT ON COLUMN public.booking_offers.anticipo_estado IS 'pendiente | cobrado | no_aplica';
COMMENT ON COLUMN public.booking_offers.liquidacion_estado IS 'pendiente | cobrado | no_aplica';