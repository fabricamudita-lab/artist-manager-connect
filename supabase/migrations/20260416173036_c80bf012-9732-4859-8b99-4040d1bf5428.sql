
ALTER TABLE public.contact_form_tokens 
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- Backfill from creator's profile
UPDATE public.contact_form_tokens cft
SET workspace_id = p.workspace_id
FROM public.profiles p
WHERE p.user_id = cft.created_by
  AND cft.workspace_id IS NULL;
