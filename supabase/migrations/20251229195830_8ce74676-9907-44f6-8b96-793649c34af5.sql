-- First, drop the existing foreign key constraint
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_artist_id_fkey;

-- Add the new foreign key constraint pointing to artists table
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_artist_id_fkey 
FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;