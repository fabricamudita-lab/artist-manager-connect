-- Update profiles table to support multiple roles
ALTER TABLE public.profiles 
DROP COLUMN role;

-- Add new role column as array
ALTER TABLE public.profiles 
ADD COLUMN roles user_role[] NOT NULL DEFAULT ARRAY['artist']::user_role[];

-- Update existing data to use array format
UPDATE public.profiles 
SET roles = ARRAY['management']::user_role[] 
WHERE email = 'davidsolans96@gmail.com';

-- Add active_role column to track currently selected role
ALTER TABLE public.profiles 
ADD COLUMN active_role user_role NOT NULL DEFAULT 'artist'::user_role;

-- Update active_role for existing management user
UPDATE public.profiles 
SET active_role = 'management'::user_role 
WHERE email = 'davidsolans96@gmail.com';