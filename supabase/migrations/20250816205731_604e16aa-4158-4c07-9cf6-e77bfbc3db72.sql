-- Add missing template fields for booking offers
INSERT INTO public.booking_template_config (field_name, field_label, field_type, field_order, is_required, is_active, created_by)
VALUES 
  ('condiciones', 'Condiciones', 'textarea', 12, false, true, '00000000-0000-0000-0000-000000000000'),
  ('link_venta', 'Link de venta', 'url', 13, false, true, '00000000-0000-0000-0000-000000000000'),
  ('inicio_venta', 'Inicio venta', 'date', 14, false, true, '00000000-0000-0000-0000-000000000000'),
  ('contratos', 'Contratos', 'text', 15, false, true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (field_name) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  field_order = EXCLUDED.field_order,
  is_active = EXCLUDED.is_active;