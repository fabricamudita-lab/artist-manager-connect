-- Create the budget for the existing M00DITA booking that was confirmed before the trigger
INSERT INTO public.budgets (
  name,
  type,
  artist_id,
  event_date,
  event_time,
  city,
  venue,
  fee,
  created_by
)
SELECT
  'Presupuesto - M00DITA',
  'concierto',
  (SELECT id FROM public.profiles WHERE id = bo.artist_id LIMIT 1),
  bo.fecha,
  bo.hora,
  bo.ciudad,
  COALESCE(bo.lugar, bo.venue),
  bo.fee,
  bo.created_by
FROM public.booking_offers bo
WHERE bo.id = '2190abb9-3881-4178-8b90-7aec3b7b7a34'
AND NOT EXISTS (
  SELECT 1 FROM public.budgets b WHERE b.name LIKE '%M00DITA%'
);

-- Update the Presupuesto folder metadata to reference the budget
UPDATE public.storage_nodes
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{budget_name}',
  '"Presupuesto - M00DITA"'
)
WHERE id = '94e74e29-a052-4252-89ae-17a3acf0f130';