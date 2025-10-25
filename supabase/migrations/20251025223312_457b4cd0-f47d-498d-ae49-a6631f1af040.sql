-- Add parent_folder_id to budgets table to link budgets to project folders
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS parent_folder_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_budgets_parent_folder_id ON public.budgets(parent_folder_id);

-- Add comment to explain the column
COMMENT ON COLUMN public.budgets.parent_folder_id IS 'Links budget to a project folder for organization';