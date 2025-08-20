-- Create due_anchor enum
CREATE TYPE public.due_anchor AS ENUM (
  'SHOW_DAY',
  'PRESS_LAUNCH', 
  'SHOOT_DAY',
  'PUBLISH_DAY',
  'RELEASE_DAY',
  'MEETING_DAY',
  'PAYRUN_DAY'
);

-- Create checklist_templates table
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspace_memberships(workspace_id),
  name TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description TEXT,
  description_es TEXT,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist_template_items table  
CREATE TABLE public.checklist_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  section_es TEXT NOT NULL,
  task TEXT NOT NULL,
  task_es TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  due_anchor public.due_anchor,
  due_days_offset INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklist_templates
CREATE POLICY "Users can view system templates and their own templates"
ON public.checklist_templates
FOR SELECT 
USING (
  is_system_template = true OR 
  created_by = auth.uid() OR
  (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_memberships wm 
    WHERE wm.workspace_id = checklist_templates.workspace_id 
    AND wm.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create personal templates"
ON public.checklist_templates
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND (
    workspace_id IS NULL OR
    EXISTS (
      SELECT 1 FROM workspace_memberships wm 
      WHERE wm.workspace_id = checklist_templates.workspace_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('OWNER', 'TEAM_MANAGER')
    )
  )
);

CREATE POLICY "Users can update their own templates"
ON public.checklist_templates
FOR UPDATE
USING (
  created_by = auth.uid() AND is_system_template = false
);

CREATE POLICY "Users can delete their own templates"
ON public.checklist_templates
FOR DELETE
USING (
  created_by = auth.uid() AND is_system_template = false
);

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

-- Create indexes
CREATE INDEX idx_checklist_templates_workspace_id ON public.checklist_templates(workspace_id);
CREATE INDEX idx_checklist_templates_created_by ON public.checklist_templates(created_by);
CREATE INDEX idx_checklist_template_items_template_id ON public.checklist_template_items(template_id);
CREATE INDEX idx_checklist_template_items_sort_order ON public.checklist_template_items(template_id, sort_order);

-- Insert system templates
INSERT INTO public.checklist_templates (name, name_es, description, description_es, is_system_template, created_by) VALUES
('Concert', 'Concierto', 'Standard concert preparation checklist', 'Lista de preparación estándar para conciertos', true, '00000000-0000-0000-0000-000000000000'),
('Music Video', 'Videoclip', 'Music video production checklist', 'Lista de producción de videoclip musical', true, '00000000-0000-0000-0000-000000000000'),
('Press', 'Prensa', 'Press and media campaign checklist', 'Lista de campaña de prensa y medios', true, '00000000-0000-0000-0000-000000000000'),
('Single Release', 'Lanzamiento Single', 'Single release campaign checklist', 'Lista de campaña de lanzamiento de single', true, '00000000-0000-0000-0000-000000000000'),
('Monthly Meeting', 'Reunión Mensual', 'Monthly team meeting preparation', 'Preparación de reunión mensual del equipo', true, '00000000-0000-0000-0000-000000000000'),
('Payments', 'Pagos', 'Payment processing checklist', 'Lista de procesamiento de pagos', true, '00000000-0000-0000-0000-000000000000');

-- Insert template items for Concert
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset) 
SELECT t.id, 'PREPARATION', 'PREPARATIVOS', 'Book venue and confirm date', 'Reservar venue y confirmar fecha', 0, 'SHOW_DAY', -30
FROM checklist_templates t WHERE t.name = 'Concert';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATION', 'PREPARATIVOS', 'Arrange transportation and accommodation', 'Organizar transporte y alojamiento', 1, 'SHOW_DAY', -7
FROM checklist_templates t WHERE t.name = 'Concert';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'TECHNICAL', 'TÉCNICO', 'Sound check and rehearsal', 'Prueba de sonido y ensayo', 2, 'SHOW_DAY', 0
FROM checklist_templates t WHERE t.name = 'Concert';

-- Insert template items for Music Video
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PRE-PRODUCTION', 'PRE-PRODUCCIÓN', 'Script and storyboard approval', 'Aprobación de guión y storyboard', 0, 'SHOOT_DAY', -14
FROM checklist_templates t WHERE t.name = 'Music Video';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PRE-PRODUCTION', 'PRE-PRODUCCIÓN', 'Location scouting and permits', 'Búsqueda de locaciones y permisos', 1, 'SHOOT_DAY', -7
FROM checklist_templates t WHERE t.name = 'Music Video';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PRODUCTION', 'PRODUCCIÓN', 'Video shooting day', 'Día de grabación del video', 2, 'SHOOT_DAY', 0
FROM checklist_templates t WHERE t.name = 'Music Video';

-- Insert template items for Press
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATION', 'PREPARACIÓN', 'Prepare press kit and materials', 'Preparar kit de prensa y materiales', 0, 'PRESS_LAUNCH', -10
FROM checklist_templates t WHERE t.name = 'Press';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'OUTREACH', 'DIFUSIÓN', 'Contact media outlets', 'Contactar medios de comunicación', 1, 'PRESS_LAUNCH', -5
FROM checklist_templates t WHERE t.name = 'Press';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'CAMPAIGN', 'CAMPAÑA', 'Launch press campaign', 'Lanzar campaña de prensa', 2, 'PRESS_LAUNCH', 0
FROM checklist_templates t WHERE t.name = 'Press';

-- Insert template items for Single Release
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATION', 'PREPARACIÓN', 'Master and finalize track', 'Masterizar y finalizar tema', 0, 'RELEASE_DAY', -21
FROM checklist_templates t WHERE t.name = 'Single Release';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'DISTRIBUTION', 'DISTRIBUCIÓN', 'Upload to streaming platforms', 'Subir a plataformas de streaming', 1, 'RELEASE_DAY', -7
FROM checklist_templates t WHERE t.name = 'Single Release';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PROMOTION', 'PROMOCIÓN', 'Social media announcement', 'Anuncio en redes sociales', 2, 'RELEASE_DAY', 0
FROM checklist_templates t WHERE t.name = 'Single Release';

-- Insert template items for Monthly Meeting
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATION', 'PREPARACIÓN', 'Prepare agenda and materials', 'Preparar agenda y materiales', 0, 'MEETING_DAY', -3
FROM checklist_templates t WHERE t.name = 'Monthly Meeting';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'FOLLOW-UP', 'SEGUIMIENTO', 'Send meeting notes and action items', 'Enviar notas de reunión y tareas', 1, 'MEETING_DAY', 1
FROM checklist_templates t WHERE t.name = 'Monthly Meeting';

-- Insert template items for Payments
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'REVIEW', 'REVISIÓN', 'Review and approve pending payments', 'Revisar y aprobar pagos pendientes', 0, 'PAYRUN_DAY', -2
FROM checklist_templates t WHERE t.name = 'Payments';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PROCESSING', 'PROCESAMIENTO', 'Process approved payments', 'Procesar pagos aprobados', 1, 'PAYRUN_DAY', 0
FROM checklist_templates t WHERE t.name = 'Payments';

INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'CONFIRMATION', 'CONFIRMACIÓN', 'Send payment confirmations', 'Enviar confirmaciones de pago', 2, 'PAYRUN_DAY', 1
FROM checklist_templates t WHERE t.name = 'Payments';

-- Update timestamp trigger
CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();