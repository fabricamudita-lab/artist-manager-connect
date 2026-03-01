-- Fix existing records where liquidacion_fecha_esperada equals the event date
-- Set it to event_date + 7 days instead
UPDATE booking_offers
SET liquidacion_fecha_esperada = (fecha::date + interval '7 days')::date
WHERE liquidacion_fecha_esperada = fecha::date
AND anticipo_importe IS NOT NULL;

-- Also fix anticipo_fecha_esperada where it was left null or equals event date
-- Set it to event_date - 30 days
UPDATE booking_offers
SET anticipo_fecha_esperada = (fecha::date - interval '30 days')::date
WHERE (anticipo_fecha_esperada IS NULL OR anticipo_fecha_esperada = fecha::date)
AND anticipo_importe IS NOT NULL
AND fecha IS NOT NULL;