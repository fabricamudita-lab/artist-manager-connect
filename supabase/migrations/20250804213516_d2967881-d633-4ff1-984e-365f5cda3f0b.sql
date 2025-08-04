-- Agregar foreign key constraint entre budgets.artist_id y profiles.id
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_artist_id_fkey 
FOREIGN KEY (artist_id) REFERENCES public.profiles(id);

-- Agregar foreign key constraint entre budgets.created_by y profiles.user_id  
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);