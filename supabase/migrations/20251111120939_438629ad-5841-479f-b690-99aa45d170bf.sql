-- Insert default booking status options
DO $$
DECLARE
  default_user_id uuid;
BEGIN
  -- Get a default user id (first user in profiles table)
  SELECT user_id INTO default_user_id FROM profiles LIMIT 1;
  
  -- Insert the status options if they don't exist
  INSERT INTO booking_status_options (status_value, is_default, created_by)
  SELECT 'oferta', true, default_user_id
  WHERE NOT EXISTS (SELECT 1 FROM booking_status_options WHERE status_value = 'oferta');
  
  INSERT INTO booking_status_options (status_value, is_default, created_by)
  SELECT 'interest', true, default_user_id
  WHERE NOT EXISTS (SELECT 1 FROM booking_status_options WHERE status_value = 'interest');
  
  INSERT INTO booking_status_options (status_value, is_default, created_by)
  SELECT 'confirmado', true, default_user_id
  WHERE NOT EXISTS (SELECT 1 FROM booking_status_options WHERE status_value = 'confirmado');
  
  INSERT INTO booking_status_options (status_value, is_default, created_by)
  SELECT 'promocion', true, default_user_id
  WHERE NOT EXISTS (SELECT 1 FROM booking_status_options WHERE status_value = 'promocion');
  
  INSERT INTO booking_status_options (status_value, is_default, created_by)
  SELECT 'cancelado', true, default_user_id
  WHERE NOT EXISTS (SELECT 1 FROM booking_status_options WHERE status_value = 'cancelado');
END $$;