
-- Liquidaciones table: payments to artists/collaborators
CREATE TABLE public.liquidaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  concepto TEXT NOT NULL,
  cache_bruto NUMERIC NOT NULL DEFAULT 0,
  irpf_pct NUMERIC NOT NULL DEFAULT 15,
  irpf_amount NUMERIC GENERATED ALWAYS AS (cache_bruto * irpf_pct / 100) STORED,
  neto_a_transferir NUMERIC GENERATED ALWAYS AS (cache_bruto - (cache_bruto * irpf_pct / 100)) STORED,
  fecha_pago DATE,
  metodo_pago TEXT DEFAULT 'transferencia',
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'transferido', 'parcial')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage liquidaciones"
  ON public.liquidaciones FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_liquidaciones_workspace ON public.liquidaciones(workspace_id);
CREATE INDEX idx_liquidaciones_artist ON public.liquidaciones(artist_id);
CREATE INDEX idx_liquidaciones_status ON public.liquidaciones(status);

-- Updated_at trigger
CREATE TRIGGER set_liquidaciones_updated_at
  BEFORE UPDATE ON public.liquidaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_solicitudes_updated_at();
