ALTER TABLE public.budget_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Initialize sort_order based on created_at order within each budget
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY budget_id ORDER BY created_at) - 1 AS rn
  FROM public.budget_items
)
UPDATE public.budget_items bi
SET sort_order = ranked.rn
FROM ranked
WHERE bi.id = ranked.id;