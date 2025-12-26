-- Expand allowed values for booking_offers.phase to match app usage
ALTER TABLE public.booking_offers
  DROP CONSTRAINT IF EXISTS booking_offers_phase_check;

ALTER TABLE public.booking_offers
  ALTER COLUMN phase SET DEFAULT 'interes';

ALTER TABLE public.booking_offers
  ADD CONSTRAINT booking_offers_phase_check
  CHECK (
    phase = ANY (
      ARRAY[
        -- current app phases
        'interes'::text,
        'oferta'::text,
        'negociacion'::text,
        'confirmado'::text,
        'facturado'::text,
        'cerrado'::text,
        'cancelado'::text,
        -- legacy/alt phases
        'lead'::text,
        'oferta_enviada'::text,
        'contratado'::text,
        'cerrado_perdido'::text
      ]
    )
  );