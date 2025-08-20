-- Add contact_id column to project_team table to support external contacts
ALTER TABLE public.project_team 
ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Make profile_id nullable since we can now have either profile_id OR contact_id
ALTER TABLE public.project_team 
ALTER COLUMN profile_id DROP NOT NULL;

-- Add constraint to ensure either profile_id or contact_id is set, but not both
ALTER TABLE public.project_team 
ADD CONSTRAINT check_profile_or_contact 
CHECK (
  (profile_id IS NOT NULL AND contact_id IS NULL) OR 
  (profile_id IS NULL AND contact_id IS NOT NULL)
);