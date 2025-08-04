-- Add phone field to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS team_contacts TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Update the requests table to support editing functionality
ALTER TABLE public.requests 
ALTER COLUMN status SET DEFAULT 'pending';