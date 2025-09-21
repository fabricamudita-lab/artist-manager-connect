-- Add is_test_user flag to profiles table for safe cleanup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT FALSE;

-- Create index for efficient test user queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_test_user 
ON public.profiles(is_test_user) 
WHERE is_test_user = true;

-- Add some helper data for test users if not exists

-- Ensure workspace exists for test users
INSERT INTO public.workspaces (id, name, description, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Demo Workspace',
  'Workspace for demo and test users',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create Rita Payés artist profile if not exists
INSERT INTO public.profiles (id, user_id, email, full_name, roles, active_role, workspace_id, is_test_user, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'rita.payes@demo.com',
  'Rita Payés',
  ARRAY['artist']::text[],
  'artist',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  true,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create demo projects if not exist
INSERT INTO public.projects (id, name, description, artist_id, workspace_id, created_at, updated_at)
VALUES 
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Gira 2025',
    'European tour for summer 2025',
    '11111111-1111-1111-1111-111111111111'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'Campaña PR',
    'Marketing campaign for new album',
    '11111111-1111-1111-1111-111111111111'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;