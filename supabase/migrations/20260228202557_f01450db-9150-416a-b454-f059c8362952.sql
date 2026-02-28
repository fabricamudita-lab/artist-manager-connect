
CREATE TABLE public.irpf_retentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  budget_id UUID REFERENCES public.budgets(id),
  budget_item_id UUID REFERENCES public.budget_items(id),
  provider_name TEXT NOT NULL,
  provider_nif TEXT,
  concepto TEXT NOT NULL,
  base_imponible NUMERIC NOT NULL DEFAULT 0,
  irpf_percentage NUMERIC NOT NULL DEFAULT 15,
  importe_retenido NUMERIC NOT NULL DEFAULT 0,
  fecha_pago DATE,
  trimestre TEXT NOT NULL,
  ejercicio INTEGER NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.irpf_quarter_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) NOT NULL,
  ejercicio INTEGER NOT NULL,
  trimestre TEXT NOT NULL,
  presentado BOOLEAN NOT NULL DEFAULT false,
  fecha_presentacion TIMESTAMP WITH TIME ZONE,
  presentado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, ejercicio, trimestre)
);

ALTER TABLE public.irpf_retentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irpf_quarter_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view retentions in their workspace" ON public.irpf_retentions
  FOR SELECT USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Users can insert retentions in their workspace" ON public.irpf_retentions
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Users can update retentions in their workspace" ON public.irpf_retentions
  FOR UPDATE USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Users can delete retentions in their workspace" ON public.irpf_retentions
  FOR DELETE USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Users can view quarter status in their workspace" ON public.irpf_quarter_status
  FOR SELECT USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Users can manage quarter status in their workspace" ON public.irpf_quarter_status
  FOR ALL USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm WHERE wm.user_id = auth.uid())
  );
