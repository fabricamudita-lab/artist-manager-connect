ALTER TABLE release_milestones
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;