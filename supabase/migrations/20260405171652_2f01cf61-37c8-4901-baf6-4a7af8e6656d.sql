ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS c_copyright_holder text,
  ADD COLUMN IF NOT EXISTS c_copyright_year smallint,
  ADD COLUMN IF NOT EXISTS p_copyright_holder text,
  ADD COLUMN IF NOT EXISTS p_production_year smallint;