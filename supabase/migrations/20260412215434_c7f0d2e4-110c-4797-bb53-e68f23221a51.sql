ALTER TABLE public.pitches
  ADD COLUMN IF NOT EXISTS future_planning text,
  ADD COLUMN IF NOT EXISTS vevo_content_type text,
  ADD COLUMN IF NOT EXISTS vevo_premiere_date date,
  ADD COLUMN IF NOT EXISTS vevo_is_new_edit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vevo_brand_notes text,
  ADD COLUMN IF NOT EXISTS vevo_link text;