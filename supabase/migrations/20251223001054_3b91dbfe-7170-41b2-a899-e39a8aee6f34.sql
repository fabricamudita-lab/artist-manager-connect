-- Add web field to profiles for automations
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS web text;

-- Add group_type to contact_groups to distinguish group purposes
ALTER TABLE public.contact_groups
ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'general';

-- Add icon to contact_groups for better visual distinction
ALTER TABLE public.contact_groups
ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Users';

-- Comment to explain group_type values
COMMENT ON COLUMN public.contact_groups.group_type IS 'Type of group: general, banda, sello, management, tecnico, artistico, prensa, legal, produccion';