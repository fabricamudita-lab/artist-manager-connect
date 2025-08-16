-- Add missing template fields for booking offers
INSERT INTO public.booking_template_config (field_name, field_label, field_type, field_order, is_required, is_active, created_by)
SELECT field_name, field_label, field_type, field_order, is_required, is_active, created_by::uuid
FROM (VALUES 
  ('condiciones', 'Condiciones', 'textarea', 12, false, true, '00000000-0000-0000-0000-000000000000'),
  ('link_venta', 'Link de venta', 'url', 13, false, true, '00000000-0000-0000-0000-000000000000'),
  ('inicio_venta', 'Inicio venta', 'date', 14, false, true, '00000000-0000-0000-0000-000000000000'),
  ('contratos', 'Contratos', 'text', 15, false, true, '00000000-0000-0000-0000-000000000000')
) AS new_fields(field_name, field_label, field_type, field_order, is_required, is_active, created_by)
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_template_config btc 
  WHERE btc.field_name = new_fields.field_name
);