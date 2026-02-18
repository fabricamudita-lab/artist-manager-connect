ALTER TABLE public.budgets ADD COLUMN release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL;
CREATE INDEX idx_budgets_release_id ON public.budgets(release_id);