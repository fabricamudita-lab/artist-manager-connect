-- Añadir nuevos campos que faltan
ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS duracion text,
ADD COLUMN IF NOT EXISTS pvp numeric,
ADD COLUMN IF NOT EXISTS invitaciones integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS publico text,
ADD COLUMN IF NOT EXISTS logistica text;

-- Comentarios para documentar el mapeo de campos
COMMENT ON COLUMN public.booking_offers.festival_ciclo IS 'FESTIVAL / CICLO';
COMMENT ON COLUMN public.booking_offers.fecha IS 'FECHA';
COMMENT ON COLUMN public.booking_offers.hora IS 'HORA';
COMMENT ON COLUMN public.booking_offers.ciudad IS 'CIUDAD';
COMMENT ON COLUMN public.booking_offers.lugar IS 'LUGAR';
COMMENT ON COLUMN public.booking_offers.capacidad IS 'CAPACIDAD';
COMMENT ON COLUMN public.booking_offers.duracion IS 'DURACIÓN';
COMMENT ON COLUMN public.booking_offers.fee IS 'OFERTA (€)';
COMMENT ON COLUMN public.booking_offers.estado IS 'STATUS';
COMMENT ON COLUMN public.booking_offers.formato IS 'FORMATO';
COMMENT ON COLUMN public.booking_offers.pvp IS 'PVP';
COMMENT ON COLUMN public.booking_offers.contacto IS 'CONTACTO';
COMMENT ON COLUMN public.booking_offers.invitaciones IS 'INVITACIONES';
COMMENT ON COLUMN public.booking_offers.inicio_venta IS 'INICIO VENTA';
COMMENT ON COLUMN public.booking_offers.link_venta IS 'LINK DE VENTA';
COMMENT ON COLUMN public.booking_offers.publico IS 'PÚBLICO';
COMMENT ON COLUMN public.booking_offers.logistica IS 'LOGÍSTICA';
COMMENT ON COLUMN public.booking_offers.notas IS 'COMENTARIOS';
COMMENT ON COLUMN public.booking_offers.contratos IS 'CONTRATO';