-- Add irpf_percentage column to budget_items table
ALTER TABLE budget_items ADD COLUMN irpf_percentage NUMERIC DEFAULT 15;

-- Update existing records to have the default value
UPDATE budget_items SET irpf_percentage = 15 WHERE irpf_percentage IS NULL;