-- Add sort_order column for drag-and-drop ordering
ALTER TABLE track_credits 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Initialize sort_order based on creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY track_id ORDER BY created_at) as rn
  FROM track_credits
)
UPDATE track_credits tc
SET sort_order = numbered.rn
FROM numbered
WHERE tc.id = numbered.id;