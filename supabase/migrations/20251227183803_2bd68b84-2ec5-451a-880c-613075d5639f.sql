-- Update the specific booking to confirmado status
UPDATE public.booking_offers 
SET 
  estado = 'confirmado',
  phase = 'confirmado',
  updated_at = now()
WHERE id = '2190abb9-3881-4178-8b90-7aec3b7b7a34';