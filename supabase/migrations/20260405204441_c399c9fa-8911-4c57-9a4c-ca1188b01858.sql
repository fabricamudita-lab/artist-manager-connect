ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS secondary_genre text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS production_year smallint;