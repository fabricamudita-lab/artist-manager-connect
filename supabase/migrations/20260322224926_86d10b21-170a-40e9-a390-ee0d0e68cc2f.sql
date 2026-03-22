CREATE TABLE public.custom_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.custom_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read custom instruments"
  ON public.custom_instruments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert custom instruments"
  ON public.custom_instruments FOR INSERT
  TO authenticated
  WITH CHECK (true);