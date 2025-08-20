-- Create checklist templates table
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist template items table
CREATE TABLE public.checklist_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  section TEXT NOT NULL,
  task TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

-- Create foreign key relationships
ALTER TABLE public.checklist_template_items 
ADD CONSTRAINT fk_checklist_template_items_template_id 
FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE;

-- RLS policies for checklist_templates
CREATE POLICY "Users can view system templates"
ON public.checklist_templates
FOR SELECT
USING (is_system_template = true);

CREATE POLICY "Users can view templates in their workspace"
ON public.checklist_templates
FOR SELECT
USING (
  workspace_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM workspace_memberships wm
    WHERE wm.workspace_id = checklist_templates.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own personal templates"
ON public.checklist_templates
FOR SELECT
USING (workspace_id IS NULL AND created_by = auth.uid());

CREATE POLICY "Users can create personal templates"
ON public.checklist_templates
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  (workspace_id IS NULL OR EXISTS (
    SELECT 1 FROM workspace_memberships wm
    WHERE wm.workspace_id = checklist_templates.workspace_id
    AND wm.user_id = auth.uid()
  ))
);

CREATE POLICY "Workspace managers can create workspace templates"
ON public.checklist_templates
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  workspace_id IS NOT NULL AND
  user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'::workspace_role)
);

CREATE POLICY "Template creators can update their templates"
ON public.checklist_templates
FOR UPDATE
USING (created_by = auth.uid() AND is_system_template = false);

CREATE POLICY "Template creators can delete their templates"
ON public.checklist_templates
FOR DELETE
USING (created_by = auth.uid() AND is_system_template = false);

-- RLS policies for checklist_template_items
CREATE POLICY "Users can view template items if they can view the template"
ON public.checklist_template_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM checklist_templates ct
    WHERE ct.id = checklist_template_items.template_id
    AND (
      ct.is_system_template = true OR
      ct.created_by = auth.uid() OR
      (ct.workspace_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM workspace_memberships wm
        WHERE wm.workspace_id = ct.workspace_id
        AND wm.user_id = auth.uid()
      ))
    )
  )
);

CREATE POLICY "Users can create template items for their templates"
ON public.checklist_template_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM checklist_templates ct
    WHERE ct.id = checklist_template_items.template_id
    AND ct.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update template items for their templates"
ON public.checklist_template_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM checklist_templates ct
    WHERE ct.id = checklist_template_items.template_id
    AND ct.created_by = auth.uid()
    AND ct.is_system_template = false
  )
);

CREATE POLICY "Users can delete template items for their templates"
ON public.checklist_template_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM checklist_templates ct
    WHERE ct.id = checklist_template_items.template_id
    AND ct.created_by = auth.uid()
    AND ct.is_system_template = false
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert system templates
INSERT INTO public.checklist_templates (name, description, is_system_template, created_by) VALUES
('Concierto', 'Plantilla para organización de conciertos y presentaciones en vivo', true, '00000000-0000-0000-0000-000000000000'),
('Videoclip', 'Plantilla para producción y postproducción de videoclips', true, '00000000-0000-0000-0000-000000000000'),
('Prensa', 'Plantilla para gestión de actividades de prensa y medios', true, '00000000-0000-0000-0000-000000000000'),
('Single', 'Plantilla para lanzamiento de singles', true, '00000000-0000-0000-0000-000000000000'),
('Reunión mensual', 'Plantilla para reuniones mensuales de seguimiento', true, '00000000-0000-0000-0000-000000000000'),
('Pagos', 'Plantilla para gestión de pagos y facturación', true, '00000000-0000-0000-0000-000000000000');

-- Insert template items for Concierto
INSERT INTO public.checklist_template_items (template_id, section, task, sort_order) VALUES
((SELECT id FROM checklist_templates WHERE name = 'Concierto'), 'PREPARATIVOS', 'Confirmar fecha y horario del concierto', 1),
((SELECT id FROM checklist_templates WHERE name = 'Concierto'), 'PREPARATIVOS', 'Reservar sala de ensayo', 2),
((SELECT id FROM checklist_templates WHERE name = 'Concierto'), 'TECNICO', 'Revisar rider técnico del venue', 3),
((SELECT id FROM checklist_templates WHERE name = 'Concierto'), 'TECNICO', 'Soundcheck y prueba de sonido', 4),
((SELECT id FROM checklist_templates WHERE name = 'Concierto'), 'PROMOCION', 'Publicar en redes sociales', 5);

-- Insert template items for Videoclip
INSERT INTO public.checklist_template_items (template_id, section, task, sort_order) VALUES
((SELECT id FROM checklist_templates WHERE name = 'Videoclip'), 'PREPRODUCCION', 'Desarrollo del concepto y guión', 1),
((SELECT id FROM checklist_templates WHERE name = 'Videoclip'), 'PREPRODUCCION', 'Selección de locaciones', 2),
((SELECT id FROM checklist_templates WHERE name = 'Videoclip'), 'PRODUCCION', 'Grabación del videoclip', 3),
((SELECT id FROM checklist_templates WHERE name = 'Videoclip'), 'POSTPRODUCCION', 'Edición y color grading', 4),
((SELECT id FROM checklist_templates WHERE name = 'Videoclip'), 'POSTPRODUCCION', 'Entrega de material final', 5);

-- Insert template items for Prensa
INSERT INTO public.checklist_template_items (template_id, section, task, sort_order) VALUES
((SELECT id FROM checklist_templates WHERE name = 'Prensa'), 'PLANIFICACION', 'Crear lista de medios objetivo', 1),
((SELECT id FROM checklist_templates WHERE name = 'Prensa'), 'PLANIFICACION', 'Preparar kit de prensa', 2),
((SELECT id FROM checklist_templates WHERE name = 'Prensa'), 'EJECUCION', 'Envío de notas de prensa', 3),
((SELECT id FROM checklist_templates WHERE name = 'Prensa'), 'SEGUIMIENTO', 'Follow-up con periodistas', 4);

-- Insert template items for Single
INSERT INTO public.checklist_template_items (template_id, section, task, sort_order) VALUES
((SELECT id FROM checklist_templates WHERE name = 'Single'), 'LANZAMIENTO', 'Subir single a plataformas digitales', 1),
((SELECT id FROM checklist_templates WHERE name = 'Single'), 'LANZAMIENTO', 'Crear campaña de marketing', 2),
((SELECT id FROM checklist_templates WHERE name = 'Single'), 'PROMOCION', 'Coordinar entrevistas de radio', 3);

-- Insert template items for Reunión mensual
INSERT INTO public.checklist_template_items (template_id, section, task, sort_order) VALUES
((SELECT id FROM checklist_templates WHERE name = 'Reunión mensual'), 'PREPARACION', 'Revisar objetivos del mes anterior', 1),
((SELECT id FROM checklist_templates WHERE name = 'Reunión mensual'), 'PREPARACION', 'Preparar agenda de reunión', 2),
((SELECT id FROM checklist_templates WHERE name = 'Reunión mensual'), 'SEGUIMIENTO', 'Definir próximos pasos', 3);

-- Insert template items for Pagos
INSERT INTO public.checklist_template_items (template_id, section, task, sort_order) VALUES
((SELECT id FROM checklist_templates WHERE name = 'Pagos'), 'FACTURACION', 'Revisar facturas pendientes', 1),
((SELECT id FROM checklist_templates WHERE name = 'Pagos'), 'FACTURACION', 'Procesar pagos mensuales', 2),
((SELECT id FROM checklist_templates WHERE name = 'Pagos'), 'SEGUIMIENTO', 'Reconciliar cuentas', 3);