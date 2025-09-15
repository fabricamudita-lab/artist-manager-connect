-- Add sort_order column to budget_categories table
ALTER TABLE public.budget_categories 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Update existing categories to have sequential sort_order values
UPDATE public.budget_categories 
SET sort_order = (
  SELECT ROW_NUMBER() OVER (PARTITION BY created_by ORDER BY created_at) - 1
  FROM public.budget_categories bc2 
  WHERE bc2.id = budget_categories.id
);