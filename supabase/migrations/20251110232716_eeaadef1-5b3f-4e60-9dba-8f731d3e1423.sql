-- Insert default booking template fields
-- First, get a valid user_id for created_by (using the first authenticated user as fallback)
DO $$
DECLARE
  default_user_id uuid;
BEGIN
  -- Get the first user from profiles table
  SELECT user_id INTO default_user_id FROM profiles LIMIT 1;
  
  -- Insert template fields with the found user_id
  INSERT INTO booking_template_config (field_name, field_label, field_type, field_order, is_required, is_active, created_by) VALUES
    ('fecha', 'Fecha', 'date', 1, true, true, default_user_id),
    ('festival_ciclo', 'Festival/Ciclo', 'text', 2, true, true, default_user_id),
    ('ciudad', 'Ciudad', 'text', 3, true, true, default_user_id),
    ('pais', 'País', 'text', 4, true, true, default_user_id),
    ('venue', 'Venue', 'text', 5, true, true, default_user_id),
    ('promotor', 'Promotor', 'text', 6, true, true, default_user_id),
    ('fee', 'Fee (€)', 'number', 7, false, true, default_user_id),
    ('formato', 'Formato', 'select', 8, false, true, default_user_id),
    ('estado', 'Estado', 'select', 9, true, true, default_user_id),
    ('contacto', 'Contacto', 'text', 10, false, true, default_user_id),
    ('capacidad', 'Capacidad', 'number', 11, false, true, default_user_id),
    ('hora', 'Hora', 'time', 12, false, true, default_user_id),
    ('gastos_estimados', 'Gastos Estimados (€)', 'number', 13, false, true, default_user_id),
    ('info_comentarios', 'Información/Comentarios', 'textarea', 14, false, true, default_user_id),
    ('condiciones', 'Condiciones', 'textarea', 15, false, true, default_user_id),
    ('link_venta', 'Link de Venta', 'url', 16, false, true, default_user_id);
END $$;