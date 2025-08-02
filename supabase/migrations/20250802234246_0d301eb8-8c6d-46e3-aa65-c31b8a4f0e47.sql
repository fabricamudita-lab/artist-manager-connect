-- Create a test artist profile to demonstrate the functionality
-- First, create a test user in auth.users (this would normally be done through signup)
-- Note: In a real scenario, this would be done through the signup process

-- Insert a test profile for an artist
INSERT INTO public.profiles (id, user_id, email, full_name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  gen_random_uuid(), -- This would be the actual user_id from auth.users in real scenario
  'artista.prueba@ejemplo.com',
  'María González',
  'artist',
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;