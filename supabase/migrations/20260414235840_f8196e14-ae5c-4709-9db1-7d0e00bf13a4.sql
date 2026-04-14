ALTER TABLE contract_drafts
  ADD COLUMN IF NOT EXISTS producer_email TEXT,
  ADD COLUMN IF NOT EXISTS collaborator_email TEXT;