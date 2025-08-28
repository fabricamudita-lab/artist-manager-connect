-- Add section field to project_checklist_items table
ALTER TABLE public.project_checklist_items 
ADD COLUMN section TEXT DEFAULT 'SIN CATEGORIA';

-- Create index for better filtering performance
CREATE INDEX idx_project_checklist_items_section ON public.project_checklist_items(section);

-- Update existing items to have 'SIN CATEGORIA' as default section
UPDATE public.project_checklist_items 
SET section = 'SIN CATEGORIA' 
WHERE section IS NULL;