
-- Create junction table for many-to-many budget <-> release
CREATE TABLE public.budget_release_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(budget_id, release_id)
);

-- Enable RLS
ALTER TABLE public.budget_release_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage links
CREATE POLICY "Authenticated users can view budget_release_links"
  ON public.budget_release_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert budget_release_links"
  ON public.budget_release_links FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete budget_release_links"
  ON public.budget_release_links FOR DELETE TO authenticated USING (true);

-- Migrate existing data: create a link for every budget that has a release_id
INSERT INTO public.budget_release_links (budget_id, release_id)
SELECT id, release_id FROM public.budgets WHERE release_id IS NOT NULL
ON CONFLICT DO NOTHING;
