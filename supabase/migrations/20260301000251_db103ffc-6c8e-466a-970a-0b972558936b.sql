
-- Create cobros table for all income tracking (non-booking and manual entries)
CREATE TABLE public.cobros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'otro' CHECK (type IN ('booking', 'royalty', 'sync', 'subvencion', 'beca', 'otro')),
  concept TEXT NOT NULL,
  amount_gross NUMERIC NOT NULL DEFAULT 0,
  irpf_pct NUMERIC NOT NULL DEFAULT 0,
  amount_net NUMERIC GENERATED ALWAYS AS (amount_gross - (amount_gross * irpf_pct / 100)) STORED,
  expected_date DATE,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'cobrado', 'vencido', 'parcial')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can CRUD (workspace-level access like other tables)
CREATE POLICY "Authenticated users can view cobros" ON public.cobros
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cobros" ON public.cobros
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update cobros" ON public.cobros
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete cobros" ON public.cobros
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Index for common queries
CREATE INDEX idx_cobros_artist_id ON public.cobros(artist_id);
CREATE INDEX idx_cobros_status ON public.cobros(status);
CREATE INDEX idx_cobros_type ON public.cobros(type);
CREATE INDEX idx_cobros_expected_date ON public.cobros(expected_date);

-- Auto-update updated_at
CREATE TRIGGER update_cobros_updated_at
  BEFORE UPDATE ON public.cobros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_index_updated_at();
