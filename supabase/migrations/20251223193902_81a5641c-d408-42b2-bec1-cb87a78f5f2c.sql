-- Add tags column to contacts table for flexible labeling
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];

-- Create index for efficient tag searching
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN(tags);