
ALTER TABLE public.contract_draft_comments
  ADD COLUMN IF NOT EXISTS selected_text TEXT,
  ADD COLUMN IF NOT EXISTS clause_number TEXT,
  ADD COLUMN IF NOT EXISTS selection_start INTEGER,
  ADD COLUMN IF NOT EXISTS selection_end INTEGER,
  ADD COLUMN IF NOT EXISTS proposed_change TEXT,
  ADD COLUMN IF NOT EXISTS comment_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS approved_by_producer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by_collaborator BOOLEAN NOT NULL DEFAULT false;
